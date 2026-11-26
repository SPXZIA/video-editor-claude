import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Legenda } from "../schema";
import { TEMPLATES } from "./templates";
import { montarBlocos, normalizar } from "./blocos";

const POSICAO = { cima: "20%", meio: "50%", baixo: "70%" } as const;

export const LegendaView: React.FC<{ legenda: Legenda }> = ({ legenda }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const tpl = TEMPLATES[legenda.template];
  const maiusculas = legenda.maiusculas ?? tpl.maiusculas;
  const corTexto = legenda.corTexto ?? tpl.corTexto;
  const corDestaque = legenda.corDestaque ?? tpl.corDestaque;
  // Escala o tamanho com a largura do vídeo (templates pensados para 1080px)
  const tamanho = (legenda.tamanho ?? tpl.tamanho) * (width / 1080);
  const enfase = useMemo(() => new Set(legenda.enfase.map(normalizar)), [legenda.enfase]);

  const blocos = useMemo(
    () => montarBlocos(legenda.palavras, legenda.palavrasPorBloco ?? tpl.palavrasPorBloco),
    [legenda.palavras, legenda.palavrasPorBloco, tpl.palavrasPorBloco],
  );
  const bloco = blocos.find((b) => t >= b.inicio && t < b.fim);
  if (!bloco) return null;

  const fInicio = Math.round(bloco.inicio * fps);
  const local = frame - fInicio;
  const pop = spring({ frame: local, fps, config: { damping: 11, stiffness: 220, mass: 0.6 } });

  let transformBloco = "";
  let opacidade = 1;
  if (tpl.entrada === "pop") transformBloco = `scale(${interpolate(pop, [0, 1], [0.7, 1])})`;
  if (tpl.entrada === "subir") {
    transformBloco = `translateY(${interpolate(pop, [0, 1], [40, 0])}px)`;
    opacidade = interpolate(local, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  }
  if (tpl.entrada === "fade") opacidade = interpolate(local, [0, 5], [0, 1], { extrapolateRight: "clamp" });

  const indiceAtiva = (() => {
    let idx = -1;
    bloco.palavras.forEach((p, i) => {
      if (t >= p.inicio - 0.02) idx = i;
    });
    return idx;
  })();

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: POSICAO[legenda.posicao],
          left: "6%",
          right: "6%",
          transform: `translateY(-50%) ${transformBloco}`,
          opacity: opacidade,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          rowGap: tamanho * 0.06,
          columnGap: tamanho * 0.42,
          textAlign: "center",
          fontFamily: tpl.fonte,
          fontWeight: tpl.peso,
          fontSize: tamanho,
          lineHeight: 1.1,
          letterSpacing: tpl.espacoLetras,
          ...(tpl.fundoBloco
            ? { background: tpl.fundoBloco, borderRadius: tamanho * 0.4, padding: `${tamanho * 0.25}px ${tamanho * 0.45}px`, left: "10%", right: "10%" }
            : {}),
        }}
      >
        {bloco.palavras.map((p, i) => {
          const ativa = i === indiceAtiva;
          const futura = i > indiceAtiva;
          const enfatizada = enfase.has(normalizar(p.texto));
          const texto = maiusculas ? p.texto.toLocaleUpperCase("pt-BR") : p.texto;
          let cor = enfatizada ? corDestaque : corTexto;
          let escala = 1;
          let fundo: string | undefined;
          let sombra = tpl.sombra;
          let opac = 1;

          if (ativa) {
            if (tpl.ativa === "cor" || tpl.ativa === "cor-e-escala") cor = corDestaque;
            if (tpl.ativa === "cor-e-escala") {
              const s = spring({ frame: frame - Math.round(p.inicio * fps), fps, config: { damping: 10, stiffness: 260 } });
              escala = interpolate(s, [0, 1], [1, 1.07]);
            }
            if (tpl.ativa === "caixa") fundo = corDestaque;
            if (tpl.ativa === "brilho") {
              cor = "#FFFFFF";
              sombra = `0 0 12px ${corDestaque}, 0 0 32px ${corDestaque}, 0 0 64px ${corDestaque}`;
            }
          }
          if (tpl.apagarFuturas && futura) opac = 0.45;
          if (tpl.apagarFuturas && !futura) cor = corDestaque;
          if (tpl.entrada === "pop-palavra") {
            const s = spring({ frame: frame - Math.round(p.inicio * fps), fps, config: { damping: 9, stiffness: 240 } });
            escala = interpolate(s, [0, 1], [0.6, 1]);
          }

          return (
            <span
              key={`${p.inicio}-${i}`}
              style={{
                display: "inline-block",
                color: cor,
                opacity: opac,
                transform: `scale(${escala})`,
                textShadow: sombra === "none" ? undefined : sombra,
                WebkitTextStroke: tpl.contorno && !fundo ? `${tpl.contorno * (width / 1080)}px #000` : undefined,
                paintOrder: "stroke fill",
                background: fundo,
                borderRadius: fundo ? tamanho * 0.18 : undefined,
                padding: fundo ? `0 ${tamanho * 0.16}px` : undefined,
              }}
            >
              {texto}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
