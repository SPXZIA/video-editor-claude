import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Cena, Sobreposicao } from "../schema";
import { CenaView } from "./CenaView";

const CAIXA: Record<Sobreposicao["layout"], React.CSSProperties> = {
  "tela-cheia": { inset: 0 },
  pip: { top: "8%", right: "5%", width: "42%", height: "30%", borderRadius: 28, boxShadow: "0 18px 50px rgba(0,0,0,0.45)", border: "5px solid white" },
  "metade-cima": { top: 0, left: 0, right: 0, height: "50%" },
  "metade-baixo": { bottom: 0, left: 0, right: 0, height: "50%" },
};

/** B-roll por cima da cena principal. Tempos já relativos ao início da sobreposição. */
export const SobreposicaoView: React.FC<{ s: Sobreposicao; duracao: number }> = ({ s, duracao }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13, stiffness: 200 } });
  let estilo: React.CSSProperties = {};
  if (s.entrada === "fade") estilo = { opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) };
  if (s.entrada === "pop") estilo = { transform: `scale(${interpolate(pop, [0, 1], [0.6, 1])})`, opacity: Math.min(1, pop * 2) };
  if (s.entrada === "slide") estilo = { transform: `translateY(${interpolate(pop, [0, 1], [100, 0])}%)` };
  const cena: Cena = {
    clipe: s.clipe,
    inicio: s.inicio,
    fim: s.fim,
    velocidade: s.velocidade,
    movimento: s.movimento,
    transicao: "corte",
    duracaoTransicao: 0,
    volume: s.volume,
    espelhar: false,
    enquadramento: s.enquadramento,
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", overflow: "hidden", ...CAIXA[s.layout], ...estilo }}>
        <CenaView cena={cena} duracao={duracao} />
      </div>
    </AbsoluteFill>
  );
};
