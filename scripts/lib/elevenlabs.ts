import type { Palavra } from "../../src/schema";

const BASE = "https://api.elevenlabs.io/v1";

export const chave = () => {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("Falta ELEVENLABS_API_KEY no arquivo .env (copie .env.example para .env e cole sua chave).");
  return k;
};

const pedir = async (url: string, init: RequestInit) => {
  const r = await fetch(url, { ...init, headers: { "xi-api-key": chave(), ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 500)}`);
  return r;
};

export const listarVozes = async () => {
  const r = await pedir(`${BASE}/voices`, { method: "GET" });
  const j = (await r.json()) as { voices: { voice_id: string; name: string; labels?: Record<string, string>; category?: string }[] };
  return j.voices;
};

/**
 * Narração com tempo por caractere (endpoint with-timestamps). Converte em palavras.
 */
export const narrar = async (texto: string, opts: { voz: string; modelo?: string; velocidade?: number; estabilidade?: number }) => {
  const r = await pedir(`${BASE}/text-to-speech/${opts.voz}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: texto,
      model_id: opts.modelo ?? process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
      language_code: "pt",
      voice_settings: {
        stability: opts.estabilidade ?? 0.45,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
        speed: opts.velocidade ?? 1.08,
      },
    }),
  });
  const j = (await r.json()) as {
    audio_base64: string;
    alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } | null;
    normalized_alignment?: typeof j.alignment;
  };
  const al = j.alignment ?? j.normalized_alignment;
  if (!al) throw new Error("A ElevenLabs não devolveu o alinhamento de tempo.");
  return { audio: Buffer.from(j.audio_base64, "base64"), palavras: caracteresParaPalavras(al) };
};

export const caracteresParaPalavras = (al: {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}): Palavra[] => {
  const palavras: Palavra[] = [];
  let atual: Palavra | null = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (atual) palavras.push(atual);
      atual = null;
      return;
    }
    if (!atual) atual = { texto: "", inicio: al.character_start_times_seconds[i], fim: 0 };
    atual.texto += ch;
    atual.fim = al.character_end_times_seconds[i];
  });
  if (atual) palavras.push(atual);
  return palavras.map((p) => ({ texto: p.texto, inicio: +p.inicio.toFixed(3), fim: +p.fim.toFixed(3) }));
};

/** Transcrição na nuvem (Scribe), mais precisa que o Whisper local, mas gasta créditos. */
export const transcreverScribe = async (arquivo: Blob, nomeArquivo: string): Promise<Palavra[]> => {
  const form = new FormData();
  form.append("file", arquivo, nomeArquivo);
  form.append("model_id", "scribe_v1");
  form.append("language_code", "por");
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false");
  const r = await pedir(`${BASE}/speech-to-text`, { method: "POST", body: form });
  const j = (await r.json()) as { words: { text: string; start: number; end: number; type: string }[] };
  return j.words
    .filter((w) => w.type === "word")
    .map((w) => ({ texto: w.text.trim(), inicio: w.start, fim: w.end }));
};
