#!/usr/bin/env python3
"""Extrae overlays de pestañas Anime desde foto del portafolio ZM."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import sys

_SPIKE_DIR = Path(__file__).resolve().parent
if str(_SPIKE_DIR) not in sys.path:
    sys.path.insert(0, str(_SPIKE_DIR))

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

from detect_landmarks import process_image
from landmarks import EYE_PAIRS


def extract_eye_overlay(bgr: np.ndarray, bbox: dict, mirror: bool = False) -> Image.Image:
    x, y, w, h = bbox["x"], bbox["y"], bbox["w"], bbox["h"]
    crop = bgr[y : y + h, x : x + w].copy()
    if mirror:
        crop = cv2.flip(crop, 1)

    mask = np.zeros((h, w), dtype=np.float32)
    cv2.ellipse(mask, (w // 2, int(h * 0.55)), (int(w * 0.48), int(h * 0.42)), 0, 0, 360, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=max(1, w * 0.08))

    rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = (mask * 255).astype(np.uint8)
    return Image.fromarray(rgba)


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    portfolio = root / "assets" / "anime-portfolio.jpg"
    out_dir = root / "out" / "overlays"
    out_dir.mkdir(parents=True, exist_ok=True)

    if not portfolio.is_file():
        print("Falta assets/anime-portfolio.jpg — ejecuta download-fixtures.mjs", file=sys.stderr)
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
        print("No se detectó rostro en portafolio Anime", file=sys.stderr)
        return 1

    bgr = cv2.imread(str(portfolio))
    meta = {"source": "anime-portfolio.jpg", "style": "anime", "eyes": {}}

    for side, *_ in EYE_PAIRS:
        bbox = data["eyes"][side]["bbox"]
        mirror = side == "right"
        overlay = extract_eye_overlay(bgr, bbox, mirror=mirror)
        out_path = out_dir / f"anime_{side}.png"
        overlay.save(out_path)
        meta["eyes"][side] = {"file": out_path.name, "bbox": bbox}
        print(f"  ✓ {out_path}")

    meta_path = out_dir / "anime_meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"\nOverlays en {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
