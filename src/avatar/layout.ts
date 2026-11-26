import { Easing, interpolate } from "remotion";
import type { Avatar } from "../schema";

export type Caixa = { x: number; y: number; w: number; h: number; opacidade: number; raio: number };
type Layout = Avatar["momentos"][number]["layout"];

const caixaDoLayout = (a: Avatar, layout: Layout, W: number, H: number): { avatar: Caixa; cenas: Caixa } => {
  const cheia: Caixa = { x: 0, y: 0, w: W, h: H, opacidade: 1, raio: 0 };
  const raio = a.transparente || !a.borda ? 0 : W * 0.035;
  const ugc = (largura: number, direita: boolean): Caixa => {
    const w = (largura / 100) * W;
    const h = w / a.proporcao;
    return { x: direita ? W - w - W * 0.03 : (W - w) / 2, y: H - h * (1 - a.descer / 100), w, h, opacidade: 1, raio };
  };
  switch (layout) {
    case "ugc-centro":
      return { avatar: ugc(a.larguraCentro, false), cenas: cheia };
    case "ugc-canto":
      return { avatar: ugc(a.larguraCanto, true), cenas: cheia };
    case "dividida":
      return { avatar: { x: 0, y: 0, w: W, h: H / 2, opacidade: 1, raio: 0 }, cenas: { x: 0, y: H / 2, w: W, h: H / 2, opacidade: 1, raio: 0 } };
    case "tela-cheia":
      return { avatar: cheia, cenas: cheia };
    case "oculto": {
      const c = ugc(a.larguraCanto, true);
      return { avatar: { ...c, y: H + 20, opacidade: 0 }, cenas: cheia };
    }
  }
};

const mistura = (a: Caixa, b: Caixa, p: number): Caixa => ({
  x: a.x + (b.x - a.x) * p,
  y: a.y + (b.y - a.y) * p,
  w: a.w + (b.w - a.w) * p,
  h: a.h + (b.h - a.h) * p,
  opacidade: a.opacidade + (b.opacidade - a.opacidade) * p,
  raio: a.raio + (b.raio - a.raio) * p,
});

/** Layout ativo no tempo t (s) — com animação suave na troca */
export const layoutNoTempo = (a: Avatar | undefined, t: number, W: number, H: number) => {
  if (!a) return { avatar: null, cenas: { x: 0, y: 0, w: W, h: H, opacidade: 1, raio: 0 }, atual: "oculto" as Layout };
  const ms = [...a.momentos].sort((m1, m2) => m1.em - m2.em);
  let i = -1;
  ms.forEach((m, k) => {
    if (t >= m.em) i = k;
  });
  if (i < 0) i = 0;
  const atual = ms[i];
  const destino = caixaDoLayout(a, atual.layout, W, H);
  const anterior = i > 0 ? caixaDoLayout(a, ms[i - 1].layout, W, H) : destino;
  // Saindo da tela dividida para entregável: o avatar sobe e o produto empurra (sem buraco preto)
  if (i > 0 && ms[i - 1].layout === "dividida" && atual.layout === "oculto") {
    destino.avatar = { x: 0, y: -H / 2, w: W, h: H / 2, opacidade: 1, raio: 0 };
  }
  const p = a.transicao > 0
    ? Easing.inOut(Easing.cubic)(interpolate(t, [atual.em, atual.em + a.transicao], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
    : 1;
  return {
    avatar: mistura(anterior.avatar, destino.avatar, p),
    cenas: mistura(anterior.cenas, destino.cenas, p),
    atual: atual.layout,
  };
};
