/**
 * Tira as pausas longas de um vídeo falado (avatar HeyGen, UGC) cortando vídeo e áudio juntos.
 *   npm run apertar-video -- <video> [--pausa 0.25] [--respiro 0.1] [--ruido -35]
 * Acha os silêncios pelo áudio (ffmpeg silencedetect), deixa um respiro de cada lado e corta o resto.
 * Saída: <video>-apertado.mp4 e, se existir <video>.palavras.json, <video>-apertado.mp4.palavras.json
 * com os tempos remapeados (a legenda continua sincronizada).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { FFMPEG, WORKSPACE, principal, rodar, sondar } from "./lib/comum";
import { remapear } from "./lib/pausas";
import type { Palavra } from "../src/schema";

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      pausa: { type: "string", default: "0.25" },
      respiro: { type: "string", default: "0.1" },
      ruido: { type: "string", default: "-35" },
    },
  });
  const arg = positionals[0];
  if (!arg) throw new Error("Informe o vídeo. Ex.: npm run apertar-video -- clipes/tabuas/UGC.mp4");
  const arq = existsSync(arg) ? path.resolve(arg) : path.join(WORKSPACE, arg);
  if (!existsSync(arq)) throw new Error(`Vídeo não encontrado: ${arg}`);
  const info = await sondar(arq);
  const pausa = Number(values.pausa);
  const respiro = Number(values.respiro);

  const { stderr } = await rodar(FFMPEG, ["-hide_banner", "-i", arq, "-vn", "-af", `silencedetect=noise=${values.ruido}dB:d=${pausa}`, "-f", "null", "-"], { silencioso: true });
  const inicios = [...stderr.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Math.max(0, Number(m[1])));
  const fins = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const cortes: [number, number][] = [];
  inicios.forEach((a, i) => {
    const b = fins[i] ?? info.duracao;
    const ini = a === 0 ? 0 : a + respiro;
    const fim = b >= info.duracao - 0.05 ? info.duracao : b - respiro;
    if (fim - ini > 0.06) cortes.push([+ini.toFixed(3), +fim.toFixed(3)]);
  });
  if (!cortes.length) {
    console.log("Nenhuma pausa longa encontrada.");
    return;
  }
  const removido = cortes.reduce((s, [a, b]) => s + b - a, 0);
  const expr = cortes.map(([a, b]) => `between(t\\,${a}\\,${b})`).join("+");
  const saida = arq.replace(/\.[^.]+$/, "") + "-apertado.mp4";
  console.log(`⏳ Cortando ${cortes.length} pausa(s), -${removido.toFixed(2)}s…`);
  await rodar(FFMPEG, [
    "-y", "-hide_banner", "-i", arq,
    "-vf", `select='not(${expr})',setpts=N/FRAME_RATE/TB`,
    "-af", `aselect='not(${expr})',asetpts=N/SR/TB`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", saida,
  ]);
  const pal = `${arq}.palavras.json`;
  if (existsSync(pal)) {
    const palavras: Palavra[] = JSON.parse(readFileSync(pal, "utf8"));
    const novas = palavras.map((p) => ({ ...p, inicio: remapear(p.inicio, cortes), fim: remapear(p.fim, cortes) }));
    writeFileSync(`${saida}.palavras.json`, JSON.stringify(novas, null, 1));
    console.log("✓ Legenda remapeada");
  }
  const nova = await sondar(saida);
  console.log(`✓ ${path.relative(process.cwd(), saida)}: ${info.duracao.toFixed(1)}s → ${nova.duracao.toFixed(1)}s`);
});
