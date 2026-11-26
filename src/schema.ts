import { z } from "zod";

/**
 * Formato de um criativo (workspace/criativos/<nome>/criativo.json).
 * Todos os tempos são em SEGUNDOS. Caminhos de mídia são relativos a workspace/.
 */

export const FORMATOS = {
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
} as const;

export const TRANSICOES = [
  "corte",
  "fade",
  "slide-esquerda",
  "slide-direita",
  "slide-cima",
  "wipe",
  "zoom",
  "whip",
  "flash",
  "blur",
  "giro",
] as const;

export const MOVIMENTOS = [
  "nenhum",
  "zoom-in",
  "zoom-out",
  "pan-esquerda",
  "pan-direita",
  "punch",
  "tremor",
] as const;

export const TEMPLATES_LEGENDA = [
  "hormozi",
  "tiktok",
  "caixa",
  "karaoke",
  "neon",
  "uma-palavra",
  "minimal",
] as const;

export const ESTILOS_TEXTO = ["hook", "cta", "etiqueta", "preco", "titulo"] as const;

const palavra = z.object({
  texto: z.string(),
  inicio: z.number(),
  fim: z.number(),
});
export type Palavra = z.infer<typeof palavra>;

const cena = z.object({
  /** Caminho do vídeo ou imagem, relativo a workspace/ (ex.: "clipes/tabuas/01.mp4") */
  clipe: z.string(),
  /** Trecho do clipe original */
  inicio: z.number().default(0),
  fim: z.number(),
  velocidade: z.number().positive().default(1),
  movimento: z.enum(MOVIMENTOS).default("nenhum"),
  /** Transição que leva DESTA cena para a próxima */
  transicao: z.enum(TRANSICOES).default("corte"),
  duracaoTransicao: z.number().min(0).default(0.35),
  /** Volume do áudio original do clipe (0 = mudo) */
  volume: z.number().min(0).max(2).default(0),
  /** Filtro CSS opcional, ex.: "saturate(1.2) contrast(1.1)" */
  filtro: z.string().optional(),
  /**
   * Reenquadrar para esconder marca d'água/legenda do vídeo original.
   * zoom 1.2 = aproxima 20%; x/y em % deslocam o centro (-50 a 50). Ex.: marca no canto
   * inferior direito → { zoom: 1.25, x: 8, y: 8 } empurra a imagem e corta esse canto.
   */
  enquadramento: z
    .object({ zoom: z.number().min(1).max(3).default(1), x: z.number().default(0), y: z.number().default(0) })
    .optional(),
  /** Espelhar horizontalmente (ajuda a disfarçar clipe repetido) */
  espelhar: z.boolean().default(false),
  /** Anotação livre: qual beat da copy esta cena cobre */
  beat: z.string().optional(),
});
export type Cena = z.infer<typeof cena>;

const legenda = z.object({
  ativa: z.boolean().default(true),
  template: z.enum(TEMPLATES_LEGENDA).default("hormozi"),
  /** cima = 20% da altura, meio = 50%, baixo = 70% (padrão; fica acima da interface do Reels/TikTok) */
  posicao: z.enum(["cima", "meio", "baixo"]).default("baixo"),
  /** Máximo de palavras por bloco (cada template tem seu padrão) */
  palavrasPorBloco: z.number().int().min(1).max(8).optional(),
  maiusculas: z.boolean().optional(),
  corTexto: z.string().optional(),
  corDestaque: z.string().optional(),
  tamanho: z.number().optional(),
  /** Palavras com tempo no timeline FINAL do criativo */
  palavras: z.array(palavra).default([]),
  /** Palavras que ganham a cor de destaque sempre (ex.: "GRÁTIS", "50%") */
  enfase: z.array(z.string()).default([]),
});
export type Legenda = z.infer<typeof legenda>;

const texto = z.object({
  texto: z.string(),
  inicio: z.number(),
  fim: z.number(),
  estilo: z.enum(ESTILOS_TEXTO).default("titulo"),
  posicao: z.enum(["cima", "meio", "baixo"]).default("cima"),
  cor: z.string().optional(),
  corFundo: z.string().optional(),
});
export type Texto = z.infer<typeof texto>;

export const criativoSchema = z.object({
  nome: z.string(),
  formato: z.enum(["9:16", "4:5", "1:1", "16:9"]).default("9:16"),
  fps: z.number().int().default(30),
  /** Copy escolhida, só para referência */
  copy: z
    .object({ hook: z.string(), body: z.string(), cta: z.string() })
    .partial()
    .optional(),
  cenas: z.array(cena).min(1),
  narracao: z
    .object({
      arquivo: z.string(),
      volume: z.number().default(1),
      inicio: z.number().default(0),
    })
    .optional(),
  musica: z
    .object({
      arquivo: z.string(),
      volume: z.number().default(0.35),
      /** Volume enquanto alguém fala (ducking automático) */
      volumeComVoz: z.number().default(0.12),
      /** Pular o começo da faixa (segundos) */
      inicioNaFaixa: z.number().default(0),
      fadeIn: z.number().default(0.5),
      fadeOut: z.number().default(1),
    })
    .optional(),
  legenda: legenda.optional(),
  textos: z.array(texto).default([]),
  /** Cor de fundo quando o clipe não cobre o quadro */
  fundo: z.string().default("#000000"),
});

export type CriativoInput = z.input<typeof criativoSchema>;
export type Criativo = z.output<typeof criativoSchema>;

/** Duração (em frames) de cada cena no timeline final */
export const framesDaCena = (c: Cena, fps: number) =>
  Math.max(1, Math.round(((c.fim - c.inicio) / c.velocidade) * fps));

export const framesDaTransicao = (c: Cena, fps: number, proxima?: Cena) => {
  if (!proxima || c.transicao === "corte") return 0;
  const max = Math.min(framesDaCena(c, fps), framesDaCena(proxima, fps)) - 1;
  return Math.max(0, Math.min(Math.round(c.duracaoTransicao * fps), max));
};

/** Duração total do criativo em frames (transições sobrepõem as cenas) */
export const duracaoTotal = (c: Criativo) => {
  let total = 0;
  c.cenas.forEach((cena, i) => {
    total += framesDaCena(cena, c.fps);
    total -= framesDaTransicao(cena, c.fps, c.cenas[i + 1]);
  });
  return Math.max(1, total);
};

/** Momento (em segundos, timeline final) em que cada cena começa */
export const iniciosDasCenas = (c: Criativo) => {
  const inicios: number[] = [];
  let t = 0;
  c.cenas.forEach((cena, i) => {
    inicios.push(t / c.fps);
    t += framesDaCena(cena, c.fps) - framesDaTransicao(cena, c.fps, c.cenas[i + 1]);
  });
  return inicios;
};
