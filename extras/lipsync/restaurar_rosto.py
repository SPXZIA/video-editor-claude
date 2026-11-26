"""
Restauração de rosto com GFPGAN 1.4, só no rosto, quadro a quadro.
  python restaurar_rosto.py <entrada.mp4> <saida.mp4> [--mistura 0.7] [--pasta ferramentas/gfpgan]
--mistura: quanto do rosto restaurado entra (0 = original, 1 = só GFPGAN). Sai sem áudio.
--pasta: onde estão o GFPGANv1.4.pth e os pesos de detecção (padrão: pasta deste script).
Instalação: extras/lipsync/instalar-gfpgan.md
"""
import argparse
import os
import warnings

warnings.filterwarnings("ignore")
import cv2
from gfpgan import GFPGANer

ap = argparse.ArgumentParser()
ap.add_argument("entrada")
ap.add_argument("saida")
ap.add_argument("--mistura", type=float, default=0.7)
ap.add_argument("--pasta", default=os.path.dirname(os.path.abspath(__file__)))
a = ap.parse_args()
entrada, saida = os.path.abspath(a.entrada), os.path.abspath(a.saida)
pasta = os.path.abspath(a.pasta)

os.chdir(pasta)  # facexlib baixa os pesos de detecção em ./gfpgan/weights
restaurador = GFPGANer(
    model_path=os.path.join(pasta, "GFPGANv1.4.pth"), upscale=1, arch="clean", channel_multiplier=2, bg_upsampler=None
)

cap = cv2.VideoCapture(entrada)
fps = cap.get(cv2.CAP_PROP_FPS) or 25
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
vw = cv2.VideoWriter(saida, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
n = 0
while True:
    ok, q = cap.read()
    if not ok:
        break
    _, _, out = restaurador.enhance(q, has_aligned=False, only_center_face=True, paste_back=True)
    if out is None:
        out = q
    out = cv2.addWeighted(out, a.mistura, q, 1 - a.mistura, 0)
    vw.write(out)
    n += 1
vw.release()
print(f"ok {n} quadros")
