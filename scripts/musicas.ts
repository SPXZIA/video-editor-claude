/**
 * Indexa a biblioteca de músicas (workspace/musicas/<clima>/*.mp3).
 *   npm run musicas
 * Gera workspace/musicas/indice.md e indice.json com clima, duração e caminho de cada faixa.
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AUDIO_EXT, MUSICAS, garantirPasta, principal, relWorkspace, sondar } from "./lib/comum";

const listar = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const abs = path.join(dir, f);
    return statSync(abs).isDirectory() ? listar(abs) : AUDIO_EXT.test(f) ? [abs] : [];
  });

principal(async () => {
  garantirPasta(MUSICAS);
  const faixas = [];
  for (const abs of listar(MUSICAS).sort()) {
    const rel = path.relative(MUSICAS, abs).split(path.sep);
    const clima = rel.length > 1 ? rel[0] : "sem-clima";
    const info = await sondar(abs);
    faixas.push({ arquivo: relWorkspace(abs), clima, titulo: path.parse(abs).name, duracao: +info.duracao.toFixed(1) });
  }
  writeFileSync(path.join(MUSICAS, "indice.json"), JSON.stringify(faixas, null, 2));
  const porClima: Record<string, typeof faixas> = {};
  for (const f of faixas) (porClima[f.clima] ??= []).push(f);
  const md = ["# Biblioteca de músicas", "", `${faixas.length} faixa(s).`, ""];
  for (const [clima, lista] of Object.entries(porClima)) {
    md.push(`## ${clima}`, "", ...lista.map((f) => `- \`${f.arquivo}\` · ${f.duracao}s`), "");
  }
  writeFileSync(path.join(MUSICAS, "indice.md"), md.join("\n"));
  console.log(md.join("\n"));
});
