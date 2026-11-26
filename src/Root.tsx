import React from "react";
import { Composition, Folder } from "remotion";
import { Criativo } from "./Criativo";
import { FORMATOS, criativoSchema, duracaoTotal, type CriativoInput } from "./schema";
import { CRIATIVOS } from "./gerado/criativos";
import { ModelosLegenda, DURACAO_MODELOS } from "./ModelosLegenda";

export const Root: React.FC = () => (
  <>
    <Folder name="Criativos">
      {CRIATIVOS.map(({ id, props }) => (
        <Composition
          key={id}
          id={id}
          component={Criativo}
          defaultProps={props as CriativoInput}
          // valores provisórios; calculateMetadata define os reais a partir do JSON
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={30}
          calculateMetadata={({ props: p }: { props: CriativoInput }) => {
            const c = criativoSchema.parse(p);
            const { width, height } = FORMATOS[c.formato];
            return { width, height, fps: c.fps, durationInFrames: duracaoTotal(c) };
          }}
        />
      ))}
    </Folder>
    <Folder name="Ferramentas">
      <Composition
        id="modelos-de-legenda"
        component={ModelosLegenda}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={DURACAO_MODELOS}
      />
    </Folder>
  </>
);
