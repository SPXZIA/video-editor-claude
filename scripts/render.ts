/**
 * Renderiza um criativo para MP4.
 *   npm run render -- <criativo> [--preview] [--saida arquivo.mp4]
 * Saída padrão: workspace/criativos/<nome>/saida/<nome>.mp4  (--preview: metade da resolução, mais rápido)
 */
import { renameSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { FFMPEG, RAIZ, WORKSPACE, garantirPasta, rodar, sondar, lerCriativo, pastaCriativo, principal, validarNome } from "./lib/comum";
import { criativoSchema } from "../src/schema";

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      preview: { type: "boolean", default: false },
      saida: { type: "string" },
      "sem-normalizar": { type: "boolean", default: false },
    },
  });
  const nome = validarNome(positionals[0]);
  const props = lerCriativo(nome);
  const val = criativoSchema.safeParse(props);
  if (!val.success) throw new Error(`criativo.json inválido:\n${val.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);

  const saida =
    values.saida ?? path.join(garantirPasta(path.join(pastaCriativo(nome), "saida")), `${nome}${values.preview ? "-preview" : ""}.mp4`);

  console.log("⏳ Empacotando…");
  const serveUrl = await bundle({ entryPoint: path.join(RAIZ, "src", "index.ts"), publicDir: WORKSPACE });
  // Opcional: usar um Chrome já instalado (senão o Remotion baixa o dele na primeira vez)
  const browserExecutable = process.env.REMOTION_CHROME || null;
  const composition = await selectComposition({ serveUrl, id: nome, inputProps: props, browserExecutable });
  console.log(`⏳ Renderizando ${composition.width}x${composition.height}, ${(composition.durationInFrames / composition.fps).toFixed(1)}s…`);
  let ultimo = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps: props,
    codec: "h264",
    audioCodec: "aac",
    crf: values.preview ? 28 : 18,
    scale: values.preview ? 0.5 : 1,
    imageFormat: "jpeg",
    jpegQuality: values.preview ? 70 : 92,
    outputLocation: saida,
    browserExecutable,
    overwrite: true,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== ultimo) {
        ultimo = pct;
        process.stdout.write(`  ${pct}%\n`);
      }
    },
  });
  // Volume padrão de rede social (-14 LUFS, pico -1.5 dB), sem reencodar o vídeo
  if (!values["sem-normalizar"] && (await sondar(saida)).temAudio) {
    const tmp = saida.replace(/\.mp4$/, ".tmp.mp4");
    await rodar(FFMPEG, ["-y", "-hide_banner", "-i", saida, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp]);
    renameSync(tmp, saida);
    console.log("✓ Áudio normalizado (-14 LUFS)");
  }
  console.log(`✓ ${path.relative(process.cwd(), saida)}`);
});
