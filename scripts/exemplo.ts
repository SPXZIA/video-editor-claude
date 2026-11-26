/**
 * Gera mídia de teste (clipes coloridos + batida) para conferir se tudo funciona.
 *   npm run exemplo   e depois   npm run render -- exemplo
 */
import path from "node:path";
import { CLIPES, FFMPEG, MUSICAS, garantirPasta, principal, rodar } from "./lib/comum";

const CORES = [
  ["0x3b2314", "0xc8915a"],
  ["0x1d2b38", "0x6fa3c7"],
  ["0x40210f", "0xe0b27a"],
  ["0x162a1c", "0x7cc48f"],
];

principal(async () => {
  const dirClipes = garantirPasta(path.join(CLIPES, "exemplo"));
  for (const [i, [a, b]] of CORES.entries()) {
    const saida = path.join(dirClipes, `clipe-${i + 1}.mp4`);
    await rodar(FFMPEG, [
      "-y", "-hide_banner",
      "-f", "lavfi", "-i", `gradients=s=1080x1920:c0=${a}:c1=${b}:x0=0:y0=0:x1=1080:y1=1920:speed=0.03:d=4:r=30`,
      "-f", "lavfi", "-i", `testsrc2=s=360x360:d=4:r=30`,
      "-filter_complex", `[1]format=yuv420p,rotate=${0.2 * (i + 1)}*t:c=none:ow=hypot(iw\\,ih):oh=ow[o];[0][o]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-t", "4", saida,
    ]);
    console.log(`✓ ${path.relative(process.cwd(), saida)}`);
  }
  const dirMus = garantirPasta(path.join(MUSICAS, "exemplo"));
  const mus = path.join(dirMus, "batida-teste.mp3");
  // batida simples a 120 BPM: bumbo + chimbal + acorde
  const expr =
    "0.6*sin(2*PI*55*t)*exp(-14*mod(t,0.5))" +
    "+0.08*sin(2*PI*8000*t+sin(2*PI*1234*t))*exp(-40*mod(t+0.25,0.5))" +
    "+0.07*(sin(2*PI*220*t)+sin(2*PI*277.18*t)+sin(2*PI*329.63*t))";
  await rodar(FFMPEG, ["-y", "-hide_banner", "-f", "lavfi", "-i", `aevalsrc='${expr}':s=44100:d=30`, "-c:a", "libmp3lame", "-b:a", "160k", mus]);
  console.log(`✓ ${path.relative(process.cwd(), mus)}`);
  console.log("\nAgora: npm run studio  (preview)  ou  npm run render -- exemplo");
});
