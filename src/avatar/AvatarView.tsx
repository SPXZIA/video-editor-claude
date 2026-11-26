import React from "react";
import { OffthreadVideo, useVideoConfig } from "remotion";
import type { Avatar } from "../schema";
import { src } from "../componentes/CenaView";
import type { Caixa } from "./layout";

/** Vídeo do avatar dentro da caixa calculada pelo layout */
export const AvatarView: React.FC<{ a: Avatar; caixa: Caixa; layout: string }> = ({ a, caixa, layout }) => {
  const { fps } = useVideoConfig();
  if (caixa.opacidade <= 0.001) return null;
  const enq = a.enquadramento;
  const cheio = layout === "dividida" || layout === "tela-cheia";
  const transform = enq && cheio ? `scale(${enq.zoom}) translate(${enq.x}%, ${enq.y}%)` : undefined;
  return (
    <div
      style={{
        position: "absolute",
        left: caixa.x,
        top: caixa.y,
        width: caixa.w,
        height: caixa.h,
        opacity: caixa.opacidade,
        borderRadius: caixa.raio,
        overflow: "hidden",
        boxShadow: !a.transparente && a.borda && !cheio ? "0 20px 60px rgba(0,0,0,0.45)" : undefined,
      }}
    >
      <OffthreadVideo
        src={src(a.clipe)}
        trimBefore={Math.round(a.inicio * fps)}
        volume={a.volume}
        muted={a.volume === 0}
        transparent={a.transparente}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: cheio ? "50% 22%" : "50% 50%", transform }}
      />
    </div>
  );
};
