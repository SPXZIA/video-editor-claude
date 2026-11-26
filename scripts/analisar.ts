/**
 * Inventário dos clipes de uma pasta, para o Claude "ver" o material sem assistir tudo.
 *   npm run analisar -- <pasta em workspace/clipes> [--transcrever] [--quadros]
 * --quadros: também gera grades com 1 quadro a cada 0,5 s (6x4 = 12 s por imagem) para achar
 *            textos, títulos e @ de criador que aparecem só por um instante.
 * Gera em workspace/clipes/<pasta>/_analise/:
 *   - inventario.md  → duração, resolução, fps, áudio, cortes de cena (e fala, se --transcrever)
 *   - <clipe>.jpg    → folha de contato com 8 quadros (tempos listados no inventário)
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { CLIPES, FFMPEG, VIDEO_EXT, IMAGEM_EXT, fmt, garantirPasta, principal, relWorkspace, rodar, sondar } from "./lib/comum";
import { transcreverLocal } from "./lib/whisper";

const QUADROS = 8;

const cortesDeCena = async (arq: string) => {
  const { stderr } = await rodar(FFMPEG, ["-hide_banner", "-i", arq, "-an", "-vf", "scale=320:-2,select='gt(scene,0.32)',showinfo", "-f", "null", "-"], { silencioso: true });
  return [...stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
};

const volume = async (arq: string) => {
  const { stderr } = await rodar(FFMPEG, ["-hide_banner", "-i", arq, "-vn", "-af", "volumedetect", "-f", "null", "-"], { silencioso: true });
  const media = stderr.match(/mean_volume:\s*(-?[\d.]+)/)?.[1];
  const pico = stderr.match(/max_volume:\s*(-?[\d.]+)/)?.[1];
  return { media: media ? Number(media) : undefined, pico: pico ? Number(pico) : undefined };
};

const folhaDeContato = async (arq: string, dur: number, saida: string) => {
  const rate = QUADROS / Math.max(dur, 0.1);
  await rodar(FFMPEG, ["-y", "-hide_banner", "-i", arq, "-vf", `fps=${rate},scale=270:-2,tile=4x2:padding=4:color=black`, "-frames:v", "1", "-q:v", "4", saida], { silencioso: true });
};

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { transcrever: { type: "boolean", default: false }, quadros: { type: "boolean", default: false } },
  });
  const nome = positionals[0];
  if (!nome) throw new Error("Informe a pasta. Ex.: npm run analisar -- tabuas");
  const pasta = path.join(CLIPES, nome);
  if (!existsSync(pasta)) throw new Error(`Pasta não encontrada: ${pasta}`);
  const saida = garantirPasta(path.join(pasta, "_analise"));
  const arquivos = readdirSync(pasta).filter((f) => VIDEO_EXT.test(f) || IMAGEM_EXT.test(f)).sort();
  if (arquivos.length === 0) throw new Error(`Nenhum vídeo/imagem em ${pasta}`);

  const linhas = [`# Inventário: clipes/${nome}`, "", `${arquivos.length} arquivo(s). Caminhos relativos a workspace/.`, ""];
  let total = 0;
  for (const f of arquivos) {
    const abs = path.join(pasta, f);
    process.stdout.write(`… ${f}\n`);
    if (IMAGEM_EXT.test(f)) {
      linhas.push(`## ${f}`, `- caminho: \`${relWorkspace(abs)}\``, "- imagem estática", "");
      continue;
    }
    const info = await sondar(abs);
    total += info.duracao;
    const [cortes, vol] = await Promise.all([cortesDeCena(abs), info.temAudio ? volume(abs) : Promise.resolve(undefined)]);
    const jpg = path.join(saida, `${path.parse(f).name}.jpg`);
    await folhaDeContato(abs, info.duracao, jpg);
    const tempos = Array.from({ length: QUADROS }, (_, i) => ((i * info.duracao) / QUADROS).toFixed(1));
    const orient = info.largura && info.altura ? (info.altura > info.largura ? "vertical" : info.altura === info.largura ? "quadrado" : "horizontal") : "?";

    linhas.push(
      `## ${f}`,
      `- caminho: \`${relWorkspace(abs)}\``,
      `- duração: ${info.duracao.toFixed(2)}s · ${info.largura}x${info.altura} (${orient}) · ${info.fps} fps · ${info.codec}`,
      `- áudio: ${info.temAudio ? `sim (média ${vol?.media} dB, pico ${vol?.pico} dB)` : "não"}`,
      `- cortes de cena em: ${cortes.length ? cortes.map((t) => t.toFixed(2) + "s").join(", ") : "nenhum (plano contínuo)"}`,
      `- folha de contato: \`${relWorkspace(jpg)}\` (quadros em ${tempos.join("s, ")}s, da esquerda p/ direita, de cima p/ baixo)`,
    );
    if (values.quadros) {
      const base = path.join(saida, `${path.parse(f).name}-quadros-%02d.jpg`);
      await rodar(FFMPEG, ["-y", "-hide_banner", "-i", abs, "-vf", "fps=2,scale=200:-2,tile=6x4:padding=3:color=white", "-q:v", "5", base], { silencioso: true });
      const n = Math.ceil(info.duracao / 12);
      linhas.push(
        `- quadros a cada 0,5 s: \`${relWorkspace(path.join(saida, `${path.parse(f).name}-quadros-01.jpg`))}\` … (${n} imagem/ns; imagem N, célula k (0-23, esq→dir, cima→baixo) = ${"`"}(N-1)*12 + k*0,5${"`"} s)`,
      );
    }
    if (values.transcrever && info.temAudio) {
      const palavras = await transcreverLocal(abs);
      writeFileSync(`${abs}.palavras.json`, JSON.stringify(palavras, null, 1));
      linhas.push(
        palavras.length
          ? `- fala: [${fmt(palavras[0].inicio)}-${fmt(palavras[palavras.length - 1].fim)}] ${palavras.map((p) => p.texto).join(" ")}`
          : "- fala: nenhuma detectada",
      );
    }
    linhas.push("");
  }
  linhas.splice(3, 0, `Material total: ${total.toFixed(1)}s de vídeo.`, "");
  writeFileSync(path.join(saida, "inventario.md"), linhas.join("\n"));
  console.log(`\n✓ ${path.relative(process.cwd(), path.join(saida, "inventario.md"))}`);
});
