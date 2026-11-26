import { FFMPEG, rodar, sondar } from "./comum";
import type { Palavra } from "../../src/schema";

export type OpcoesPausa = {
  /** Pausa máxima entre palavras da mesma frase (s) */
  entrePalavras: number;
  /** Pausa máxima depois de vírgula (s) */
  virgula: number;
  /** Pausa máxima depois de ponto, ! ou ? (s) */
  frase: number;
  /** Silêncio máximo no começo do áudio (s) */
  inicio: number;
};

export const PAUSAS_PADRAO: OpcoesPausa = { entrePalavras: 0.08, virgula: 0.14, frase: 0.22, inicio: 0.05 };

const limite = (texto: string, o: OpcoesPausa) =>
  /[.!?…]$/.test(texto) ? o.frase : /[,;:]$/.test(texto) ? o.virgula : o.entrePalavras;

/**
 * Calcula os trechos de silêncio a remover para que nenhuma pausa passe do limite.
 * Remove sempre o MEIO da pausa (mantém um respiro dos dois lados).
 */
export const trechosARemover = (palavras: Palavra[], o: OpcoesPausa = PAUSAS_PADRAO): [number, number][] => {
  const cortes: [number, number][] = [];
  if (palavras.length && palavras[0].inicio > o.inicio) cortes.push([0, palavras[0].inicio - o.inicio]);
  for (let i = 0; i < palavras.length - 1; i++) {
    const gap = palavras[i + 1].inicio - palavras[i].fim;
    const max = limite(palavras[i].texto, o);
    if (gap > max + 0.03) {
      const meio = (palavras[i].fim + palavras[i + 1].inicio) / 2;
      const sobra = gap - max;
      cortes.push([meio - sobra / 2, meio + sobra / 2]);
    }
  }
  return cortes.map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)]);
};

/** Novo tempo de um instante depois de remover os trechos */
export const remapear = (t: number, cortes: [number, number][]) => {
  let tirado = 0;
  for (const [a, b] of cortes) {
    if (t >= b) tirado += b - a;
    else if (t > a) tirado += t - a;
  }
  return +(t - tirado).toFixed(3);
};

/** Aplica os cortes no áudio (ffmpeg) e devolve as palavras com os tempos novos. */
export const apertarAudio = async (entrada: string, saida: string, palavras: Palavra[], o: OpcoesPausa = PAUSAS_PADRAO) => {
  const cortes = trechosARemover(palavras, o);
  // silêncio sobrando no fim
  const dur = (await sondar(entrada)).duracao;
  const ultimo = palavras[palavras.length - 1];
  if (ultimo && dur - ultimo.fim > 0.25) cortes.push([+(ultimo.fim + 0.2).toFixed(3), +(dur + 1).toFixed(3)]);
  const novas = palavras.map((p) => ({ ...p, inicio: remapear(p.inicio, cortes), fim: remapear(p.fim, cortes) }));
  if (cortes.length === 0) {
    await rodar(FFMPEG, ["-y", "-hide_banner", "-i", entrada, "-c", "copy", saida]);
    return { palavras: novas, removido: 0, cortes };
  }
  const expr = cortes.map(([a, b]) => `between(t\\,${a}\\,${b})`).join("+");
  await rodar(FFMPEG, [
    "-y", "-hide_banner", "-i", entrada,
    "-af", `aselect='not(${expr})',asetpts=N/SR/TB`,
    "-c:a", "libmp3lame", "-b:a", "192k", saida,
  ]);
  const removido = cortes.reduce((s, [a, b]) => s + (Math.min(b, dur) - a), 0);
  return { palavras: novas, removido, cortes };
};
