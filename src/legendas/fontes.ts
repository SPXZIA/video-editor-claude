import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/** Fontes locais (workspace/fontes), carregadas uma vez. */
const carregar = (family: string, arquivo: string, pesos: string[]) => {
  for (const weight of pesos) {
    loadFont({ family, url: staticFile(`fontes/${arquivo}`), weight, format: "woff2" }).catch((e) =>
      console.error(`Falha ao carregar ${arquivo}`, e),
    );
  }
  return `"${family}", "Arial Black", sans-serif`;
};

export const FONTES = {
  montserrat: carregar("Montserrat", "Montserrat.woff2", ["800", "900"]),
  poppins: carregar("Poppins", "Poppins-800.woff2", ["800"]),
  poppins700: carregar("Poppins", "Poppins-700.woff2", ["700"]),
  bebas: carregar("Bebas Neue", "BebasNeue-400.woff2", ["400"]),
  anton: carregar("Anton", "Anton-400.woff2", ["400"]),
  inter: carregar("Inter", "Inter.woff2", ["600", "700"]),
};
