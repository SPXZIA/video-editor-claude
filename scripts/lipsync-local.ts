/**
 * Lipsync grátis no seu PC com a MuseTalk 1.5 (placa NVIDIA). Faz a boca de um vídeo-base falar a narração.
 *   npm run lipsync-local -- <criativo> --video clipes/<pasta>/base.mp4 [--audio <mp3>] [--saida clipes/<pasta>/x.mp4] [--bbox 0]
 * - O áudio padrão é workspace/criativos/<criativo>/narracao.mp3 (gere antes com npm run narrar).
 * - O vídeo-base pode ser mais curto que a fala: a MuseTalk repete ida-e-volta. Melhor: rosto de frente, boca fechada/neutra.
 * - --bbox: desloca a área da boca (positivo abre mais a boca, negativo fecha). Deixe 0 na primeira vez.
 * Precisa da MuseTalk instalada em ferramentas/MuseTalk (com .venv). Depois:
 *   UGC recortado: npm run remover-fundo -- <saida> --metodo ia  →  npm run formato -- <criativo> ugc --avatar <saida-sem-fundo.webm> --transparente
 *   Avatar tela cheia: npm run lipsync -- <criativo> <saida>
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { FFMPEG, RAIZ, WORKSPACE, pastaCriativo, principal, relWorkspace, rodar, sondar, validarNome } from "./lib/comum";

const MUSETALK = path.join(RAIZ, "ferramentas", "MuseTalk");

const resolver = (arg: string) => (existsSync(arg) ? path.resolve(arg) : path.join(WORKSPACE, arg));

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      video: { type: "string" },
      audio: { type: "string" },
      saida: { type: "string" },
      bbox: { type: "string", default: "0" },
    },
  });
  const nome = validarNome(positionals[0]);
  if (!values.video) throw new Error("Informe o vídeo-base. Ex.: npm run lipsync-local -- meu-criativo --video clipes/avatar/base.mp4");
  const video = resolver(values.video);
  if (!existsSync(video)) throw new Error(`Vídeo não encontrado: ${values.video}`);
  const audio = values.audio ? resolver(values.audio) : path.join(pastaCriativo(nome), "narracao.mp3");
  if (!existsSync(audio)) throw new Error(`Áudio não encontrado: ${audio}. Rode antes: npm run narrar -- ${nome}`);

  const python = path.join(MUSETALK, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  if (!existsSync(python) || !existsSync(path.join(MUSETALK, "models", "musetalkV15", "unet.pth")))
    throw new Error("MuseTalk não instalada em ferramentas/MuseTalk (com .venv e models/). Veja o CLAUDE.md, seção Lipsync.");

  const saida = values.saida
    ? resolver(values.saida)
    : path.join(path.dirname(video), `${path.basename(video).replace(/\.[^.]+$/, "")}-lipsync-${nome}.mp4`);
  const dur = (await sondar(audio)).duracao;

  // A MuseTalk monta comandos do ffmpeg sem aspas: tudo dentro dela com caminho relativo e sem espaço
  const id = `t${Date.now()}`;
  const entrada = path.join(MUSETALK, "entrada");
  mkdirSync(entrada, { recursive: true });
  const vIn = path.join(entrada, `${id}.mp4`);
  const aIn = path.join(entrada, `${id}.wav`);
  console.log(`⏳ Preparando vídeo-base e áudio (${dur.toFixed(1)}s)…`);
  await rodar(FFMPEG, ["-y", "-hide_banner", "-i", video, "-an", "-t", dur.toFixed(3), "-r", "25", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", vIn]);
  await rodar(FFMPEG, ["-y", "-hide_banner", "-i", audio, "-vn", "-ar", "16000", "-ac", "1", aIn]);
  const yaml = path.join(MUSETALK, "configs", "inference", `${id}.yaml`);
  writeFileSync(yaml, `task_0:\n  video_path: "entrada/${id}.mp4"\n  audio_path: "entrada/${id}.wav"\n  bbox_shift: ${Number(values.bbox)}\n`);
  const ffmpegDir = path.isAbsolute(FFMPEG) ? path.relative(MUSETALK, path.dirname(FFMPEG)) || "." : ".";

  console.log("⏳ Gerando o lipsync na placa de vídeo (uns 3–5 s de processamento por segundo de vídeo)…");
  const t0 = Date.now();
  try {
    await rodar(python, [
      "-m", "scripts.inference",
      "--inference_config", `configs/inference/${id}.yaml`,
      "--result_dir", `results/${id}`,
      "--unet_model_path", "models/musetalkV15/unet.pth",
      "--unet_config", "models/musetalkV15/musetalk.json",
      "--version", "v15",
      "--ffmpeg_path", ffmpegDir,
      "--use_float16",
    ], { cwd: MUSETALK, aoVivo: true });
    const pastaRes = path.join(MUSETALK, "results", id, "v15");
    const mp4 = existsSync(pastaRes) ? readdirSync(pastaRes).find((f) => f.endsWith(".mp4")) : undefined;
    if (!mp4) throw new Error(`A MuseTalk terminou mas não gerou MP4 em ${pastaRes}`);
    mkdirSync(path.dirname(saida), { recursive: true });
    // Sai MUDO: a voz vem só da narracao.mp3 do criativo (nunca duas vozes)
    await rodar(FFMPEG, ["-y", "-hide_banner", "-i", path.join(pastaRes, mp4), "-an", "-c:v", "copy", saida]);
    rmSync(path.join(MUSETALK, "results", id), { recursive: true, force: true });
  } finally {
    rmSync(vIn, { force: true });
    rmSync(aIn, { force: true });
    rmSync(yaml, { force: true });
  }
  const rel = relWorkspace(saida);
  console.log(`✓ ${rel} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  console.log("Próximo passo:");
  console.log(`  UGC recortado: npm run remover-fundo -- ${rel} --metodo ia`);
  console.log(`                 npm run formato -- ${nome} ugc --avatar ${rel.replace(/\.mp4$/, "-sem-fundo.webm")} --transparente`);
  console.log(`  Tela cheia:    npm run lipsync -- ${nome} ${rel}`);
});
