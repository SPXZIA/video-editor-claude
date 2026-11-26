import React from "react";
import { AbsoluteFill, interpolate, Easing } from "remotion";
import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { Cena } from "../schema";

/**
 * Transições feitas só com CSS (renderizam igual no preview e no MP4).
 * `p` vai de 0 a 1 durante a transição.
 */
type P = Record<string, never>;
type Comp = TransitionPresentationComponentProps<P>;

const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Zoom: a cena que sai cresce e some, a que entra vem de um zoom maior */
const Zoom: React.FC<Comp> = ({ children, presentationDirection, presentationProgress }) => {
  const p = easeInOut(presentationProgress);
  const saindo = presentationDirection === "exiting";
  const scale = saindo ? interpolate(p, [0, 1], [1, 1.6]) : interpolate(p, [0, 1], [1.4, 1]);
  const opacity = saindo ? interpolate(p, [0.4, 1], [1, 0], { extrapolateLeft: "clamp" }) : 1;
  const blur = saindo ? interpolate(p, [0, 1], [0, 12]) : interpolate(p, [0, 1], [12, 0]);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, opacity, filter: `blur(${blur}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

/** Whip pan: chicote rápido para o lado com desfoque de movimento */
const Whip: React.FC<Comp> = ({ children, presentationDirection, presentationProgress }) => {
  const p = Easing.inOut(Easing.cubic)(presentationProgress);
  const saindo = presentationDirection === "exiting";
  const x = saindo ? interpolate(p, [0, 1], [0, -100]) : interpolate(p, [0, 1], [100, 0]);
  const blur = interpolate(Math.sin(presentationProgress * Math.PI), [0, 1], [0, 30]);
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}%) skewX(${saindo ? -8 * p : -8 * (1 - p)}deg)`, filter: `blur(${blur}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

/** Flash branco: estoura para branco no meio e revela a próxima cena */
const Flash: React.FC<Comp> = ({ children, presentationDirection, presentationProgress }) => {
  const saindo = presentationDirection === "exiting";
  const visivel = saindo ? presentationProgress < 0.5 : presentationProgress >= 0.5;
  const branco = interpolate(presentationProgress, [0, 0.5, 1], [0, 1, 0]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: visivel ? 1 : 0, transform: `scale(${1 + branco * 0.06})` }}>{children}</AbsoluteFill>
      {!saindo && <AbsoluteFill style={{ backgroundColor: "white", opacity: branco }} />}
    </AbsoluteFill>
  );
};

/** Blur: dissolve com desfoque */
const Blur: React.FC<Comp> = ({ children, presentationDirection, presentationProgress }) => {
  const saindo = presentationDirection === "exiting";
  const p = presentationProgress;
  const blur = saindo ? interpolate(p, [0, 1], [0, 25]) : interpolate(p, [0, 1], [25, 0]);
  const opacity = saindo ? 1 : interpolate(p, [0, 1], [0, 1]);
  return <AbsoluteFill style={{ filter: `blur(${blur}px)`, opacity }}>{children}</AbsoluteFill>;
};

/** Giro: rotação com zoom */
const Giro: React.FC<Comp> = ({ children, presentationDirection, presentationProgress }) => {
  const p = easeInOut(presentationProgress);
  const saindo = presentationDirection === "exiting";
  const rot = saindo ? interpolate(p, [0, 1], [0, 25]) : interpolate(p, [0, 1], [-25, 0]);
  const scale = saindo ? interpolate(p, [0, 1], [1, 1.8]) : interpolate(p, [0, 1], [1.8, 1]);
  const opacity = saindo ? interpolate(p, [0.5, 1], [1, 0], { extrapolateLeft: "clamp" }) : interpolate(p, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const blur = Math.sin(presentationProgress * Math.PI) * 10;
  return (
    <AbsoluteFill style={{ transform: `rotate(${rot}deg) scale(${scale})`, opacity, filter: `blur(${blur}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

const custom = (component: React.FC<Comp>): TransitionPresentation<P> => ({
  component,
  props: {} as P,
});

export const apresentacao = (
  t: Cena["transicao"],
  largura: number,
  altura: number,
): TransitionPresentation<Record<string, unknown>> | null => {
  // largura/altura reservados para transições que precisam do tamanho do quadro
  void largura;
  void altura;
  switch (t) {
    case "corte":
      return null;
    case "fade":
      return fade() as never;
    case "slide-esquerda":
      return slide({ direction: "from-right" }) as never;
    case "slide-direita":
      return slide({ direction: "from-left" }) as never;
    case "slide-cima":
      return slide({ direction: "from-bottom" }) as never;
    case "wipe":
      return wipe({ direction: "from-left" }) as never;
    case "zoom":
      return custom(Zoom) as never;
    case "whip":
      return custom(Whip) as never;
    case "flash":
      return custom(Flash) as never;
    case "blur":
      return custom(Blur) as never;
    case "giro":
      return custom(Giro) as never;
  }
};
