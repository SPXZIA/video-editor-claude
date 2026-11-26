/**
 * Aplica um formato de criativo com avatar (HeyGen, lipsync, UGC gravado).
 *   npm run formato -- <criativo> <formato> [--avatar clipes/avatar/x.mp4] [--hook 2.5] [--descer 12]
 *                      [--voz-do-avatar] [--legendar] [--motor whisper|scribe] [--ajustar] [--transparente]
 * Formatos:
 *   ugc                  avatar grande no centro embaixo no hook, depois vai pro canto inferior direito
 *   dividida             avatar em cima, produto embaixo, o vídeo todo
 *   entregavel           só o produto (remove o avatar)
 *   dividida+entregavel  tela dividida no hook, depois só o produto
 *   dividida+ugc         tela dividida no hook, depois avatar no canto
 *   ugc+entregavel       avatar no centro no hook, depois some
 * --hook: fim do hook em segundos (padrão: fim da 1ª frase da legenda).
 * --descer: % do avatar que fica abaixo da tela nos layouts UGC (esconde a marca d'água da HeyGen free).
 * Voz: por padrão o avatar entra MUDO e o som vem da narracao.mp3 (use o mesmo áudio no HeyGen).
 *      --voz-do-avatar usa o som do vídeo do avatar; --legendar transcreve esse som para a legenda.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { WORKSPACE, lerCriativo, principal, relWorkspace, salvarCriativo, sondar, validarNome } from "./lib/comum";
import { transcreverLocal } from "./lib/whisper";
import { transcreverScribe } from "./lib/elevenlabs";
import { ajustarCenas } from "./lib/ajustar";
import type { Palavra } from "../src/schema";

const FORMATOS: Record<string, (hook: number) => { em: number; layout: string }[] | null> = {
  ugc: (h) => [{ em: 0, layout: "ugc-centro" }, { em: h, layout: "ugc-canto" }],
  dividida: () => [{ em: 0, layout: "dividida" }],
  entregavel: () => null,
  "dividida+entregavel": (h) => [{ em: 0, layout: "dividida" }, { em: h, layout: "oculto" }],
  "dividida+ugc": (h) => [{ em: 0, layout: "dividida" }, { em: h, layout: "ugc-canto" }],
  "ugc+entregavel": (h) => [{ em: 0, layout: "ugc-centro" }, { em: h, layout: "oculto" }],
};

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      avatar: { type: "string" },
      hook: { type: "string" },
      descer: { type: "string" },
      "voz-do-avatar": { type: "boolean", default: false },
      legendar: { type: "boolean", default: false },
      motor: { type: "string", default: "whisper" },
      ajustar: { type: "boolean", default: false },
      transparente: { type: "boolean", default: false },
    },
  });
  const nome = validarNome(positionals[0]);
  const formato = positionals[1];
  if (!formato || !(formato in FORMATOS)) throw new Error(`Formato inválido. Use: ${Object.keys(FORMATOS).join(", ")}`);
  const c = lerCriativo(nome);

  if (formato === "entregavel") {
    delete c.avatar;
    salvarCriativo(nome, c);
    console.log("✓ Formato entregável: avatar removido.");
    return;
  }

  const arg = values.avatar ?? c.avatar?.clipe;
  if (!arg) throw new Error("Informe o vídeo do avatar: --avatar clipes/avatar/heygen.mp4");
  const abs = existsSync(arg) ? path.resolve(arg) : path.join(WORKSPACE, arg);
  if (!existsSync(abs)) throw new Error(`Vídeo não encontrado: ${arg}`);
  const info = await sondar(abs);

  let palavras: Palavra[] = c.legenda?.palavras ?? [];
  // legenda já transcrita (UGC.mp4.palavras.json / UGC-apertado.mp4.palavras.json), inclusive do vídeo antes de tirar o fundo
  const cacheLegenda = [`${abs}.palavras.json`, abs.replace(/-sem-fundo\.webm$/i, ".mp4") + ".palavras.json"].find(existsSync);
  if (values.legendar && cacheLegenda) {
    console.log(`↺ Legenda de ${path.basename(cacheLegenda)}`);
    const ini = c.avatar?.inicio ?? 0;
    palavras = (JSON.parse(readFileSync(cacheLegenda, "utf8")) as Palavra[]).map((p) => ({ ...p, inicio: +(p.inicio - ini).toFixed(3), fim: +(p.fim - ini).toFixed(3) })).filter((p) => p.fim > 0);
    c.legenda = { ativa: true, template: "hormozi", posicao: "baixo", enfase: [], ...(c.legenda ?? {}), palavras };
  } else if (values.legendar) {
    console.log(`⏳ Transcrevendo a fala do avatar (${values.motor})…`);
    palavras = values.motor === "scribe" ? await transcreverScribe(new Blob([readFileSync(abs)]), path.basename(abs)) : await transcreverLocal(abs);
    const ini = c.avatar?.inicio ?? 0;
    palavras = palavras.map((p) => ({ ...p, inicio: +(p.inicio - ini).toFixed(3), fim: +(p.fim - ini).toFixed(3) })).filter((p) => p.fim > 0);
    c.legenda = { ativa: true, template: "hormozi", posicao: "baixo", enfase: [], ...(c.legenda ?? {}), palavras };
  }

  const fimFrase = palavras.find((p) => /[.!?…]$/.test(p.texto));
  const hook = values.hook ? Number(values.hook) : fimFrase ? +(fimFrase.fim + 0.1).toFixed(2) : 3;

  const vozDoAvatar = values["voz-do-avatar"] || values.legendar;
  c.avatar = {
    ...(c.avatar ?? {}),
    clipe: relWorkspace(abs),
    volume: vozDoAvatar ? 1 : 0,
    transparente: values.transparente || c.avatar?.transparente || false,
    descer: values.descer ? Number(values.descer) : c.avatar?.descer ?? 0,
    proporcao: info.largura && info.altura ? +(info.largura / info.altura).toFixed(4) : 9 / 16,
    momentos: FORMATOS[formato](hook),
  };
  // Com avatar grande no centro, blocos de 3 palavras quebram em 2 linhas e sobem até o rosto
  if (formato.startsWith("ugc") && c.legenda && c.legenda.palavrasPorBloco === undefined) c.legenda.palavrasPorBloco = 2;
  if (vozDoAvatar) delete c.narracao;
  else if (!c.narracao) console.log("⚠ Sem narracao.mp3 e avatar mudo: use --voz-do-avatar ou rode npm run narrar antes.");

  const durAvatar = info.duracao - (c.avatar.inicio ?? 0);
  if (values.ajustar) {
    const r = await ajustarCenas(c, durAvatar);
    console.log(`✓ Cenas ajustadas para o avatar: ${r.antes.toFixed(1)}s → ${r.depois.toFixed(1)}s`);
  }
  salvarCriativo(nome, c);
  console.log(`✓ Formato ${formato}: hook até ${hook}s, avatar ${path.basename(abs)} (${durAvatar.toFixed(1)}s), descer ${c.avatar.descer}%`);
  console.log("  Confira a marca d'água no npm run conferir; se aparecer, aumente --descer.");
});
