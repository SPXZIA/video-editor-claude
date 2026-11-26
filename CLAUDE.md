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
   - O `narrar` já **aperta as pausas** da IA (máx. 0,08 s entre palavras, 0,14 s em vírgula, 0,22 s entre
     frases) e guarda o original em `narracao-bruta.mp3`. Se ainda ficar lento/corrido, ajuste sem gastar
     crédito: `npm run apertar -- <nome> --pausa-frase 0.3` (e depois re-cronometre `textos` e cenas).
   - Voz real do usuário: `npm run transcrever -- <arquivo> --criativo <nome>` (Whisper local, grátis).
   - `musica`: escolha em `workspace/musicas/indice.md` (rode `npm run musicas` antes).
   - `textos`: só o `cta` no final (sem headline/título de hook — preferência do Jean).
5. **Render.** `npm run render -- <nome> --preview` (rápido) e depois `npm run render -- <nome>`.
6. **Conferência (obrigatória antes de mostrar).** `npm run conferir -- <nome>` e **olhe**
   `saida/conferencia.jpg`. Cheque: legenda legível e dentro da tela, texto não cobre o produto,
   nenhum quadro preto/congelado, transições limpas, volume entre -16 e -12 LUFS.
   Corrija e renderize de novo (no máximo 3 voltas; se sobrar problema, diga qual).
7. **Entrega.** Diga onde está o MP4 (`workspace/criativos/<nome>/saida/<nome>.mp4`) e ofereça variações
   (outro hook, outro template de legenda, outra música). Variação = copiar a pasta com outro nome e mudar o JSON.

## Formatos de criativo do Jean (os preferidos)

| Formato | Como fica | Comando |
|---|---|---|
| **UGC** | vídeos do produto de fundo + avatar grande centralizado embaixo no hook; depois do hook o avatar vai (animado) para o canto inferior direito | `npm run formato -- <nome> ugc --avatar <video>` |
| **Tela dividida** | avatar na metade de cima, produto na metade de baixo, legenda na linha do meio. Normalmente **só no hook** | `dividida+entregavel` ou `dividida+ugc` |
| **Entregável** | só os vídeos do produto, sem avatar | `npm run formato -- <nome> entregavel` |

Também: `dividida` (o vídeo todo), `ugc+entregavel`. O fim do hook é o fim da 1ª frase da legenda (ou `--hook 2.5`).
Ajuste fino no `criativo.json` → `avatar` (`momentos`, `larguraCentro`, `larguraCanto`, `descer`, `enquadramento`).

**Avatar da HeyGen free tem marca d'água no rodapé.** Nos layouts UGC ela some empurrando o avatar
para baixo/fora da tela: `--descer <%>` (% da altura do avatar abaixo da tela). Antes, rode
`npm run analisar -- avatar --quadros`, veja a que altura do rodapé está a marca e use esse % + 2.
Na tela dividida o corte "cover" normalmente já tira o rodapé; se não, use `avatar.enquadramento` (zoom/y).
**Sempre confira no `conferencia.jpg` que a marca não aparece em nenhum quadro.**

**Remover o fundo do avatar** (para o formato UGC ficar "recortado" sobre o produto):
`npm run remover-fundo -- clipes/<pasta>/avatar.mp4` → gera `avatar-sem-fundo.webm` (transparente, com áudio).
Fundo liso/verde sai por chroma key (segundos); fundo comum sai com IA local (MODNet, ~0,1–0,4 s por quadro).
**Se a roupa tiver cor parecida com o fundo (ex.: blusa branca + parede clara), use `--metodo ia`**, senão o chroma key come a roupa.
A IA também costuma apagar a marca d'água da HeyGen (ela fica no fundo); confira e reduza o `--descer` se já sumiu.
Antes de tirar o fundo, aperte as pausas do vídeo falado: `npm run apertar-video -- clipes/<pasta>/avatar.mp4`
(corta vídeo+áudio juntos e remapeia `<video>.palavras.json`). Ordem: transcrever → apertar-video → remover-fundo → formato.
Depois: `npm run formato -- <nome> ugc --avatar clipes/<pasta>/avatar-sem-fundo.webm --transparente --voz-do-avatar --legendar`.
Confira bordas/cabelo no `conferencia.jpg`; se tremer, aumente `--suavizar 0.5`.

Voz do avatar: o ideal é gerar a narração aqui (`npm run narrar`, pausas apertadas), subir a
`narracao.mp3` no HeyGen e usar o vídeo que ele devolve: o avatar entra mudo e o som/legenda vêm da
narração (sincronia exata). Se o vídeo já vier com a voz do HeyGen: `--voz-do-avatar --legendar`.

## UGC gravado e Lipsync (trilha principal + b-roll)

Os dois usam uma **trilha principal (A-roll)** de alguém falando + **b-roll por cima** em `sobreposicoes`
(a fala continua por baixo). Layouts: `tela-cheia` (corta para o produto), `pip` (janelinha no canto),
`metade-cima` / `metade-baixo` (tela dividida). Entradas: corte, fade, pop, slide. `em` = segundo no timeline final.

- **UGC (pessoa real gravando):** `npm run ugc -- <nome> clipes/ugc/take1.mp4 [take2.mp4 …]` transcreve,
  corta silêncios e "éé/ahn/hum", alterna zoom a cada corte (disfarça o jump cut) e gera cenas + legenda.
  Leia `<video>.frases.md` para descartar takes repetidas/erradas (apague as cenas correspondentes e
  re-cronometre a legenda, ou corte o vídeo e rode de novo). Depois coloque b-roll a cada 2–4 s em `sobreposicoes`.
- **Lipsync (avatar falando a copy):** 1) `npm run narrar -- <nome>` gera `narracao.mp3` já apertada;
  2) gere o vídeo do avatar com essa narração (ElevenLabs pelo conector do Claude, HeyGen, Hedra, Sync…)
  e salve em `workspace/clipes/<pasta>/`; 3) `npm run lipsync -- <nome> clipes/<pasta>/avatar.mp4`.
  O som continua vindo da `narracao.mp3` (legenda exata). Depois b-roll em `sobreposicoes`.
- Primeiros 1,5 s de UGC: rosto + frase forte, ou b-roll `tela-cheia` do produto com a voz por cima.

## Regras de edição para anúncio

- **Sem títulos/headlines na tela** (estilos `hook` e `titulo` em `textos`): o Jean não quer. A legenda
  já carrega o hook. Só use `textos` para o CTA final ("Toque em Saiba Mais 👇") ou se ele pedir.
- **Legenda com avatar fica em cima** (`posicao: "cima"`, 2 palavras por bloco): embaixo ela cobre o avatar.
  **Enquanto a tela está dividida, a legenda fica no meio, entre os dois vídeos** (automático no render);
  quando passa para entregável/UGC depois do hook, volta para cima. O `npm run formato` já configura isso.
  Entregável puro (sem avatar): legenda embaixo.
- **Primeiros 1,5 s decidem tudo:** a cena 1 tem que ser o plano mais forte, com `movimento: "punch"`.
  Nada de abertura lenta ou logo no começo.
- Cortes rápidos: cenas de **0,8 a 2,5 s**. Troque de plano a cada frase da narração.
- Transição não é enfeite: use `corte` na maior parte; `whip`/`zoom`/`flash` em 2–3 viradas importantes.
- Legenda padrão: `hormozi`, posição `baixo` (fica acima da interface do app). Coloque em `legenda.enfase`
  as palavras de impacto (preço, "grátis", benefício principal).
- **Clipes baixados (TikTok etc.):** NUNCA pode aparecer `@criador`, marca d'água, título ou legenda do vídeo
  original (ex.: "preparando tábuas de frios"). Rode `npm run analisar -- <pasta> --quadros` e olhe as grades
  de 0,5 s. Texto temporário → corte fora (use só as janelas limpas). Texto fixo num canto/faixa →
  `enquadramento` ({ zoom: 1.15–1.3, x, y }) empurrando o texto para fora do quadro; confira no `conferencia.jpg`.
  Rótulos/marcas de produtos que aparecem na cena (frascos, embalagens) **não** são problema.
  Clipes de baixa resolução (≤ 720 px de largura): zoom no máximo 1.25. Áudio original sempre mudo (`volume: 0`).
- Mostre o produto em uso. Se repetir um clipe, use outro trecho ou `espelhar: true`.
- **Vídeo do entregável (gravação de tela do PDF ou do app):** o Jean diz em que frase da copy ele começa
  ("o entregável começa na frase X"). Antes dessa frase, só b-roll/avatar; da frase X em diante, as cenas usam o
  vídeo do entregável (em ordem, sem repetir trecho), até o CTA. A duração dessa parte da narração define quanto
  do vídeo do entregável entra: se ele for mais curto, desacelere um pouco (`velocidade` até 0.8) ou intercale
  b-roll; se for mais longo, use os trechos mais fortes (páginas/telas mais bonitas). Se ele não disser a frase, pergunte.
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
| `sobreposicoes[].layout` | tela-cheia, pip, metade-cima, metade-baixo |

- Tempos de `legenda.palavras` e `textos` são no **timeline final** do criativo.
  Tempos de `cenas[].inicio/fim` são do **clipe original**. Transições sobrepõem as cenas
  (cada transição encurta o total em `duracaoTransicao`).
- Preview ao vivo: `npm run studio` abre `http://localhost:3000`; alterar o JSON atualiza na hora.
  A composição `modelos-de-legenda` mostra todos os templates.
- Mídia do usuário (clipes, músicas, criativos) não vai para o git.
- Nunca coloque chaves de API no código nem no chat; elas ficam no `.env` do usuário.
- Crédito: a ideia de "ler o vídeo por texto + conferir os quadros antes de entregar" vem do
  [video-use](https://github.com/browser-use/video-use) (MIT).
