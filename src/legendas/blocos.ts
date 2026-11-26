import type { Palavra } from "../schema";

export type Bloco = { palavras: Palavra[]; inicio: number; fim: number };

const PONTUACAO_FINAL = /[.!?…:;,]$/;

/**
 * Agrupa palavras em blocos curtos para a legenda.
 * Quebra quando: atinge o máximo de palavras, há pausa > 0.35s, ou a palavra termina em pontuação.
 */
export const montarBlocos = (palavras: Palavra[], maxPalavras: number, maxCaracteres = 22): Bloco[] => {
  const blocos: Bloco[] = [];
  let atual: Palavra[] = [];
  const fechar = () => {
    if (atual.length === 0) return;
    blocos.push({ palavras: atual, inicio: atual[0].inicio, fim: atual[atual.length - 1].fim });
    atual = [];
  };
  palavras.forEach((p, i) => {
    const anterior = palavras[i - 1];
    const caracteres = atual.map((w) => w.texto).join(" ").length + p.texto.length + 1;
    if (
      atual.length > 0 &&
      (atual.length >= maxPalavras ||
        (anterior && p.inicio - anterior.fim > 0.35) ||
        (maxPalavras > 1 && caracteres > maxCaracteres * Math.max(1, maxPalavras / 3)))
    ) {
      fechar();
    }
    atual.push(p);
    if (PONTUACAO_FINAL.test(p.texto)) fechar();
  });
  fechar();
  // Cada bloco fica na tela até o próximo começar (no máx. +0.6s após a última palavra)
  return blocos.map((b, i) => {
    const prox = blocos[i + 1];
    const fim = prox ? Math.min(prox.inicio, b.fim + 0.6) : b.fim + 0.6;
    return { ...b, fim };
  });
};

export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%$]/g, "");
