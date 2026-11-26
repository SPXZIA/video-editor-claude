import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Texto } from "../schema";
import { FONTES } from "../legendas/templates";

const TOPO = { cima: "12%", meio: "45%", baixo: "80%" } as const;

/** Texto na tela (gancho, CTA, preço, etiqueta). Tempos já relativos ao início do texto. */
export const TextoView: React.FC<{ texto: Texto }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const k = width / 1080;
  const entrada = spring({ frame, fps, config: { damping: 13, stiffness: 200 } });
  const saida = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const base: React.CSSProperties = {
    position: "absolute",
    top: TOPO[texto.posicao],
    left: "7%",
    right: "7%",
    display: "flex",
    justifyContent: "center",
    opacity: saida,
  };

  if (texto.estilo === "hook" || texto.estilo === "titulo") {
    const hook = texto.estilo === "hook";
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ ...base, transform: `translateY(${interpolate(entrada, [0, 1], [-60, 0])}px) scale(${interpolate(entrada, [0, 1], [0.85, 1])})` }}>
          <div
            style={{
              fontFamily: FONTES.montserrat,
              fontWeight: 900,
              fontSize: (hook ? 78 : 70) * k,
              lineHeight: 1.12,
              textAlign: "center",
              color: texto.cor ?? (hook ? "#111111" : "#FFFFFF"),
              background: texto.corFundo ?? (hook ? "#FFFFFF" : "transparent"),
              padding: hook ? `${18 * k}px ${30 * k}px` : 0,
              borderRadius: 22 * k,
              boxShadow: hook ? "0 14px 40px rgba(0,0,0,0.35)" : undefined,
              textShadow: hook ? undefined : "0 6px 20px rgba(0,0,0,0.6)",
              WebkitTextStroke: hook ? undefined : `${10 * k}px #000`,
              paintOrder: "stroke fill",
              whiteSpace: "pre-wrap",
            }}
          >
            {texto.texto}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (texto.estilo === "cta") {
    const pulso = 1 + Math.sin((frame / fps) * Math.PI * 2 * 1.2) * 0.04;
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ ...base, transform: `scale(${interpolate(entrada, [0, 1], [0.5, 1]) * pulso})` }}>
          <div
            style={{
              fontFamily: FONTES.montserrat,
              fontWeight: 900,
              fontSize: 64 * k,
              color: texto.cor ?? "#FFFFFF",
              background: texto.corFundo ?? "#00C853",
              padding: `${22 * k}px ${46 * k}px`,
              borderRadius: 999,
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
              textAlign: "center",
            }}
          >
            {texto.texto}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (texto.estilo === "preco") {
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ ...base, transform: `rotate(-4deg) scale(${interpolate(entrada, [0, 1], [1.6, 1])})`, opacity: saida * Math.min(1, entrada * 1.5) }}>
          <div
            style={{
              fontFamily: FONTES.anton,
              fontSize: 120 * k,
              color: texto.cor ?? "#111",
              background: texto.corFundo ?? "#FFE600",
              padding: `${6 * k}px ${36 * k}px`,
              borderRadius: 16 * k,
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            }}
          >
            {texto.texto}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // etiqueta
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ ...base, justifyContent: "flex-start", transform: `translateX(${interpolate(entrada, [0, 1], [-120, 0])}%)` }}>
        <div
          style={{
            fontFamily: FONTES.poppins,
            fontWeight: 800,
            fontSize: 44 * k,
            color: texto.cor ?? "#FFFFFF",
            background: texto.corFundo ?? "#FF3D00",
            padding: `${10 * k}px ${24 * k}px`,
            borderRadius: 12 * k,
          }}
        >
          {texto.texto}
        </div>
      </div>
    </AbsoluteFill>
  );
};
