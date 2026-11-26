---
name: criativo
description: Montar um criativo de anúncio em vídeo (UGC, tela dividida, entregável) com os arquivos da pasta atual usando o Editor de Criativos local. Use quando o usuário pedir criativo, anúncio, UGC, tela dividida, entregável, legenda ou edição de vídeos de qualquer pasta.
---

# Criativo (de qualquer pasta)

O editor fica em: `{{EDITOR}}`

1. Leia `{{EDITOR}}/CLAUDE.md` inteiro antes de qualquer coisa: lá estão o fluxo, os formatos
   (UGC, tela dividida, entregável), as regras de legenda, de marca d'água e de copy. Siga-o à risca.
2. Escolha um nome curto para o trabalho (minúsculas e hífen, ex.: `tabuas-natal`) e **copie** os arquivos
   da pasta atual (onde o usuário abriu o Claude) para o editor, sem apagar os originais:
   - vídeos de produto / b-roll → `{{EDITOR}}/workspace/clipes/<nome>/`
   - vídeo de avatar/UGC (pessoa falando, HeyGen) → `{{EDITOR}}/workspace/clipes/<nome>/avatar/`
   - gravação de tela do entregável (PDF, aplicativo) → `{{EDITOR}}/workspace/clipes/<nome>/entregavel/`
     (pergunte "em que frase o entregável começa?" se o usuário não disse)
   - músicas → `{{EDITOR}}/workspace/musicas/<clima>/` e rode `npm run musicas`
   Na dúvida sobre o que é cada arquivo, olhe (extraia um quadro) antes de perguntar.
3. Rode todos os comandos `npm run …` **dentro de `{{EDITOR}}`** (ex.: `cd "{{EDITOR}}" && npm run analisar -- <nome> --quadros`).
4. No fim, copie o MP4 final para a pasta atual do usuário também (além de `{{EDITOR}}/entregas/`) e diga onde está.
