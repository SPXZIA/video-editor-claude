/**
 * Instala a skill "criativo" no Claude Code do usuário (~/.claude/skills/criativo), para poder abrir
 * o `claude` em QUALQUER pasta (ex.: Downloads\arquivos) e pedir "monta um criativo UGC com esses arquivos".
 *   npm run instalar-skill
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { RAIZ, principal } from "./lib/comum";

principal(async () => {
  const modelo = readFileSync(path.join(RAIZ, "extras", "skill-global", "SKILL.md"), "utf8");
  const editor = RAIZ.split(path.sep).join("/");
  const destino = path.join(os.homedir(), ".claude", "skills", "criativo");
  mkdirSync(destino, { recursive: true });
  writeFileSync(path.join(destino, "SKILL.md"), modelo.replaceAll("{{EDITOR}}", editor));
  console.log(`✓ Skill instalada em ${destino}`);
  console.log(`  Agora abra o Claude em qualquer pasta e peça: "use esses arquivos pra montar um criativo no formato UGC"`);
});
