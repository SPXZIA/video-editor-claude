# Restauração de rosto (GFPGAN 1.4) para o lipsync-local

O `npm run lipsync-local` usa o GFPGAN para firmar dentes e lábios depois da LatentSync, mas só se
`ferramentas/gfpgan` existir (com `.venv` e `GFPGANv1.4.pth`). Ele fica num ambiente Python separado,
sem mexer no Python do sistema nem no ambiente da LatentSync (o GFPGAN precisa do torch 2.0, a LatentSync do 2.5).

Pré-requisitos: [uv](https://docs.astral.sh/uv/) e placa NVIDIA. No PowerShell, dentro da pasta do editor:

```powershell
New-Item -ItemType Directory -Force ferramentas\gfpgan
cd ferramentas\gfpgan
uv venv --python 3.10 .venv
uv pip install --python .venv\Scripts\python.exe torch==2.0.1 torchvision==0.15.2 --index-url https://download.pytorch.org/whl/cu118
uv pip install --python .venv\Scripts\python.exe "numpy<2" opencv-python gfpgan==1.3.8 basicsr==1.4.2 facexlib==0.3.0
Invoke-WebRequest -Uri https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth -OutFile GFPGANv1.4.pth
cd ..\..
```

- O torch 2.0 / torchvision 0.15 é de propósito: o `basicsr` 1.4.2 importa `torchvision.transforms.functional_tensor`,
  que sumiu nas versões novas.
- Na primeira execução o `facexlib` baixa sozinho os pesos de detecção de rosto (releases oficiais do xinntao no GitHub)
  para `ferramentas/gfpgan/gfpgan/weights/`.
- Teste rápido: `ferramentas\gfpgan\.venv\Scripts\python.exe extras\lipsync\restaurar_rosto.py entrada.mp4 saida.mp4 --pasta ferramentas\gfpgan`

## O que o lipsync-local faz por padrão (modelo latentsync)

1. Aplica `extras/lipsync/latentsync-suavizar.diff` na LatentSync (`git apply`, só se ainda não estiver aplicado).
2. Roda a LatentSync com `LATENTSYNC_SUAVIZAR=5` (rastreio do rosto suavizado em 5 quadros) e `LATENTSYNC_BORDA=1`
   (borda da colagem mais suave).
3. `deflicker_boca.py --forca 0.5`: média 1-2-1 com os vizinhos só dentro da boca (máscara pelos landmarks).
4. `restaurar_rosto.py --mistura 0.7`: GFPGAN 1.4 no rosto, 70% restaurado + 30% original (se o GFPGAN estiver instalado).
5. Tira o áudio (a voz vem só da narração do criativo).

Desligar/ajustar: `--sem-suavizar`, `--sem-deflicker`, `--deflicker 0.3`, `--sem-restaurar`, `--restaurar 0.5`.
