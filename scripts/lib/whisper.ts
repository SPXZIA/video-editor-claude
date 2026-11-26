import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe, type WhisperModel } from "@remotion/install-whisper-cpp";
import { FFMPEG, RAIZ, garantirPasta, rodar } from "./comum";
import type { Palavra } from "../../src/schema";

const VERSAO = "1.5.5";
const PASTA = path.join(RAIZ, "whisper");

/** Transcreve um áudio/vídeo em PT-BR com Whisper local (grátis). Devolve palavras com tempo. */
export const transcreverLocal = async (arquivo: string, modelo = (process.env.WHISPER_MODELO || "medium") as WhisperModel): Promise<Palavra[]> => {
  const cwd = process.cwd();
  process.chdir(RAIZ); // o instalador baixa arquivos temporários na pasta atual
  try {
    if (!existsSync(PASTA)) console.log("⏳ Instalando o Whisper local (só na primeira vez)…");
    await installWhisperCpp({ to: PASTA, version: VERSAO, printOutput: false });
    const { alreadyExisted } = await downloadWhisperModel({ model: modelo, folder: PASTA, printOutput: false });
    if (!alreadyExisted) console.log(`✓ Modelo ${modelo} baixado`);
  } finally {
    process.chdir(cwd);
  }

  const wav = path.join(garantirPasta(path.join(RAIZ, ".cache")), `whisper-${Date.now()}.wav`);
  await rodar(FFMPEG, ["-y", "-i", arquivo, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
  try {
    const saida = await transcribe({
      inputPath: wav,
      whisperPath: PASTA,
      whisperCppVersion: VERSAO,
      model: modelo,
      tokenLevelTimestamps: true,
      language: "pt",
      printOutput: false,
      splitOnWord: true,
    });
    const { captions } = toCaptions({ whisperCppOutput: saida });
    return juntarTokens(captions.map((c) => ({ texto: c.text, inicio: c.startMs / 1000, fim: c.endMs / 1000 })));
  } finally {
    rmSync(wav, { force: true });
  }
};

/** Tokens do Whisper vêm quebrados ("tá", "bua"); junta pedaços sem espaço inicial na palavra anterior. */
export const juntarTokens = (tokens: Palavra[]): Palavra[] => {
  const palavras: Palavra[] = [];
  for (const t of tokens) {
    if (/^\s*\[.*\]\s*$/.test(t.texto)) continue; // [música], [BLANK_AUDIO]
    const novo = /^\s/.test(t.texto) || palavras.length === 0;
    const limpo = t.texto.trim();
    if (!limpo) continue;
    if (novo) palavras.push({ texto: limpo, inicio: t.inicio, fim: t.fim });
    else {
      const ult = palavras[palavras.length - 1];
      ult.texto += limpo;
      ult.fim = t.fim;
    }
  }
  return palavras.map((p) => ({ ...p, inicio: round(p.inicio), fim: round(Math.max(p.fim, p.inicio + 0.05)) }));
};

const round = (n: number) => Math.round(n * 1000) / 1000;
