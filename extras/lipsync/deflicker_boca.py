"""
Deflicker temporal só na região da boca de um vídeo com lipsync.

  python deflicker_boca.py <lipsync.mp4> <saida.mp4> [--forca 0.5] [--modelos checkpoints/auxiliary]

A região da boca vem dos landmarks da insightface (pontos 52–71), dilatada e com borda suave,
e o polígono é suavizado no tempo. Dentro dela cada quadro vira uma média ponderada com os
vizinhos (1-2-1 * forca); fora dela nada muda. Sai sem áudio.
"""
import argparse

import cv2
import numpy as np


def ler(caminho):
    cap = cv2.VideoCapture(caminho)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    quadros = []
    while True:
        ok, q = cap.read()
        if not ok:
            break
        quadros.append(q)
    cap.release()
    return np.stack(quadros), fps


BOCA = list(range(52, 72))  # pontos da boca no modelo de 106 landmarks da insightface


def mascaras_boca(quadros, raiz_modelos):
    """Uma máscara suave por quadro, em volta da boca (landmarks), com o centro suavizado no tempo."""
    from insightface.app import FaceAnalysis

    app = FaceAnalysis(allowed_modules=["detection", "landmark_2d_106"], root=raiz_modelos,
                       providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(512, 512))
    pts = []
    for q in quadros:
        faces = app.get(q)
        if not faces:
            pts.append(pts[-1] if pts else None)
            continue
        f = max(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
        pts.append(f.landmark_2d_106[BOCA].astype(np.float32))
    primeiro = next(p for p in pts if p is not None)
    pts = np.stack([p if p is not None else primeiro for p in pts])
    # suaviza o polígono no tempo (janela 5) para a própria máscara não tremer
    pad = np.concatenate([pts[:1], pts[:1], pts, pts[-1:], pts[-1:]])
    pts = np.mean([pad[i:i + len(pts)] for i in range(5)], axis=0)

    h, w = quadros.shape[1:3]
    mascaras = []
    for p in pts:
        larg = p[:, 0].max() - p[:, 0].min()
        m = np.zeros((h, w), np.float32)
        cv2.fillConvexPoly(m, cv2.convexHull(p.astype(np.int32)), 1.0)
        raio = max(3, int(larg * 0.22))
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (raio * 2 + 1, raio * 2 + 1)))
        k = raio * 2 + 1
        mascaras.append(np.clip(cv2.GaussianBlur(m, (k, k), 0), 0, 1))
    return np.stack(mascaras)[..., None]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lipsync")
    ap.add_argument("saida")
    ap.add_argument("--forca", type=float, default=0.5, help="0 = nada, 1 = média 1-2-1 completa")
    ap.add_argument("--modelos", default="checkpoints/auxiliary",
                    help="pasta dos modelos da insightface (rode com cwd = ferramentas/LatentSync)")
    ap.add_argument("--mascara", default=None, help="salvar a máscara do quadro do meio em png")
    a = ap.parse_args()

    g, fps = ler(a.lipsync)
    m = mascaras_boca(g, a.modelos)
    if a.mascara:
        cv2.imwrite(a.mascara, (m[len(m) // 2, ..., 0] * 255).astype(np.uint8))

    gf = g.astype(np.float32)
    viz = gf.copy()
    viz[1:-1] = 0.25 * gf[:-2] + 0.5 * gf[1:-1] + 0.25 * gf[2:]
    suave = gf * (1 - a.forca) + viz * a.forca
    saida = (m * suave + (1 - m) * gf).round().clip(0, 255).astype(np.uint8)

    h, w = saida.shape[1:3]
    vw = cv2.VideoWriter(a.saida, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    for q in saida:
        vw.write(q)
    vw.release()
    print(f"ok {len(saida)} quadros, área da máscara {m.mean() * 100:.1f}% do quadro")


if __name__ == "__main__":
    main()
