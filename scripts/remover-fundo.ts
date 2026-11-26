/**
 * Remove o fundo de um vídeo de pessoa/avatar (HeyGen, UGC) e gera um .webm transparente com o áudio.
 *   npm run remover-fundo -- <video> [--metodo auto|cor|ia] [--cor 00ff00] [--largura 720] [--suavizar 0.35]
 * Métodos:
 *   cor → fundo liso (tela verde, parede de uma cor): chroma key do ffmpeg, rapidíssimo
 *   ia  → qualquer fundo: recorte de pessoa com IA (MODNet) rodando no seu PC, grátis.
 *         Na primeira vez baixa o modelo (~25 MB). Leva ~0,1–0,4 s por quadro.
 *   auto (padrão) → olha as bordas do vídeo: se forem de uma cor só, usa "cor"; senão "ia".
 * Saída: <video>-sem-fundo.webm ao lado do original. Use com:
 *   npm run formato -- <criativo> ugc --avatar <saida.webm> --transparente --voz-do-avatar
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { FFMPEG, WORKSPACE, principal, rodar, sondar } from "./lib/comum";

const lerQuadrosRaw = (arq: string, larg: number, alt: number, n: number, dur: number) =>
  new Promise<Buffer>((resolve, reject) => {
    const p = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-i", arq, "-vf", `fps=${n / Math.max(dur, 0.5)},scale=${larg}:${alt}`, "-frames:v", String(n), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { windowsHide: true });
    const partes: Buffer[] = [];
    p.stdout.on("data", (d) => partes.push(d));
    p.on("error", reject);
    p.on("close", () => resolve(Buffer.concat(partes)));
  });

/** Fundo liso? Compara a cor média de faixas nas bordas de cima e dos lados. */
const detectarCor = async (arq: string, dur: number) => {
  const W = 90, H = 160, N = 3;
  const raw = await lerQuadrosRaw(arq, W, H, N, dur);
  const regioes = [
    [0, 0, 15, 15], [W - 15, 0, W, 15], [0, 40, 8, 100], [W - 8, 40, W, 100], [30, 0, 60, 8],
  ];
  const medias: number[][] = [];
  let desvio = 0;
  for (let f = 0; f < N; f++) {
    for (const [x0, y0, x1, y1] of regioes) {
      const px: number[][] = [];
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (f * W * H + y * W + x) * 3;
          if (i + 2 < raw.length) px.push([raw[i], raw[i + 1], raw[i + 2]]);
        }
      if (!px.length) continue;
      const m = [0, 1, 2].map((c) => px.reduce((s, p) => s + p[c], 0) / px.length);
      desvio = Math.max(desvio, Math.sqrt(px.reduce((s, p) => s + (p[0] - m[0]) ** 2 + (p[1] - m[1]) ** 2 + (p[2] - m[2]) ** 2, 0) / px.length));
      medias.push(m);
    }
  }
  const geral = [0, 1, 2].map((c) => medias.reduce((s, m) => s + m[c], 0) / medias.length);
  const espalhamento = Math.max(...medias.map((m) => Math.hypot(m[0] - geral[0], m[1] - geral[1], m[2] - geral[2])));
  const hex = geral.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  return { liso: espalhamento < 22 && desvio < 18, hex, espalhamento, desvio };
};

const porCor = async (arq: string, saida: string, hex: string, largura?: number) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const verde = g > r * 1.3 && g > b * 1.3;
  const azul = b > r * 1.3 && b > g * 1.1;
  const filtros = [
    largura ? `scale=${largura}:-2` : "",
    `chromakey=color=0x${hex}:similarity=0.13:blend=0.07`,
    verde ? "despill=type=green" : azul ? "despill=type=blue" : "",
    "format=yuva420p",
  ].filter(Boolean);
  await rodar(FFMPEG, ["-y", "-hide_banner", "-i", arq, "-vf", filtros.join(","), "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", "-auto-alt-ref", "0", "-c:a", "libopus", "-b:a", "128k", saida]);
};

const porIA = async (arq: string, saida: string, largura: number, altura: number, fps: number, suavizar: number, totalQuadros: number) => {
  const { AutoModel, AutoProcessor, RawImage, env } = await import("@huggingface/transformers");
  env.cacheDir = path.resolve(process.cwd(), ".cache", "modelos");
  console.log("⏳ Carregando o modelo de recorte (MODNet)…");
  const model = await AutoModel.from_pretrained("Xenova/modnet", { dtype: "fp32" });
  const processor = await AutoProcessor.from_pretrained("Xenova/modnet");

  const entrada = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-i", arq, "-vf", `scale=${largura}:${altura}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { windowsHide: true });
  const saidaProc = spawn(FFMPEG, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${largura}x${altura}`, "-r", String(fps), "-i", "-",
    "-i", arq, "-map", "0:v", "-map", "1:a?",
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", "-auto-alt-ref", "0",
    "-c:a", "libopus", "-b:a", "128k", "-shortest", saida,
  ], { windowsHide: true });
  let erroSaida = "";
  saidaProc.stderr.on("data", (d) => (erroSaida += d));
  const fim = new Promise<void>((resolve, reject) => {
    saidaProc.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg (saída) falhou: ${erroSaida.slice(-1500)}`))));
  });

  const tam = largura * altura * 3;
  let buffer = Buffer.alloc(0);
  let anterior: Float32Array | null = null;
  let feitos = 0;
  const t0 = Date.now();

  const processar = async (quadro: Buffer) => {
    const img = new RawImage(new Uint8ClampedArray(quadro), largura, altura, 3);
    const { pixel_values } = await processor(img);
    const { output } = await model({ input: pixel_values });
    const mascara = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(largura, altura);
    const m = mascara.data;
    const alpha = new Float32Array(largura * altura);
    for (let i = 0; i < alpha.length; i++) {
      const v = m[i] / 255;
      alpha[i] = anterior ? anterior[i] * suavizar + v * (1 - suavizar) : v;
    }
    anterior = alpha;
    const rgba = Buffer.alloc(largura * altura * 4);
    for (let i = 0, j = 0; i < alpha.length; i++, j += 3) {
      rgba[i * 4] = quadro[j];
      rgba[i * 4 + 1] = quadro[j + 1];
      rgba[i * 4 + 2] = quadro[j + 2];
      // curva para bordas mais firmes
      const a = Math.min(1, Math.max(0, (alpha[i] - 0.08) / 0.84));
      rgba[i * 4 + 3] = Math.round(a * 255);
    }
    if (!saidaProc.stdin.write(rgba)) await new Promise((r) => saidaProc.stdin.once("drain", r));
    feitos++;
    if (feitos % 30 === 0 || feitos === totalQuadros) {
      const s = (Date.now() - t0) / 1000;
      const resta = totalQuadros > feitos ? ((totalQuadros - feitos) * s) / feitos : 0;
      process.stdout.write(`  ${feitos}/${totalQuadros} quadros (${(s / feitos).toFixed(2)} s/quadro, falta ~${Math.ceil(resta / 60)} min)\n`);
    }
  };

  await new Promise<void>((resolve, reject) => {
    let fila = Promise.resolve();
    entrada.stdout.on("data", (d: Buffer) => {
      buffer = Buffer.concat([buffer, d]);
      while (buffer.length >= tam) {
        const quadro = Buffer.from(buffer.subarray(0, tam));
        buffer = buffer.subarray(tam);
        entrada.stdout.pause();
        fila = fila.then(() => processar(quadro)).then(() => void entrada.stdout.resume(), reject);
      }
    });
    entrada.on("error", reject);
    entrada.on("close", () => fila.then(() => resolve(), reject));
  });
  saidaProc.stdin.end();
  await fim;
};

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      metodo: { type: "string", default: "auto" },
      cor: { type: "string" },
      largura: { type: "string" },
      suavizar: { type: "string", default: "0.35" },
    },
  });
  const arg = positionals[0];
  if (!arg) throw new Error("Informe o vídeo. Ex.: npm run remover-fundo -- clipes/tabuas/UGC.mp4");
  const arq = existsSync(arg) ? path.resolve(arg) : path.join(WORKSPACE, arg);
  if (!existsSync(arq)) throw new Error(`Vídeo não encontrado: ${arg}`);
  const info = await sondar(arq);
  const saida = arq.replace(/\.[^.]+$/, "") + "-sem-fundo.webm";

  let metodo = values.metodo;
  let hex = values.cor?.replace(/^#|^0x/, "");
  if (metodo === "auto" || (metodo === "cor" && !hex)) {
    const d = await detectarCor(arq, info.duracao);
    console.log(`ℹ Bordas: cor média #${d.hex}, variação ${d.espalhamento.toFixed(0)}/${d.desvio.toFixed(0)} → ${d.liso ? "fundo liso" : "fundo comum"}`);
    if (metodo === "auto") metodo = d.liso ? "cor" : "ia";
    hex = hex ?? d.hex;
  }

  const largura = values.largura ? Number(values.largura) : Math.min(info.largura ?? 720, 1080);
  const altura = Math.round(((info.altura ?? 1280) / (info.largura ?? 720)) * largura / 2) * 2;
  const t0 = Date.now();
  if (metodo === "cor") {
    console.log(`⏳ Removendo fundo por cor (#${hex})…`);
    await porCor(arq, saida, hex!, values.largura ? largura : undefined);
  } else {
    const total = Math.round(info.duracao * (info.fps ?? 30));
    console.log(`⏳ Removendo fundo com IA: ${total} quadros em ${largura}x${altura}…`);
    await porIA(arq, saida, largura, altura, info.fps ?? 30, Number(values.suavizar), total);
  }
  console.log(`✓ ${path.relative(process.cwd(), saida)} (${((Date.now() - t0) / 1000).toFixed(0)} s, método ${metodo})`);
});
