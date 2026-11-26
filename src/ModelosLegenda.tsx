import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { TEMPLATES_LEGENDA, type Palavra } from "./schema";
import { LegendaView } from "./legendas/LegendaView";
import { FONTES } from "./legendas/templates";

const FRASE = "Essa tábua mudou minha cozinha e custa menos que um almoço".split(" ");
const PALAVRAS: Palavra[] = FRASE.map((texto, i) => ({ texto, inicio: 0.3 + i * 0.32, fim: 0.3 + i * 0.32 + 0.28 }));
const SEG = 4.5;
export const DURACAO_MODELOS = Math.round(TEMPLATES_LEGENDA.length * SEG * 30);

/** Vitrine com todos os templates de legenda, para escolher o estilo */
export const ModelosLegenda: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(160deg,#5b3a1f,#c08a4c 55%,#2b1a0d)" }}>
    {TEMPLATES_LEGENDA.map((t, i) => (
      <Sequence key={t} from={Math.round(i * SEG * 30)} durationInFrames={Math.round(SEG * 30)}>
        <AbsoluteFill>
          <div style={{ position: "absolute", top: 90, width: "100%", textAlign: "center", fontFamily: FONTES.inter, fontWeight: 700, fontSize: 54, color: "#fff", opacity: 0.85 }}>
            template: {t}
          </div>
          <LegendaView legenda={{ ativa: true, template: t, posicao: "meio", palavras: PALAVRAS, enfase: ["almoço"] }} />
        </AbsoluteFill>
      </Sequence>
    ))}
  </AbsoluteFill>
);
