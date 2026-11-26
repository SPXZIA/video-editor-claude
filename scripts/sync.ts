/** Gera src/gerado/criativos.ts com todos os criativos de workspace/criativos/ (o Studio recarrega sozinho). */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CRIATIVOS, RAIZ, garantirPasta } from "./lib/comum";

const nomes = existsSync(CRIATIVOS)
  ? readdirSync(CRIATIVOS, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^[a-z0-9-]+$/.test(d.name) && existsSync(path.join(CRIATIVOS, d.name, "criativo.json")))
      .map((d) => d.name)
      .sort()
  : [];

const linhas = [
  "// Gerado por `npm run sync`. Não edite à mão.",
  ...nomes.map((n, i) => `import c${i} from "../../workspace/criativos/${n}/criativo.json";`),
  "",
  `export const CRIATIVOS: { id: string; props: unknown }[] = [`,
  ...nomes.map((n, i) => `  { id: ${JSON.stringify(n)}, props: c${i} },`),
  "];",
  "",
];
writeFileSync(path.join(garantirPasta(path.join(RAIZ, "src", "gerado")), "criativos.ts"), linhas.join("\n"));
console.log(`✓ ${nomes.length} criativo(s): ${nomes.join(", ") || "(nenhum)"}`);
