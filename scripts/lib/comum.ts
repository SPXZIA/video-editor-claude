import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const WORKSPACE = path.join(RAIZ, "workspace");
export const CLIPES = path.join(WORKSPACE, "clipes");
export const MUSICAS = path.join(WORKSPACE, "musicas");
export const CRIATIVOS = path.join(WORKSPACE, "criativos");

export const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;
export const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
export const IMAGEM_EXT = /\.(png|jpe?g|webp)$/i;

export const carregarEnv = () => {
  const arq = path.join(RAIZ, ".env");
  if (!existsSync(arq)) return;
  for (const linha of readFileSync(arq, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
};
carregarEnv();

const require = createRequire(import.meta.url);

/**
 * ffmpeg: o pacote ffmpeg-static (build completo, baixado no npm install).
 * ffprobe: o que vem junto com o Remotion. Nada para instalar à mão.
 * Dá para trocar com FFMPEG_PATH / FFPROBE_PATH no .env.
 */
const binario = (nome: "ffmpeg" | "ffprobe") => {
  const env = process.env[nome === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH"];
  if (env) return env;
  if (nome === "ffmpeg") {
    try {
      const p = require("ffmpeg-static") as string | null;
      if (p && existsSync(p)) return p;
    } catch {
      /* sem ffmpeg-static */
    }
    return "ffmpeg";
  }
  const pacotes: Record<string, string[]> = {
    win32: ["@remotion/compositor-win32-x64-msvc"],
    darwin: ["@remotion/compositor-darwin-arm64", "@remotion/compositor-darwin-x64"],
    linux: ["@remotion/compositor-linux-x64-gnu", "@remotion/compositor-linux-arm64-gnu", "@remotion/compositor-linux-x64-musl"],
  };
  for (const p of pacotes[process.platform] ?? []) {
    try {
      const dir = path.dirname(require.resolve(`${p}/package.json`));
      const exe = path.join(dir, process.platform === "win32" ? `${nome}.exe` : nome);
      if (existsSync(exe)) return exe;
    } catch {
      /* tenta o próximo */
    }
  }
  return nome; // cai para o que estiver no PATH
};
export const FFMPEG = binario("ffmpeg");
export const FFPROBE = binario("ffprobe");

export const rodar = (cmd: string, args: string[], opts: { silencioso?: boolean; cwd?: string; aoVivo?: boolean; env?: Record<string, string | undefined> } = {}) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const dir = path.dirname(cmd);
    const env = { ...process.env, ...opts.env };
    // as libs do ffmpeg do Remotion ficam na mesma pasta do binário
    if (path.isAbsolute(cmd) && process.platform !== "win32") {
      env.LD_LIBRARY_PATH = [dir, env.LD_LIBRARY_PATH].filter(Boolean).join(":");
      env.DYLD_LIBRARY_PATH = [dir, env.DYLD_LIBRARY_PATH].filter(Boolean).join(":");
    }
    const p = spawn(cmd, args, { env, windowsHide: true, cwd: opts.cwd });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => {
      stdout += d;
      if (opts.aoVivo) process.stdout.write(d);
    });
    p.stderr.on("data", (d) => {
      stderr += d;
      if (opts.aoVivo || (!opts.silencioso && process.env.DEBUG)) process.stderr.write(d);
    });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${path.basename(cmd)} saiu com código ${code}\n${stderr.slice(-2000)}`)),
    );
  });

export type InfoMidia = {
  duracao: number;
  largura?: number;
  altura?: number;
  fps?: number;
  temAudio: boolean;
  codec?: string;
  rotacao?: number;
};

export const sondar = async (arquivo: string): Promise<InfoMidia> => {
  const { stdout } = await rodar(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", arquivo]);
  const j = JSON.parse(stdout);
  const v = j.streams.find((s: { codec_type: string }) => s.codec_type === "video");
  const a = j.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
  const [n, d] = (v?.avg_frame_rate ?? "0/1").split("/").map(Number);
  const rot = Number(v?.side_data_list?.find((s: { rotation?: number }) => s.rotation !== undefined)?.rotation ?? v?.tags?.rotate ?? 0);
  let largura = v?.width;
  let altura = v?.height;
  if (Math.abs(rot) === 90) [largura, altura] = [altura, largura];
  return {
    duracao: Number(j.format.duration ?? v?.duration ?? 0),
    largura,
    altura,
    fps: d ? Math.round((n / d) * 100) / 100 : undefined,
    temAudio: Boolean(a),
    codec: v?.codec_name,
    rotacao: rot || undefined,
  };
};

export const garantirPasta = (p: string) => {
  mkdirSync(p, { recursive: true });
  return p;
};

/** Caminho relativo a workspace/, sempre com "/" (é o que o Remotion usa) */
export const relWorkspace = (abs: string) => path.relative(WORKSPACE, abs).split(path.sep).join("/");

export const pastaCriativo = (nome: string) => path.join(CRIATIVOS, nome);
export const arquivoCriativo = (nome: string) => path.join(pastaCriativo(nome), "criativo.json");

export const lerCriativo = (nome: string) => {
  const arq = arquivoCriativo(nome);
  if (!existsSync(arq)) throw new Error(`Criativo "${nome}" não existe (${arq}). Use: npm run novo -- ${nome}`);
  return JSON.parse(readFileSync(arq, "utf8"));
};

export const salvarCriativo = (nome: string, dados: unknown) =>
  writeFileSync(arquivoCriativo(nome), JSON.stringify(dados, null, 2) + "\n");

export const validarNome = (nome: string | undefined) => {
  if (!nome || !/^[a-z0-9-]+$/.test(nome)) {
    throw new Error(`Nome inválido: "${nome ?? ""}". Use só letras minúsculas, números e hífen (ex.: tabua-v1).`);
  }
  return nome;
};

export const fmt = (s: number) => s.toFixed(2).padStart(6, "0");

export const principal = (fn: () => Promise<void>) =>
  fn().catch((e) => {
    console.error(`\n✖ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
