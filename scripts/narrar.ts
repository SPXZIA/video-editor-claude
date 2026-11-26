/**
 * Narração por IA (ElevenLabs) + legenda sincronizada automaticamente.
 *   npm run narrar -- <criativo> [--texto "..."] [--voz <voice_id>] [--velocidade 1.08] [--ajustar]
 * Sem --texto, usa copy.hook + copy.body + copy.cta do criativo.
 * --ajustar estica/encolhe as cenas para acompanhar a duração da narração.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { lerCriativo, pastaCriativo, principal, relWorkspace, salvarCriativo, validarNome } from "./lib/comum";
import { narrar } from "./lib/elevenlabs";
import { ajustarCenas } from "./lib/ajustar";

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      texto: { type: "string" },
      voz: { type: "string" },
      modelo: { type: "string" },
      velocidade: { type: "string" },
      ajustar: { type: "boolean", default: false },
    },
  });
  const nome = validarNome(positionals[0]);
  const c = lerCriativo(nome);
  const texto = values.texto ?? [c.copy?.hook, c.copy?.body, c.copy?.cta].filter(Boolean).join(" ");
  if (!texto.trim()) throw new Error("Sem texto: preencha copy.hook/body/cta no criativo.json ou passe --texto.");
  const voz = values.voz ?? process.env.ELEVENLABS_VOICE_ID;
  if (!voz) throw new Error("Falta a voz: passe --voz <id> ou defina ELEVENLABS_VOICE_ID no .env (veja `npm run vozes`).");

  console.log(`⏳ Gerando narração (${texto.length} caracteres)…`);
  const { audio, palavras } = await narrar(texto, {
    voz,
    modelo: values.modelo,
    velocidade: values.velocidade ? Number(values.velocidade) : undefined,
  });
  const arq = path.join(pastaCriativo(nome), "narracao.mp3");
  writeFileSync(arq, audio);
  const duracao = palavras.length ? palavras[palavras.length - 1].fim : 0;
  console.log(`✓ narracao.mp3 (${duracao.toFixed(1)}s, ${palavras.length} palavras)`);

  c.narracao = { volume: 1, inicio: 0, ...(c.narracao ?? {}), arquivo: relWorkspace(arq) };
  const ini = c.narracao.inicio ?? 0;
  c.legenda = {
    ativa: true,
    template: "hormozi",
    posicao: "baixo",
    enfase: [],
    ...(c.legenda ?? {}),
    palavras: palavras.map((p) => ({ ...p, inicio: +(p.inicio + ini).toFixed(3), fim: +(p.fim + ini).toFixed(3) })),
  };
  if (values.ajustar) {
    const r = await ajustarCenas(c, ini + duracao + 0.6);
    console.log(`✓ Cenas ajustadas: ${r.antes.toFixed(1)}s → ${r.depois.toFixed(1)}s`);
    r.avisos.forEach((a) => console.log(`  ⚠ ${a}`));
  }
  salvarCriativo(nome, c);
});
