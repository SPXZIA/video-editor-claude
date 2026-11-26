# Editor de criativos — guia para o Claude

Este projeto é um editor de vídeo local que **você (Claude) controla** para fazer criativos de anúncio
(Reels, TikTok, Meta Ads). O usuário fala português do Brasil: responda sempre em PT-BR.
O usuário roda no **Windows**; use caminhos com `/` nos JSON e `npm run …` nos comandos.

Cada criativo é um arquivo `workspace/criativos/<nome>/criativo.json`. Você edita o JSON,
o Remotion renderiza. O formato completo (com comentários) está em `src/schema.ts`.

## Fluxo de um criativo (siga nesta ordem)

1. **Inventário.** `npm run analisar -- <pasta>` (pasta dentro de `workspace/clipes/`).
   Leia `workspace/clipes/<pasta>/_analise/inventario.md` e **olhe as folhas de contato** (`.jpg`)
   para entender o que tem em cada clipe (produto, mãos, close, ambiente, momentos fortes).
   Clipes sem fala são normais (b-roll de produto). Use `--transcrever` se houver fala.
2. **Copy.** Escreva 3 a 5 opções em `workspace/criativos/<nome>/copy.md`, cada uma com
   **Hook** (≤ 2 s falado, quebra o scroll), **Body** (benefício + prova, 6–15 s) e **CTA** (1 ação clara).
   Varie o ângulo: dor, curiosidade, prova social, oferta, comparação. Mostre ao usuário e **espere ele escolher**.
3. **Plano.** Em 4–6 frases: qual clipe cobre cada beat, transições, template de legenda, música (clima),
   textos na tela, duração alvo (15–30 s). Espere o OK.
4. **Montagem.** `npm run novo -- <nome> --clipes <pasta>` cria o esqueleto. Edite o `criativo.json`:
   - `copy`: a copy escolhida.
   - `cenas`: trechos (`inicio`/`fim` em segundos do clipe), `movimento`, `transicao`, `beat`.
   - Voz: `npm run narrar -- <nome> --ajustar` gera a narração com a ElevenLabs, grava a legenda
     sincronizada e estica as cenas para a duração da fala. Sem narração, escreva `legenda.palavras`
     à mão (texto aparecendo no ritmo) ou use só `textos`.
   - Voz real do usuário: `npm run transcrever -- <arquivo> --criativo <nome>` (Whisper local, grátis).
   - `musica`: escolha em `workspace/musicas/indice.md` (rode `npm run musicas` antes).
   - `textos`: gancho visual no início (`hook`), `cta` no final, `preco`/`etiqueta` quando houver oferta.
5. **Render.** `npm run render -- <nome> --preview` (rápido) e depois `npm run render -- <nome>`.
6. **Conferência (obrigatória antes de mostrar).** `npm run conferir -- <nome>` e **olhe**
   `saida/conferencia.jpg`. Cheque: legenda legível e dentro da tela, texto não cobre o produto,
   nenhum quadro preto/congelado, transições limpas, volume entre -16 e -12 LUFS.
   Corrija e renderize de novo (no máximo 3 voltas; se sobrar problema, diga qual).
7. **Entrega.** Diga onde está o MP4 (`workspace/criativos/<nome>/saida/<nome>.mp4`) e ofereça variações
   (outro hook, outro template de legenda, outra música). Variação = copiar a pasta com outro nome e mudar o JSON.

## Regras de edição para anúncio

- **Primeiros 1,5 s decidem tudo:** a cena 1 tem que ser o plano mais forte, com `movimento: "punch"`
  e texto `hook` na tela. Nada de abertura lenta ou logo no começo.
- Cortes rápidos: cenas de **0,8 a 2,5 s**. Troque de plano a cada frase da narração.
- Transição não é enfeite: use `corte` na maior parte; `whip`/`zoom`/`flash` em 2–3 viradas importantes.
- Legenda padrão: `hormozi`, posição `baixo` (fica acima da interface do app). Coloque em `legenda.enfase`
  as palavras de impacto (preço, "grátis", benefício principal).
- **Clipes baixados (TikTok etc.):** use só trechos sem legenda/texto por cima e sem marca d'água.
  Se a marca d'água ficar num canto o tempo todo, use `enquadramento` ({ zoom: 1.2–1.35, x, y }) para cortá-la
  e confira no quadro. Áudio original sempre mudo (`volume: 0`, é o padrão).
- Mostre o produto em uso. Se repetir um clipe, use outro trecho ou `espelhar: true`.
- O CTA final fica pelo menos 2 s na tela.
- Música: `volume` 0.3–0.4 sem voz, `volumeComVoz` 0.08–0.15 (o ducking é automático).
- Formato padrão 9:16. Para feed, 4:5. Mesmo JSON, só troque `formato`.

## Referência rápida

| Campo | Valores |
|---|---|
| `transicao` | corte, fade, slide-esquerda, slide-direita, slide-cima, wipe, zoom, whip, flash, blur, giro |
| `movimento` | nenhum, zoom-in, zoom-out, pan-esquerda, pan-direita, punch, tremor |
| `legenda.template` | hormozi, tiktok, caixa, karaoke, neon, uma-palavra, minimal |
| `textos[].estilo` | hook, cta, etiqueta, preco, titulo |

- Tempos de `legenda.palavras` e `textos` são no **timeline final** do criativo.
  Tempos de `cenas[].inicio/fim` são do **clipe original**. Transições sobrepõem as cenas
  (cada transição encurta o total em `duracaoTransicao`).
- Preview ao vivo: `npm run studio` abre `http://localhost:3000`; alterar o JSON atualiza na hora.
  A composição `modelos-de-legenda` mostra todos os templates.
- Mídia do usuário (clipes, músicas, criativos) não vai para o git.
- Nunca coloque chaves de API no código nem no chat; elas ficam no `.env` do usuário.
- Crédito: a ideia de "ler o vídeo por texto + conferir os quadros antes de entregar" vem do
  [video-use](https://github.com/browser-use/video-use) (MIT).
