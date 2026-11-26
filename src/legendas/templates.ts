import type { Legenda } from "../schema";
import { FONTES as fontes } from "./fontes";

export type Template = {
  descricao: string;
  fonte: string;
  peso: number;
  tamanho: number;
  maiusculas: boolean;
  palavrasPorBloco: number;
  corTexto: string;
  corDestaque: string;
  /** Contorno preto em volta das letras (px) */
  contorno: number;
  sombra: string;
  /** Como a palavra falada agora aparece */
  ativa: "cor" | "caixa" | "brilho" | "cor-e-escala";
  /** Palavras ainda não faladas ficam apagadas (karaokê) */
  apagarFuturas: boolean;
  /** Animação de entrada do bloco */
  entrada: "pop" | "subir" | "fade" | "pop-palavra";
  fundoBloco?: string;
  espacoLetras?: number;
};

export const TEMPLATES: Record<Legenda["template"], Template> = {
  hormozi: {
    descricao: "Caixa alta, grossa, contorno preto, palavra falada em amarelo e maior. O clássico de anúncio.",
    fonte: fontes.montserrat,
    peso: 900,
    tamanho: 86,
    maiusculas: true,
    palavrasPorBloco: 3,
    corTexto: "#FFFFFF",
    corDestaque: "#FFE600",
    contorno: 14,
    sombra: "0 8px 24px rgba(0,0,0,0.55)",
    ativa: "cor-e-escala",
    apagarFuturas: false,
    entrada: "pop",
  },
  tiktok: {
    descricao: "Estilo nativo do TikTok: Poppins, contorno fino, palavra falada em rosa.",
    fonte: fontes.poppins,
    peso: 800,
    tamanho: 82,
    maiusculas: false,
    palavrasPorBloco: 3,
    corTexto: "#FFFFFF",
    corDestaque: "#FE2C55",
    contorno: 10,
    sombra: "0 6px 18px rgba(0,0,0,0.5)",
    ativa: "cor",
    apagarFuturas: false,
    entrada: "subir",
  },
  caixa: {
    descricao: "Palavra falada dentro de uma caixa colorida arredondada.",
    fonte: fontes.poppins,
    peso: 800,
    tamanho: 84,
    maiusculas: true,
    palavrasPorBloco: 3,
    corTexto: "#FFFFFF",
    corDestaque: "#7B2FF7",
    contorno: 10,
    sombra: "0 6px 18px rgba(0,0,0,0.45)",
    ativa: "caixa",
    apagarFuturas: false,
    entrada: "pop",
  },
  karaoke: {
    descricao: "Frase maior em duas linhas; as palavras acendem conforme são faladas.",
    fonte: fontes.montserrat,
    peso: 800,
    tamanho: 74,
    maiusculas: false,
    palavrasPorBloco: 6,
    corTexto: "#FFFFFF",
    corDestaque: "#3DFF8B",
    contorno: 10,
    sombra: "0 6px 18px rgba(0,0,0,0.5)",
    ativa: "cor",
    apagarFuturas: true,
    entrada: "fade",
  },
  neon: {
    descricao: "Bebas Neue com brilho neon ciano; palavra falada brilha em rosa.",
    fonte: fontes.bebas,
    peso: 400,
    tamanho: 140,
    maiusculas: true,
    palavrasPorBloco: 3,
    corTexto: "#FFFFFF",
    corDestaque: "#FF2BD6",
    contorno: 0,
    sombra: "0 0 12px #00F0FF, 0 0 32px #00F0FF, 0 0 64px rgba(0,240,255,0.6)",
    ativa: "brilho",
    apagarFuturas: false,
    entrada: "fade",
    espacoLetras: 3,
  },
  "uma-palavra": {
    descricao: "Uma palavra por vez, gigante, com batida de escala. Muito ritmo.",
    fonte: fontes.anton,
    peso: 400,
    tamanho: 180,
    maiusculas: true,
    palavrasPorBloco: 1,
    corTexto: "#FFFFFF",
    corDestaque: "#FFE600",
    contorno: 16,
    sombra: "0 10px 30px rgba(0,0,0,0.6)",
    ativa: "cor",
    apagarFuturas: false,
    entrada: "pop-palavra",
  },
  minimal: {
    descricao: "Discreta: frase curta em caixa baixa sobre uma pílula escura translúcida.",
    fonte: fontes.inter,
    peso: 700,
    tamanho: 58,
    maiusculas: false,
    palavrasPorBloco: 6,
    corTexto: "#FFFFFF",
    corDestaque: "#FFFFFF",
    contorno: 0,
    sombra: "none",
    ativa: "cor",
    apagarFuturas: false,
    entrada: "fade",
    fundoBloco: "rgba(0,0,0,0.55)",
  },
};

export { FONTES } from "./fontes";
