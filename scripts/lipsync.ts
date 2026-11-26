/**
 * Lipsync: usa um vídeo de avatar/apresentador já sincronizado com a narração como trilha principal.
 *   npm run lipsync -- <criativo> <video> [--audio-do-video]
 * Fluxo: 1) npm run narrar -- <criativo>   (gera narracao.mp3 com pausas apertadas + legenda)
 *        2) gere o vídeo com lipsync a partir de narracao.mp3 + foto/vídeo do avatar
 *           (ElevenLabs, HeyGen, Hedra, Sync etc.) e salve em workspace/clipes/<pasta>/
 *        3) npm run lipsync -- <criativo> clipes/<pasta>/avatar.mp4
 * Por padrão o som vem da narracao.mp3 (mesma faixa usada no lipsync, legenda continua exata)
 * e o vídeo entra mudo. Com --audio-do-video, usa o som do próprio vídeo.
 * Depois: corte para b-roll com "sobreposicoes" (tela-cheia, pip, metade-cima/baixo).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { WORKSPACE, lerCriativo, principal, relWorkspace, salvarCriativo, sondar, validarNome } from "./lib/comum";

principal(async () => {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { "audio-do-video": { type: "boolean", default: false } } });
  const nome = validarNome(positionals[0]);
  const arg = positionals[1];
  if (!arg) throw new Error("Informe o vídeo do avatar. Ex.: npm run lipsync -- meu-criativo clipes/avatar/fala.mp4");
  const abs = existsSync(arg) ? path.resolve(arg) : path.join(WORKSPACE, arg);
  if (!existsSync(abs)) throw new Error(`Vídeo não encontrado: ${arg}`);
  const c = lerCriativo(nome);
  const info = await sondar(abs);
  const ini = c.narracao?.inicio ?? 0;
  c.cenas = [{ clipe: relWorkspace(abs), inicio: 0, fim: +info.duracao.toFixed(3), volume: values["audio-do-video"] ? 1 : 0, transicao: "corte", movimento: "nenhum", beat: "aroll" }];
  if (values["audio-do-video"]) delete c.narracao;
  else if (!c.narracao) console.log("⚠ Sem narração no criativo: o vídeo vai ficar mudo. Use --audio-do-video ou rode npm run narrar antes.");
  if (ini) console.log(`ℹ A narração começa em ${ini}s; confira se o lipsync também começa nesse ponto.`);
  c.sobreposicoes = c.sobreposicoes ?? [];
  salvarCriativo(nome, c);
  console.log(`✓ A-roll: ${path.basename(abs)} (${info.duracao.toFixed(1)}s). Agora coloque b-roll em "sobreposicoes".`);
});
