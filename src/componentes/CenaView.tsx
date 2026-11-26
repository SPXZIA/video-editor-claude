import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Cena } from "../schema";

const IMAGEM = /\.(png|jpe?g|webp|gif)$/i;

export const src = (caminho: string) =>
  /^https?:\/\//.test(caminho) ? caminho : staticFile(caminho.replace(/\\/g, "/"));

/** Transform do movimento de câmera ao longo da cena (0 → 1) */
const movimento = (m: Cena["movimento"], p: number, frame: number, fps: number) => {
  switch (m) {
    case "zoom-in":
      return `scale(${interpolate(p, [0, 1], [1, 1.15])})`;
    case "zoom-out":
      return `scale(${interpolate(p, [0, 1], [1.15, 1])})`;
    case "pan-esquerda":
      return `scale(1.15) translateX(${interpolate(p, [0, 1], [5, -5])}%)`;
    case "pan-direita":
      return `scale(1.15) translateX(${interpolate(p, [0, 1], [-5, 5])}%)`;
    case "punch": {
      // batida de zoom no começo da cena
      const s = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
      return `scale(${interpolate(s, [0, 1], [1.25, 1.04])})`;
    }
    case "tremor": {
      const dx = Math.sin(frame * 1.7) * 6 + Math.sin(frame * 3.1) * 3;
      const dy = Math.cos(frame * 2.3) * 6;
      return `scale(1.06) translate(${dx}px, ${dy}px)`;
    }
    default:
      return "none";
  }
};

export const CenaView: React.FC<{ cena: Cena; duracao: number }> = ({ cena, duracao }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = duracao > 1 ? frame / (duracao - 1) : 0;
  const enq = cena.enquadramento;
  const reenquadrar = enq ? `scale(${enq.zoom}) translate(${enq.x}%, ${enq.y}%)` : "";
  const transform = [reenquadrar, movimento(cena.movimento, p, frame, fps), cena.espelhar ? "scaleX(-1)" : ""]
    .filter((t) => t && t !== "none")
    .join(" ");

  const estilo: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: transform || undefined,
    filter: cena.filtro,
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {IMAGEM.test(cena.clipe) ? (
        <Img src={src(cena.clipe)} style={estilo} />
      ) : (
        <OffthreadVideo
          src={src(cena.clipe)}
          trimBefore={Math.round(cena.inicio * fps)}
          playbackRate={cena.velocidade}
          volume={cena.volume}
          muted={cena.volume === 0}
          style={estilo}
        />
      )}
    </AbsoluteFill>
  );
};
