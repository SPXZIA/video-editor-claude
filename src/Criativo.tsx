import React, { useMemo } from "react";
import { AbsoluteFill, Html5Audio, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { criativoSchema, framesDaCena, framesDaTransicao, type CriativoInput } from "./schema";
import { CenaView, src } from "./componentes/CenaView";
import { TextoView } from "./componentes/TextoView";
import { SobreposicaoView } from "./componentes/SobreposicaoView";
import { LegendaView } from "./legendas/LegendaView";
import { apresentacao } from "./transicoes";
import { AvatarView } from "./avatar/AvatarView";
import { layoutNoTempo } from "./avatar/layout";

export const Criativo: React.FC<CriativoInput> = (props) => {
  const c = useMemo(() => criativoSchema.parse(props), [props]);
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const lay = layoutNoTempo(c.avatar, frame / fps, width, height);

  // Janelas em que alguém está falando (para abaixar a música)
  const falas = useMemo(() => {
    const palavras = c.legenda?.palavras ?? [];
    if (!c.narracao && palavras.length === 0) return [] as [number, number][];
    const janelas: [number, number][] = [];
    for (const p of palavras) {
      const ult = janelas[janelas.length - 1];
      if (ult && p.inicio - ult[1] < 0.6) ult[1] = p.fim;
      else janelas.push([p.inicio, p.fim]);
    }
    return janelas;
  }, [c.legenda?.palavras, c.narracao]);

  const volumeMusica = (f: number) => {
    const m = c.musica!;
    const t = f / fps;
    const total = durationInFrames / fps;
    const falando = falas.some(([a, b]) => t >= a - 0.25 && t <= b + 0.35);
    // suaviza a entrada/saída do ducking
    const dist = Math.min(...falas.map(([a, b]) => (t < a ? a - t : t > b ? t - b : 0)), Infinity);
    const mistura = falando ? 1 : interpolate(dist, [0.25, 0.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const base = m.volume + (m.volumeComVoz - m.volume) * mistura;
    const fadeIn = m.fadeIn > 0 ? Math.min(1, t / m.fadeIn) : 1;
    const fadeOut = m.fadeOut > 0 ? Math.min(1, (total - t) / m.fadeOut) : 1;
    return Math.max(0, base * fadeIn * fadeOut);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: c.fundo }}>
      <div style={{ position: "absolute", left: lay.cenas.x, top: lay.cenas.y, width: lay.cenas.w, height: lay.cenas.h, overflow: "hidden" }}>
      <TransitionSeries>
        {c.cenas.flatMap((cena, i) => {
          const dur = framesDaCena(cena, fps);
          const prox = c.cenas[i + 1];
          const tr = framesDaTransicao(cena, fps, prox);
          const pres = apresentacao(cena.transicao, width, height);
          const els = [
            <TransitionSeries.Sequence key={`c${i}`} durationInFrames={dur} premountFor={fps}>
              <CenaView cena={cena} duracao={dur} />
            </TransitionSeries.Sequence>,
          ];
          if (prox && pres && tr > 0) {
            els.push(
              <TransitionSeries.Transition
                key={`t${i}`}
                presentation={pres}
                timing={linearTiming({ durationInFrames: tr })}
              />,
            );
          }
          return els;
        })}
      </TransitionSeries>
      </div>

      {c.sobreposicoes.map((so, i) => {
        const dur = Math.max(1, Math.round(((so.fim - so.inicio) / so.velocidade) * fps));
        return (
          <Sequence key={`so${i}`} from={Math.round(so.em * fps)} durationInFrames={dur} premountFor={fps}>
            <SobreposicaoView s={so} duracao={dur} />
          </Sequence>
        );
      })}

      {c.avatar && lay.avatar && <AvatarView a={c.avatar} caixa={lay.avatar} layout={lay.atual} />}

      {c.textos.map((tx, i) => {
        const from = Math.round(tx.inicio * fps);
        const dur = Math.max(1, Math.round((tx.fim - tx.inicio) * fps));
        return (
          <Sequence key={`tx${i}`} from={from} durationInFrames={dur} layout="none">
            <TextoView texto={tx} />
          </Sequence>
        );
      })}

      {/* Legenda sempre por último, por cima de tudo */}
      {c.legenda?.ativa && c.legenda.palavras.length > 0 && <LegendaView legenda={lay.atual === "dividida" ? { ...c.legenda, posicao: "meio" } : c.legenda} />}

      {c.narracao && (
        <Sequence from={Math.round(c.narracao.inicio * fps)} layout="none">
          <Html5Audio src={src(c.narracao.arquivo)} volume={c.narracao.volume} />
        </Sequence>
      )}
      {c.musica && (
        <Html5Audio
          src={src(c.musica.arquivo)}
          trimBefore={Math.round(c.musica.inicioNaFaixa * fps)}
          volume={volumeMusica}
          loop
        />
      )}
    </AbsoluteFill>
  );
};
