/**
 * UGC: transforma vídeo(s) de alguém falando para a câmera na trilha principal do criativo.
 * Transcreve (PT-BR), corta silêncios e "éé/ahn/hum", e gera as cenas + legenda já sincronizadas.
 *   npm run ugc -- <criativo> <video1> [video2 ...] [--motor whisper|scribe] [--pausa 0.35] [--manter-vicios]
 * Vídeos: caminho relativo a workspace/ (ex.: clipes/ugc/take1.mp4) ou absoluto.
 * Também grava <video>.frases.md com as frases e tempos, para o Claude escolher a melhor take de cada fala.
 * Depois: coloque b-roll por cima com "sobreposicoes" e rode o render normalmente.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { WORKSPACE, fmt, lerCriativo, principal, relWorkspace, salvarCriativo, sondar, validarNome } from "./lib/comum";
import { transcreverLocal } from "./lib/whisper";
import { transcreverScribe } from "./lib/elevenlabs";
import type { Palavra } from "../src/schema";

const VICIO = /^(é+|eh+|ah+n*|ãh*|hum+|hm+|uh+|um+)[,.!?…]*$/i;

const resolver = (p: string) => {
  if (existsSync(p)) return path.resolve(p);
  const w = path.join(WORKSPACE, p);
  if (existsSync(w)) return w;
  throw new Error(`Vídeo não encontrado: ${p}`);
};

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      motor: { type: "string", default: "whisper" },
      pausa: { type: "string", default: "0.35" },
      "manter-vicios": { type: "boolean", default: false },
      fps: { type: "string" },
    },
  });
  const [nomeArg, ...videos] = positionals;
  const nome = validarNome(nomeArg);
  if (!videos.length) throw new Error("Informe pelo menos um vídeo. Ex.: npm run ugc -- meu-ugc clipes/ugc/take1.mp4");
  const c = lerCriativo(nome);
  const pausaMax = Number(values.pausa);

  const cenas: Record<string, unknown>[] = [];
  const palavrasFinais: Palavra[] = [];
  let offset = 0;

  for (const v of videos) {
    const abs = resolver(v);
    const info = await sondar(abs);
    const cache = `${abs}.palavras.json`;
    let palavras: Palavra[];
    if (existsSync(cache)) {
      palavras = JSON.parse(readFileSync(cache, "utf8"));
      console.log(`↺ ${path.basename(abs)}: transcrição em cache`);
    } else {
      console.log(`⏳ Transcrevendo ${path.basename(abs)} (${values.motor})…`);
      palavras = values.motor === "scribe" ? await transcreverScribe(new Blob([readFileSync(abs)]), path.basename(abs)) : await transcreverLocal(abs);
      writeFileSync(cache, JSON.stringify(palavras, null, 1));
    }

    // frases para leitura do Claude
    const frases: string[] = [`# ${path.basename(abs)} (${info.duracao.toFixed(1)}s)`, ""];
    let atual: Palavra[] = [];
    const fecharFrase = () => {
      if (atual.length) frases.push(`[${fmt(atual[0].inicio)}-${fmt(atual[atual.length - 1].fim)}] ${atual.map((w) => w.texto).join(" ")}`);
      atual = [];
    };
    palavras.forEach((p, i) => {
      if (i > 0 && p.inicio - palavras[i - 1].fim > 0.5) fecharFrase();
      atual.push(p);
    });
    fecharFrase();
    writeFileSync(`${abs}.frases.md`, frases.join("\n") + "\n");

    // trechos de fala: quebra em pausas longas e em vícios de linguagem
    const uteis = values["manter-vicios"] ? palavras : palavras.filter((p) => !VICIO.test(p.texto.trim()));
    const removidas = new Set(palavras.filter((p) => !uteis.includes(p)));
    const segs: Palavra[][] = [];
    let seg: Palavra[] = [];
    palavras.forEach((p, i) => {
      if (removidas.has(p)) {
        if (seg.length) segs.push(seg);
        seg = [];
        return;
      }
      const ant = seg[seg.length - 1];
      if (ant && p.inicio - ant.fim > pausaMax) {
        segs.push(seg);
        seg = [];
      }
      seg.push(p);
      void i;
    });
    if (seg.length) segs.push(seg);

    segs.forEach((s, k) => {
      const anteriorFim = k > 0 ? segs[k - 1][segs[k - 1].length - 1].fim : 0;
      const proxIni = k < segs.length - 1 ? segs[k + 1][0].inicio : info.duracao;
      const ini = Math.max(anteriorFim, s[0].inicio - 0.08, 0);
      const fim = Math.min(proxIni, s[s.length - 1].fim + 0.12, info.duracao);
      cenas.push({ clipe: relWorkspace(abs), inicio: +ini.toFixed(3), fim: +fim.toFixed(3), volume: 1, transicao: "corte", movimento: "nenhum", beat: s.map((w) => w.texto).join(" ").slice(0, 60) });
      for (const w of s) palavrasFinais.push({ texto: w.texto, inicio: +(w.inicio - ini + offset).toFixed(3), fim: +(w.fim - ini + offset).toFixed(3) });
      offset += fim - ini;
    });
    console.log(`✓ ${path.basename(abs)}: ${segs.length} trecho(s) de fala, ${removidas.size} vício(s) removido(s)`);
  }

  // Zoom alternado a cada corte para disfarçar o "jump cut" (padrão de UGC)
  cenas.forEach((cena, i) => {
    if (i % 2 === 1) cena.enquadramento = { zoom: 1.12, x: 0, y: 0 };
  });
  c.cenas = cenas;
  delete c.narracao;
  c.legenda = { ativa: true, template: "hormozi", posicao: "baixo", enfase: [], ...(c.legenda ?? {}), palavras: palavrasFinais };
  c.sobreposicoes = c.sobreposicoes ?? [];
  if (c.musica) c.musica.volumeComVoz = c.musica.volumeComVoz ?? 0.08;
  salvarCriativo(nome, c);
  console.log(`✓ ${cenas.length} cenas, ${offset.toFixed(1)}s de fala. Agora coloque b-roll em "sobreposicoes".`);
});
