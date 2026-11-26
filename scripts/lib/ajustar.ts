import path from "node:path";
import { WORKSPACE, VIDEO_EXT, sondar } from "./comum";
import { criativoSchema, duracaoTotal } from "../../src/schema";

/**
 * Estica ou encolhe as cenas proporcionalmente para o criativo durar `alvo` segundos.
 * Respeita a duração real de cada clipe; se faltar material, avisa.
 */
export const ajustarCenas = async (dados: { cenas: { clipe: string; inicio?: number; fim: number; velocidade?: number }[] } & Record<string, unknown>, alvo: number) => {
  const c = criativoSchema.parse(dados);
  const atual = duracaoTotal(c) / c.fps;
  const fator = alvo / atual;
  const avisos: string[] = [];
  for (const cena of dados.cenas) {
    const ini = cena.inicio ?? 0;
    const novaDur = (cena.fim - ini) * fator;
    let max = Infinity;
    if (VIDEO_EXT.test(cena.clipe)) max = (await sondar(path.join(WORKSPACE, cena.clipe))).duracao - 0.05;
    const fim = Math.min(ini + novaDur, max);
    if (fim < ini + novaDur - 0.05) avisos.push(`${cena.clipe}: só tem ${(max - ini).toFixed(2)}s a partir de ${ini}s`);
    cena.fim = +fim.toFixed(3);
  }
  const final = duracaoTotal(criativoSchema.parse(dados)) / c.fps;
  return { antes: atual, depois: final, avisos };
};
