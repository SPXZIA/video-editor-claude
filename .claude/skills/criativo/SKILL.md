---
name: criativo
description: Fazer um criativo de anúncio em vídeo (Reels/TikTok/Meta) a partir de uma pasta de clipes - analisar clipes, escrever copies hook/body/CTA, montar, narrar, legendar, renderizar e conferir. Use quando o usuário pedir um criativo, vídeo de anúncio, variações ou edição dos clipes.
---

# Criativo

Siga o fluxo de 7 passos do `CLAUDE.md` na raiz do projeto (inventário → copy → plano → montagem →
render → conferência → entrega). Pontos que não podem faltar:

1. Rode `npm run analisar -- <pasta>` e **olhe** as folhas de contato antes de escrever qualquer copy.
2. Entregue 3–5 opções de copy (hook/body/CTA) em `copy.md` e espere o usuário escolher.
3. Confirme o plano em poucas frases antes de renderizar.
4. Sempre rode `npm run conferir -- <nome>` e olhe `conferencia.jpg` antes de dizer que está pronto.
5. Para variações, copie a pasta do criativo com outro nome (`<nome>-v2`) e mude só o necessário.

Exemplo mínimo de `criativo.json`: `workspace/criativos/exemplo/criativo.json`.
