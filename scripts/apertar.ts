/**
 * Aperta as pausas de uma narração que já existe (sem gerar de novo, sem gastar crédito).
 *   npm run apertar -- <criativo> [--pausa-frase 0.22] [--pausa-virgula 0.14] [--pausa-palavra 0.08] [--ajustar]
 * Usa narracao-bruta.mp3 se existir (o original da IA); senão, a narracao.mp3 atual.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { WORKSPACE, lerCriativo, pastaCriativo, principal, relWorkspace, salvarCriativo, validarNome } from "./lib/comum";
import { PAUSAS_PADRAO, apertarAudio } from "./lib/pausas";
import { ajustarCenas } from "./lib/ajustar";
import type { Palavra } from "../src/schema";

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      "pausa-frase": { type: "string" },
      "pausa-virgula": { type: "string" },
      "pausa-palavra": { type: "string" },
      ajustar: { type: "boolean", default: false },
    },
  });
  const nome = validarNome(positionals[0]);
  const c = lerCriativo(nome);
  if (!c.narracao?.arquivo) throw new Error("Esse criativo não tem narração.");
  const dir = pastaCriativo(nome);
  const bruta = path.join(dir, "narracao-bruta.mp3");
  const brutaPalavras = path.join(dir, "narracao-bruta.palavras.json");
  const ini: number = c.narracao.inicio ?? 0;
  let palavras: Palavra[];
  if (existsSync(bruta) && existsSync(brutaPalavras)) {
    palavras = JSON.parse(readFileSync(brutaPalavras, "utf8"));
  } else {
    // primeira vez: guarda o original como "bruta"
    copyFileSync(path.join(WORKSPACE, c.narracao.arquivo), bruta);
    palavras = (c.legenda?.palavras ?? []).map((p: Palavra) => ({ ...p, inicio: +(p.inicio - ini).toFixed(3), fim: +(p.fim - ini).toFixed(3) }));
    writeFileSync(brutaPalavras, JSON.stringify(palavras, null, 1));
  }
  if (!palavras.length) throw new Error("Sem palavras com tempo na legenda para saber onde estão as pausas.");
  const arq = path.join(dir, "narracao.mp3");
  const r = await apertarAudio(bruta, arq, palavras, {
    ...PAUSAS_PADRAO,
    ...(values["pausa-frase"] ? { frase: Number(values["pausa-frase"]) } : {}),
    ...(values["pausa-virgula"] ? { virgula: Number(values["pausa-virgula"]) } : {}),
    ...(values["pausa-palavra"] ? { entrePalavras: Number(values["pausa-palavra"]) } : {}),
  });
  console.log(`✓ -${r.removido.toFixed(2)}s de silêncio em ${r.cortes.length} ponto(s)`);
  c.narracao.arquivo = relWorkspace(arq);
  c.legenda.palavras = r.palavras.map((p) => ({ ...p, inicio: +(p.inicio + ini).toFixed(3), fim: +(p.fim + ini).toFixed(3) }));
  if (values.ajustar) {
    const fim = r.palavras[r.palavras.length - 1].fim;
    const a = await ajustarCenas(c, ini + fim + 0.6);
    console.log(`✓ Cenas ajustadas: ${a.antes.toFixed(1)}s → ${a.depois.toFixed(1)}s (revise os cortes por frase)`);
  }
  salvarCriativo(nome, c);
});
