/**
 * Narração por IA (ElevenLabs) + legenda sincronizada automaticamente.
 *   npm run narrar -- <criativo> [--texto "..."] [--voz <voice_id>] [--velocidade 1.08] [--ajustar]
 *                    [--pausa-frase 0.22] [--pausa-virgula 0.14] [--pausa-palavra 0.08] [--sem-apertar]
 * Por padrão aperta as pausas da IA (silêncio longo entre palavras/frases) sem mexer na voz.
 * O áudio original fica em narracao-bruta.mp3.
 * Sem --texto, usa copy.hook + copy.body + copy.cta do criativo.
 * --ajustar estica/encolhe as cenas para acompanhar a duração da narração.
 */
import { copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { lerCriativo, pastaCriativo, principal, relWorkspace, salvarCriativo, validarNome } from "./lib/comum";
import { narrar } from "./lib/elevenlabs";
import { ajustarCenas } from "./lib/ajustar";
import { PAUSAS_PADRAO, apertarAudio } from "./lib/pausas";

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      texto: { type: "string" },
      voz: { type: "string" },
      modelo: { type: "string" },
      velocidade: { type: "string" },
      ajustar: { type: "boolean", default: false },
      "sem-apertar": { type: "boolean", default: false },
      "pausa-frase": { type: "string" },
      "pausa-virgula": { type: "string" },
      "pausa-palavra": { type: "string" },
    },
  });
  const nome = validarNome(positionals[0]);
  const c = lerCriativo(nome);
  const texto = values.texto ?? [c.copy?.hook, c.copy?.body, c.copy?.cta].filter(Boolean).join(" ");
  if (!texto.trim()) throw new Error("Sem texto: preencha copy.hook/body/cta no criativo.json ou passe --texto.");
  const voz = values.voz ?? process.env.ELEVENLABS_VOICE_ID;
  if (!voz) throw new Error("Falta a voz: passe --voz <id> ou defina ELEVENLABS_VOICE_ID no .env (veja `npm run vozes`).");

  console.log(`⏳ Gerando narração (${texto.length} caracteres)…`);
  const { audio, palavras: palavrasBrutas } = await narrar(texto, {
    voz,
    modelo: values.modelo,
    velocidade: values.velocidade ? Number(values.velocidade) : undefined,
  });
  const bruta = path.join(pastaCriativo(nome), "narracao-bruta.mp3");
  writeFileSync(bruta, audio);
  writeFileSync(path.join(pastaCriativo(nome), "narracao-bruta.palavras.json"), JSON.stringify(palavrasBrutas, null, 1));
  const arq = path.join(pastaCriativo(nome), "narracao.mp3");
  let palavras = palavrasBrutas;
  if (values["sem-apertar"]) {
    copyFileSync(bruta, arq);
  } else {
    const r = await apertarAudio(bruta, arq, palavrasBrutas, {
      ...PAUSAS_PADRAO,
      ...(values["pausa-frase"] ? { frase: Number(values["pausa-frase"]) } : {}),
      ...(values["pausa-virgula"] ? { virgula: Number(values["pausa-virgula"]) } : {}),
      ...(values["pausa-palavra"] ? { entrePalavras: Number(values["pausa-palavra"]) } : {}),
    });
    palavras = r.palavras;
    console.log(`✓ Pausas apertadas: -${r.removido.toFixed(2)}s de silêncio em ${r.cortes.length} ponto(s)`);
  }
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
