/**
 * Lipsync grátis no seu PC (placa NVIDIA). Faz a boca de um vídeo-base falar a narração.
 *   npm run lipsync-local -- <criativo> --video clipes/<pasta>/base.mp4 [--audio <mp3>] [--saida clipes/<pasta>/x.mp4]
 *        [--modelo latentsync|musetalk] [--passos 20] [--guia 1.5] [--bbox 0]
 *        [--sem-suavizar] [--deflicker 0.5 | --sem-deflicker] [--restaurar 0.7 | --sem-restaurar]
 * Padrão: LatentSync 1.5 (ByteDance, melhor qualidade) em ferramentas/LatentSync. MuseTalk (ferramentas/MuseTalk) só se instalada.
 * Anti-flicker da LatentSync (padrão, veja extras/lipsync/instalar-gfpgan.md):
 *   1) patch extras/lipsync/latentsync-suavizar.diff (git apply automático) com LATENTSYNC_SUAVIZAR=5 e LATENTSYNC_BORDA=1
 *   2) deflicker só na boca (extras/lipsync/deflicker_boca.py, força 0.5)
 *   3) GFPGAN 1.4 no rosto (extras/lipsync/restaurar_rosto.py, mistura 0.7), se ferramentas/gfpgan existir
 * - O áudio padrão é workspace/criativos/<criativo>/narracao.mp3 (gere antes com npm run narrar).
 * - O vídeo-base pode ser mais curto que a fala: a MuseTalk repete ida-e-volta. Melhor: rosto de frente, boca fechada/neutra.
 * - LatentSync: --passos (20; 30–50 = mais nítido e mais lento), --guia (1.5; 2.0 = boca mais marcada).
 * - MuseTalk: --bbox desloca a área da boca (positivo abre mais, negativo fecha).
 * Depois:
 *   UGC recortado: npm run remover-fundo -- <saida> --metodo ia  →  npm run formato -- <criativo> ugc --avatar <saida-sem-fundo.webm> --transparente
 *   Avatar tela cheia: npm run lipsync -- <criativo> <saida>
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { FFMPEG, RAIZ, WORKSPACE, pastaCriativo, principal, relWorkspace, rodar, sondar, validarNome } from "./lib/comum";

const FERRAMENTAS = path.join(RAIZ, "ferramentas");
const EXTRAS = path.join(RAIZ, "extras", "lipsync");
const GFPGAN = path.join(FERRAMENTAS, "gfpgan");
const pythonDe = (dir: string) => path.join(dir, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");

/** Aplica o patch anti-flicker na LatentSync, se ainda não estiver aplicado. */
const garantirPatchLatentSync = async (dir: string) => {
  const patch = path.join(EXTRAS, "latentsync-suavizar.diff");
  if (!existsSync(patch)) return false;
  try {
    await rodar("git", ["-C", dir, "apply", "--reverse", "--check", patch], { silencioso: true });
    return true; // já aplicado
  } catch {
    try {
      await rodar("git", ["-C", dir, "apply", patch], { silencioso: true });
      console.log("✓ Patch anti-flicker aplicado na LatentSync");
      return true;
    } catch (e) {
      console.log(`⚠ Não consegui aplicar o patch anti-flicker na LatentSync (seguindo sem ele): ${(e as Error).message.split("\n")[0]}`);
      return false;
    }
  }
};

const resolver = (arg: string) => (existsSync(arg) ? path.resolve(arg) : path.join(WORKSPACE, arg));

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      video: { type: "string" },
      audio: { type: "string" },
      saida: { type: "string" },
      bbox: { type: "string", default: "0" },
      modelo: { type: "string", default: "latentsync" },
      passos: { type: "string", default: "20" },
      guia: { type: "string", default: "1.5" },
      "sem-suavizar": { type: "boolean", default: false },
      deflicker: { type: "string", default: "0.5" },
      "sem-deflicker": { type: "boolean", default: false },
      restaurar: { type: "string", default: "0.7" },
      "sem-restaurar": { type: "boolean", default: false },
    },
  });
  const nome = validarNome(positionals[0]);
  if (!values.video) throw new Error("Informe o vídeo-base. Ex.: npm run lipsync-local -- meu-criativo --video clipes/avatar/base.mp4");
  const video = resolver(values.video);
  if (!existsSync(video)) throw new Error(`Vídeo não encontrado: ${values.video}`);
  const audio = values.audio ? resolver(values.audio) : path.join(pastaCriativo(nome), "narracao.mp3");
  if (!existsSync(audio)) throw new Error(`Áudio não encontrado: ${audio}. Rode antes: npm run narrar -- ${nome}`);

  const modelo = values.modelo === "musetalk" ? "musetalk" : "latentsync";
  const DIR = path.join(FERRAMENTAS, modelo === "musetalk" ? "MuseTalk" : "LatentSync");
  const python = path.join(DIR, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const pesos = modelo === "musetalk" ? path.join(DIR, "models", "musetalkV15", "unet.pth") : path.join(DIR, "checkpoints", "latentsync_unet.pt");
  if (!existsSync(python) || !existsSync(pesos))
    throw new Error(`${modelo} não instalada em ${path.relative(RAIZ, DIR)} (precisa de .venv e dos pesos). Veja o CLAUDE.md, seção Lipsync.`);

  const saida = values.saida
    ? resolver(values.saida)
    : path.join(path.dirname(video), `${path.basename(video).replace(/\.[^.]+$/, "")}-lipsync-${nome}.mp4`);
  const dur = (await sondar(audio)).duracao;

  // As ferramentas montam comandos do ffmpeg sem aspas: tudo dentro dela com caminho relativo e sem espaço
  const id = `t${Date.now()}`;
  const entrada = path.join(DIR, "entrada");
  mkdirSync(entrada, { recursive: true });
  const vIn = path.join(entrada, `${id}.mp4`);
  const aIn = path.join(entrada, `${id}.wav`);
  console.log(`⏳ Preparando vídeo-base e áudio (${dur.toFixed(1)}s)…`);
  await rodar(FFMPEG, ["-y", "-hide_banner", "-i", video, "-an", "-t", dur.toFixed(3), "-r", "25", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", vIn]);
  await rodar(FFMPEG, ["-y", "-hide_banner", "-i", audio, "-vn", "-ar", "16000", "-ac", "1", aIn]);
  const ffmpegDir = path.isAbsolute(FFMPEG) ? path.relative(DIR, path.dirname(FFMPEG)) || "." : ".";
  // ffmpeg do editor no PATH da ferramenta (as duas chamam "ffmpeg" pelo nome)
  const sep = process.platform === "win32" ? ";" : ":";
  const PATH_COM_FFMPEG = path.isAbsolute(FFMPEG) ? `${path.dirname(FFMPEG)}${sep}${process.env.PATH ?? ""}` : process.env.PATH;
  const yaml = path.join(DIR, "configs", "inference", `${id}.yaml`);
  const resultado = path.join(DIR, "results", id);

  console.log(`⏳ Gerando o lipsync (${modelo}) na placa de vídeo…`);
  const t0 = Date.now();
  try {
    let mp4: string | undefined;
    if (modelo === "musetalk") {
      mkdirSync(path.dirname(yaml), { recursive: true });
      writeFileSync(yaml, `task_0:\n  video_path: "entrada/${id}.mp4"\n  audio_path: "entrada/${id}.wav"\n  bbox_shift: ${Number(values.bbox)}\n`);
      await rodar(python, [
        "-m", "scripts.inference",
        "--inference_config", `configs/inference/${id}.yaml`,
        "--result_dir", `results/${id}`,
        "--unet_model_path", "models/musetalkV15/unet.pth",
        "--unet_config", "models/musetalkV15/musetalk.json",
        "--version", "v15",
        "--ffmpeg_path", ffmpegDir,
        "--use_float16",
      ], { cwd: DIR, aoVivo: true });
      const pastaRes = path.join(resultado, "v15");
      const f = existsSync(pastaRes) ? readdirSync(pastaRes).find((x) => x.endsWith(".mp4")) : undefined;
      mp4 = f && path.join(pastaRes, f);
    } else {
      mkdirSync(resultado, { recursive: true });
      const suavizar = !values["sem-suavizar"] && (await garantirPatchLatentSync(DIR));
      await rodar(python, [
        "-m", "scripts.inference",
        "--unet_config_path", "configs/unet/stage2.yaml",
        "--inference_ckpt_path", "checkpoints/latentsync_unet.pt",
        "--inference_steps", String(Number(values.passos)),
        "--guidance_scale", String(Number(values.guia)),
        "--video_path", `entrada/${id}.mp4`,
        "--audio_path", `entrada/${id}.wav`,
        "--video_out_path", `results/${id}/saida.mp4`,
      ], {
        cwd: DIR,
        aoVivo: true,
        env: { PATH: PATH_COM_FFMPEG, LATENTSYNC_SUAVIZAR: suavizar ? "5" : "0", LATENTSYNC_BORDA: suavizar ? "1" : "0" },
      });
      mp4 = path.join(resultado, "saida.mp4");

      // Deflicker só na região da boca (usa o python e os modelos de rosto da LatentSync)
      const forca = Number(values.deflicker);
      if (!values["sem-deflicker"] && forca > 0 && existsSync(mp4)) {
        console.log(`⏳ Deflicker na boca (força ${forca})…`);
        const t = Date.now();
        const out = path.join(resultado, "deflicker.mp4");
        await rodar(python, [path.join(EXTRAS, "deflicker_boca.py"), mp4, out, "--forca", String(forca)], { cwd: DIR });
        mp4 = out;
        console.log(`✓ Deflicker (${((Date.now() - t) / 1000).toFixed(0)}s)`);
      }

      // Restauração de rosto com GFPGAN 1.4 (ambiente separado em ferramentas/gfpgan)
      const mistura = Number(values.restaurar);
      const gfPython = pythonDe(GFPGAN);
      if (!values["sem-restaurar"] && mistura > 0 && existsSync(mp4)) {
        if (existsSync(gfPython) && existsSync(path.join(GFPGAN, "GFPGANv1.4.pth"))) {
          console.log(`⏳ Restaurando o rosto (GFPGAN 1.4, mistura ${mistura})…`);
          const t = Date.now();
          const out = path.join(resultado, "restaurado.mp4");
          await rodar(gfPython, [path.join(EXTRAS, "restaurar_rosto.py"), mp4, out, "--mistura", String(mistura), "--pasta", GFPGAN], { cwd: GFPGAN });
          mp4 = out;
          console.log(`✓ Rosto restaurado (${((Date.now() - t) / 1000).toFixed(0)}s)`);
        } else {
          console.log("ℹ GFPGAN não instalado (ferramentas/gfpgan): pulando a restauração. Veja extras/lipsync/instalar-gfpgan.md");
        }
      }
    }
    if (!mp4 || !existsSync(mp4)) throw new Error(`${modelo} terminou mas não gerou o MP4 em ${resultado}`);
    mkdirSync(path.dirname(saida), { recursive: true });
    // Sai MUDO: a voz vem só da narracao.mp3 do criativo (nunca duas vozes)
    await rodar(FFMPEG, ["-y", "-hide_banner", "-i", mp4, "-an", "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", saida]);
  } finally {
    rmSync(vIn, { force: true });
    rmSync(aIn, { force: true });
    rmSync(yaml, { force: true });
    rmSync(resultado, { recursive: true, force: true });
  }
  const rel = relWorkspace(saida);
  console.log(`✓ ${rel} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  console.log("Próximo passo:");
  console.log(`  UGC recortado: npm run remover-fundo -- ${rel} --metodo ia`);
  console.log(`                 npm run formato -- ${nome} ugc --avatar ${rel.replace(/\.mp4$/, "-sem-fundo.webm")} --transparente`);
  console.log(`  Tela cheia:    npm run lipsync -- ${nome} ${rel}`);
});
