#!/usr/bin/env python3
"""
Extrae textura de pestañas del portafolio Anime (solo píxeles oscuros del párpado).
Genera cluster reutilizable para compositor v2.
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

_SPIKE_DIR = Path(__file__).resolve().parent
if str(_SPIKE_DIR) not in sys.path:
    sys.path.insert(0, str(_SPIKE_DIR))

from detect_landmarks import process_image
from landmarks import EYE_PAIRS, LEFT_UPPER_LID, RIGHT_UPPER_LID


def _pt(lms, idx: int, w: int, h: int) -> tuple[float, float]:
    return lms[idx].x * w, lms[idx].y * h


def extract_eye_lash_patch(
    bgr: np.ndarray,
    lms,
    upper_lid: list[int],
    outer: int,
    inner: int,
    top: int,
) -> Image.Image | None:
    h, w = bgr.shape[:2]
    xs = [_pt(lms, i, w, h)[0] for i in upper_lid]
    ys = [_pt(lms, i, w, h)[1] for i in upper_lid]

    ox, oy = _pt(lms, outer, w, h)
    ix, iy = _pt(lms, inner, w, h)
    tx, ty = _pt(lms, top, w, h)

    eye_span = max(24, int(((ox - ix) ** 2 + (oy - iy) ** 2) ** 0.5))
    band_h = max(12, int(eye_span * 0.22))
    pad_x = int(eye_span * 0.08)

    x0 = max(0, int(min(xs) - pad_x))
    x1 = min(w, int(max(xs) + pad_x))
    y0 = max(0, int(min(ys) - band_h * 1.1))
    y1 = min(h, int(max(ys) + band_h * 0.35))

    if x1 - x0 < 20 or y1 - y0 < 8:
        return None

    crop = bgr[y0:y1, x0:x1].copy()
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # Muestra de piel: zona bajo el párpado (más clara)
    by = int(min(h - 1, ty - y0 + band_h * 0.3))
    bx = int(np.clip((ox + ix) / 2 - x0, 0, crop.shape[1] - 1))
    skin_samples = gray[max(0, by - 3) : min(gray.shape[0], by + 3), max(0, bx - 8) : min(gray.shape[1], bx + 8)]
    skin_level = float(np.median(skin_samples)) if skin_samples.size else 128.0

    # Pestañas = más oscuro que piel
    thresh = max(40, skin_level - 35)
    lash_mask = (gray < thresh).astype(np.uint8) * 255
    lash_mask = cv2.morphologyEx(lash_mask, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
    lash_mask = cv2.GaussianBlur(lash_mask, (3, 3), 0)

    rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = lash_mask

    # Normalizar ancho para compositor (~120px)
    pil = Image.fromarray(rgba)
    target_w = 140
    ratio = target_w / pil.width
    target_h = max(20, int(pil.height * ratio))
    return pil.resize((target_w, target_h), Image.Resampling.LANCZOS)


def draw_fallback_cluster() -> Image.Image:
    """Cluster mínimo si el portafolio no aporta suficiente contraste."""
    w, h = 48, 36
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    from PIL import ImageDraw

    draw = ImageDraw.Draw(img)
    base = h - 6
    for i, (dx, length) in enumerate([(8, 22), (16, 28), (24, 32), (32, 28), (40, 22)]):
        draw.line(
            [(dx, base), (dx, base - length)],
            fill=(20, 15, 25, int(200 - i * 5)),
            width=2 if i in (1, 2, 3) else 1,
        )
    return img


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    portfolio = root / "assets" / "anime-portfolio.jpg"
    out_dir = root / "assets"
    out_dir.mkdir(parents=True, exist_ok=True)

    if not portfolio.is_file():
        print("Falta anime-portfolio.jpg", file=sys.stderr)
        return 1

    mp_face_mesh = mp.solutions.face_mesh
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.3,
    ) as face_mesh:
        data = process_image(face_mesh, portfolio)
        if not data or not data.get("ok"):
            print("Sin rostro en portafolio — usando cluster fallback", file=sys.stderr)
            fb = draw_fallback_cluster()
            fb.save(out_dir / "lash_cluster.png")
            return 0

        bgr = cv2.imread(str(portfolio))
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        res = face_mesh.process(rgb)
        lms = res.multi_face_landmarks[0].landmark

        left_patch = extract_eye_lash_patch(bgr, lms, LEFT_UPPER_LID, 33, 133, 159)
        right_patch = extract_eye_lash_patch(bgr, lms, RIGHT_UPPER_LID, 263, 362, 386)

    # Usar el patch con más alpha (más pestaña visible)
    def alpha_sum(p: Image.Image | None) -> int:
        if p is None:
            return 0
        return int(np.array(p.split()[-1]).sum())

    best = left_patch if alpha_sum(left_patch) >= alpha_sum(right_patch) else right_patch
    if best is None or alpha_sum(best) < 5000:
        print("  Portafolio con poco contraste — cluster fallback")
        best = draw_fallback_cluster()
    else:
        print(f"  Extraído del portafolio Anime (alpha={alpha_sum(best)})")

    cluster_path = out_dir / "lash_cluster.png"
    best.save(cluster_path)
    print(f"  ✓ {cluster_path}")

    # Tira curva de referencia (para debug)
    if left_patch:
        left_patch.save(out_dir / "lash_strip_left_ref.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
