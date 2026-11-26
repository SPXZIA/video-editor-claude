/**
 * Legenda automática PT-BR com tempo por palavra.
 *   npm run transcrever -- <arquivo de áudio/vídeo> [--criativo <nome>] [--motor whisper|scribe] [--deslocamento 0]
 * Sem --criativo: só salva <arquivo>.palavras.json e mostra o texto.
 * Com --criativo: grava as palavras em legenda.palavras do criativo.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { WORKSPACE, lerCriativo, principal, salvarCriativo, validarNome } from "./lib/comum";
import { transcreverLocal } from "./lib/whisper";
import { transcreverScribe } from "./lib/elevenlabs";

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      criativo: { type: "string" },
      motor: { type: "string", default: "whisper" },
      deslocamento: { type: "string", default: "0" },
      modelo: { type: "string" },
    },
  });
  if (!positionals[0]) throw new Error("Informe o arquivo. Ex.: npm run transcrever -- workspace/clipes/tabuas/01.mp4");
  let arq = path.resolve(positionals[0]);
  if (!existsSync(arq)) arq = path.join(WORKSPACE, positionals[0]);
  if (!existsSync(arq)) throw new Error(`Arquivo não encontrado: ${positionals[0]}`);

  console.log(`⏳ Transcrevendo ${path.basename(arq)} com ${values.motor}…`);
  const palavras =
    values.motor === "scribe"
      ? await transcreverScribe(new Blob([readFileSync(arq)]), path.basename(arq))
      : await transcreverLocal(arq, values.modelo as never);

  const desl = Number(values.deslocamento);
  const ajustadas = palavras.map((p) => ({ ...p, inicio: +(p.inicio + desl).toFixed(3), fim: +(p.fim + desl).toFixed(3) }));
  writeFileSync(`${arq}.palavras.json`, JSON.stringify(ajustadas, null, 1));
  console.log(`✓ ${ajustadas.length} palavras → ${path.basename(arq)}.palavras.json`);
  console.log(ajustadas.map((p) => p.texto).join(" "));

  if (values.criativo) {
    const nome = validarNome(values.criativo);
    const c = lerCriativo(nome);
    c.legenda = { ativa: true, template: "hormozi", posicao: "baixo", enfase: [], ...(c.legenda ?? {}), palavras: ajustadas };
    salvarCriativo(nome, c);
    console.log(`✓ Legenda gravada em ${nome}/criativo.json`);
  }
});
