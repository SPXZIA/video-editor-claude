/**
 * Cria um criativo novo a partir dos clipes de uma pasta.
 *   npm run novo -- <nome> [--clipes <pasta em workspace/clipes>] [--formato 9:16]
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { CLIPES, VIDEO_EXT, IMAGEM_EXT, arquivoCriativo, garantirPasta, pastaCriativo, principal, relWorkspace, salvarCriativo, sondar, validarNome } from "./lib/comum";

principal(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { clipes: { type: "string" }, formato: { type: "string", default: "9:16" }, forcar: { type: "boolean", default: false } },
  });
  const nome = validarNome(positionals[0]);
  if (existsSync(arquivoCriativo(nome)) && !values.forcar) throw new Error(`"${nome}" já existe. Use --forcar para sobrescrever.`);
  garantirPasta(path.join(pastaCriativo(nome), "saida"));

  const cenas = [];
  if (values.clipes) {
    const pasta = path.join(CLIPES, values.clipes);
    if (!existsSync(pasta)) throw new Error(`Pasta não encontrada: ${pasta}`);
    const arquivos = readdirSync(pasta).filter((f) => VIDEO_EXT.test(f) || IMAGEM_EXT.test(f)).sort();
    const transicoes = ["zoom", "whip", "flash", "slide-esquerda", "blur"];
    for (const [i, f] of arquivos.entries()) {
      const abs = path.join(pasta, f);
      const dur = VIDEO_EXT.test(f) ? (await sondar(abs)).duracao : 3;
      cenas.push({
        clipe: relWorkspace(abs),
        inicio: 0,
        fim: Math.min(dur, 2.5),
        movimento: i === 0 ? "punch" : "zoom-in",
        transicao: i === arquivos.length - 1 ? "corte" : transicoes[i % transicoes.length],
        beat: i === 0 ? "hook" : i === arquivos.length - 1 ? "cta" : "body",
      });
    }
  }
  if (cenas.length === 0) cenas.push({ clipe: "clipes/SUA-PASTA/clipe.mp4", inicio: 0, fim: 3 });

  salvarCriativo(nome, {
    nome,
    formato: values.formato,
    fps: 30,
    copy: { hook: "", body: "", cta: "" },
    cenas,
    legenda: { ativa: true, template: "hormozi", posicao: "baixo", palavras: [], enfase: [] },
    textos: [],
  });
  writeFileSync(path.join(pastaCriativo(nome), "copy.md"), `# Copies — ${nome}\n\n(Opções de hook / body / CTA ficam aqui.)\n`);
  console.log(`✓ Criado ${path.relative(process.cwd(), arquivoCriativo(nome))} com ${cenas.length} cena(s).`);
});
