/**
 * Confere o vídeo renderizado antes de mostrar: tira quadros em cada transição,
 * no começo e no fim, e mede o volume. O Claude olha a imagem gerada.
 *   npm run conferir -- <criativo> [--arquivo saida.mp4]
 * Gera saida/conferencia.jpg (grade de quadros) e saida/conferencia.md.
 */
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { FFMPEG, garantirPasta, lerCriativo, pastaCriativo, principal, rodar, sondar, validarNome } from "./lib/comum";
import { criativoSchema, duracaoTotal, iniciosDasCenas } from "../src/schema";

principal(async () => {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { arquivo: { type: "string" } } });
  const nome = validarNome(positionals[0]);
  const c = criativoSchema.parse(lerCriativo(nome));
  const dirSaida = path.join(pastaCriativo(nome), "saida");
  const mp4 = values.arquivo ?? [path.join(dirSaida, `${nome}.mp4`), path.join(dirSaida, `${nome}-preview.mp4`)].find(existsSync);
  if (!mp4 || !existsSync(mp4)) throw new Error("Renderize primeiro: npm run render -- " + nome);

  const info = await sondar(mp4);
  const inicios = iniciosDasCenas(c).slice(1);
  const pontos = [0.15, ...inicios.flatMap((t) => [t - 0.2, t + 0.25]), info.duracao / 2, info.duracao - 0.2]
    .filter((t) => t >= 0 && t < info.duracao)
    .sort((a, b) => a - b);

  const tmp = garantirPasta(path.join(dirSaida, ".quadros"));
  for (const [i, t] of pontos.entries()) {
    await rodar(FFMPEG, ["-y", "-hide_banner", "-ss", t.toFixed(3), "-i", mp4, "-frames:v", "1", "-vf", "scale=240:-2", "-q:v", "4", path.join(tmp, `q${String(i).padStart(3, "0")}.jpg`)]);
  }
  const cols = 6;
  const linhas = Math.ceil(pontos.length / cols);
  const grade = path.join(dirSaida, "conferencia.jpg");
  await rodar(FFMPEG, ["-y", "-hide_banner", "-framerate", "1", "-i", path.join(tmp, "q%03d.jpg"), "-vf", `tile=${cols}x${linhas}:padding=4:color=white`, "-frames:v", "1", "-q:v", "3", grade]);
  rmSync(tmp, { recursive: true, force: true });

  const { stderr } = await rodar(FFMPEG, ["-hide_banner", "-i", mp4, "-af", "ebur128=peak=true", "-f", "null", "-"], { silencioso: true });
  const lufs = stderr.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];
  const pico = stderr.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];

  const md = [
    `# Conferência: ${nome}`,
    "",
    `- arquivo: ${path.basename(mp4)} · ${info.largura}x${info.altura} · ${info.duracao.toFixed(2)}s (esperado ${(duracaoTotal(c) / c.fps).toFixed(2)}s)`,
    `- volume integrado: ${lufs ?? "?"} LUFS (bom para Reels/TikTok: entre -16 e -12) · pico: ${pico ?? "?"} dBFS (ideal ≤ -1)`,
    `- grade: \`conferencia.jpg\`, ${cols} por linha, quadros em: ${pontos.map((t) => t.toFixed(2) + "s").join(", ")}`,
    `- transições em: ${inicios.map((t) => t.toFixed(2) + "s").join(", ") || "nenhuma"}`,
    "",
    "Confira: legenda legível e não cortada, texto não cobre o produto, nenhum quadro preto/congelado, transições limpas.",
  ];
  writeFileSync(path.join(dirSaida, "conferencia.md"), md.join("\n"));
  console.log(md.join("\n"));
});
