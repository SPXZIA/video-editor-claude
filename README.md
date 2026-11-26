# Editor de criativos (controlado pelo Claude)

Editor de vídeo local para fazer criativos de anúncio. Você joga os clipes numa pasta,
conversa com o Claude Code, e ele escreve as copies, monta a edição com transições,
legenda animada e música, renderiza o MP4 e confere o resultado antes de te entregar.

- **Motor:** [Remotion](https://www.remotion.dev) (React). Preview em `http://localhost:3000`.
- **Legenda automática PT-BR:** Whisper local (grátis) ou ElevenLabs Scribe, com 7 templates animados.
- **Narração por IA:** ElevenLabs, com legenda sincronizada palavra por palavra.
- **Transições:** corte, fade, slide, wipe, zoom, whip, flash, blur, giro.
- **Músicas:** biblioteca local por clima, com abaixamento automático quando tem voz.
- **Formatos:** 9:16, 4:5, 1:1, 16:9.

## Instalação (Windows)

1. Instale o **Node.js 20 ou mais novo** (LTS): https://nodejs.org
2. Instale o **Git**: https://git-scm.com/download/win
3. No PowerShell:

   ```powershell
   git clone https://github.com/SPXZIA/video-editor-claude.git
   cd video-editor-claude
   npm install
   copy .env.example .env
   ```

4. (Opcional) Abra o `.env` no Bloco de Notas e cole sua chave da ElevenLabs para usar narração por IA.
5. Teste: `npm run exemplo` e depois `npm run render -- exemplo`.
   O vídeo sai em `workspace\criativos\exemplo\saida\exemplo.mp4`.

Não precisa instalar ffmpeg nem Python: vem tudo pelo `npm install`. Na primeira vez,
o render baixa um Chrome próprio (~100 MB) e a transcrição baixa o Whisper (~1,5 GB no modelo médio).

## Como usar com o Claude

1. Salve os vídeos em `workspace\clipes\<nome-da-pasta>\` (ex.: `workspace\clipes\tabuas\`).
2. Abra o Claude Code na pasta do projeto (`claude`) e peça, por exemplo:
   > Faz um criativo de 20 segundos com os clipes da pasta tabuas. Me dá 3 opções de copy primeiro.
3. O Claude analisa os clipes, mostra as copies, você escolhe, ele monta e renderiza.
4. Para ver/ajustar ao vivo: `npm run studio` e abra http://localhost:3000.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run studio` | Abre o editor/preview em localhost:3000 |
| `npm run analisar -- <pasta> [--quadros]` | Inventário dos clipes + folhas de contato (e grade a cada 0,5 s) |
| `npm run novo -- <nome> --clipes <pasta>` | Cria um criativo novo |
| `npm run narrar -- <nome> --ajustar` | Narração por IA + legenda sincronizada |
| `npm run transcrever -- <arquivo> --criativo <nome>` | Legenda de uma voz gravada (Whisper local) |
| `npm run apertar -- <nome>` | Aperta pausas longas de uma narração já gerada (sem gastar crédito) |
| `npm run ugc -- <nome> <video...>` | UGC: corta silêncios/vícios da fala e gera cenas + legenda |
| `npm run lipsync -- <nome> <video>` | Usa um vídeo de avatar com lipsync como trilha principal |
| `npm run formato -- <nome> <formato> --avatar <video>` | UGC, tela dividida, entregável e combinações (avatar HeyGen, esconde marca d'água) |
| `npm run apertar-video -- <video>` | Corta as pausas de um vídeo falado (vídeo + áudio + legenda) |
| `npm run remover-fundo -- <video>` | Tira o fundo do avatar (tela verde ou IA local) e gera .webm transparente |
| `npm run vozes` | Lista as vozes da sua conta ElevenLabs |
| `npm run musicas` | Indexa a biblioteca de músicas |
| `npm run render -- <nome> [--preview]` | Renderiza o MP4 (áudio normalizado em -14 LUFS) |
| `npm run conferir -- <nome>` | Tira quadros das transições e mede o volume |

## Pastas

```
workspace/
  clipes/<pasta>/        seus vídeos brutos (não vão pro git)
  musicas/<clima>/       suas músicas (veja musicas/LEIA-ME.md)
  criativos/<nome>/      criativo.json, copy.md, narração e saida/<nome>.mp4
  fontes/                fontes das legendas
src/                     composição Remotion (cenas, transições, legendas, textos)
scripts/                 comandos acima
```

## Licenças

- Remotion é grátis para pessoa física e empresas com até 3 funcionários; acima disso precisa de
  [licença da empresa](https://www.remotion.pro/license).
- Fontes: Google Fonts (OFL). Ideia de conferência por quadros inspirada no
  [video-use](https://github.com/browser-use/video-use) (MIT).
