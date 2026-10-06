#!/usr/bin/env python3
"""Detecta landmarks faciales con MediaPipe Face Mesh (CPU) → JSON por imagen."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import mediapipe as mp

from landmarks import EYE_PAIRS


def eye_metrics(landmarks: list, w: int, h: int) -> dict:
    def pt(idx: int) -> tuple[float, float]:
        lm = landmarks[idx]
        return lm.x * w, lm.y * h

    def dist(a: int, b: int) -> float:
        ax, ay = pt(a)
        bx, by = pt(b)
        return ((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5

    left_open = dist(159, 145)
    right_open = dist(386, 374)
    inter_eye = dist(133, 362)

    nose_x = landmarks[1].x * w
    le_x = (landmarks[133].x + landmarks[33].x) / 2 * w
    re_x = (landmarks[362].x + landmarks[263].x) / 2 * w
    eye_mid_x = (le_x + re_x) / 2
    profile_ratio = abs(nose_x - eye_mid_x) / max(inter_eye, 1)

    return {
        "left_eye_open_px": round(left_open, 1),
        "right_eye_open_px": round(right_open, 1),
        "inter_eye_px": round(inter_eye, 1),
        "profile_ratio": round(profile_ratio, 3),
        "eyes_visible": left_open > 8 and right_open > 8,
        "likely_profile": profile_ratio > 0.35,
    }


def process_image(face_mesh, path: Path) -> dict | None:
    bgr = cv2.imread(str(path))
    if bgr is None:
        return None
    h, w = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)
    if not result.multi_face_landmarks:
        return {"ok": False, "error": "no_face", "width": w, "height": h}

    lms = result.multi_face_landmarks[0].landmark
    serialized = [{"x": p.x, "y": p.y, "z": p.z} for p in lms]

    eyes = {}
    for name, inner, outer, top, bottom, *_ in EYE_PAIRS:
        eyes[name] = {
            "inner": inner,
            "outer": outer,
            "top": top,
            "bottom": bottom,
            "bbox": _eye_bbox(lms, inner, outer, top, bottom, w, h),
        }

    metrics = eye_metrics(lms, w, h)
    return {
        "ok": True,
        "width": w,
        "height": h,
        "landmarks": serialized,
        "eyes": eyes,
        "metrics": metrics,
    }


def _eye_bbox(lms, inner, outer, top, bottom, w, h) -> dict:
    idxs = [inner, outer, top, bottom]
    xs = [lms[i].x * w for i in idxs]
    ys = [lms[i].y * h for i in idxs]
    pad_x = (max(xs) - min(xs)) * 0.55
    pad_y = (max(ys) - min(ys)) * 1.8
    x0 = max(0, min(xs) - pad_x)
    x1 = min(w, max(xs) + pad_x)
    y0 = max(0, min(ys) - pad_y * 0.6)
    y1 = min(h, max(ys) + pad_y)
    return {
        "x": int(x0),
        "y": int(y0),
        "w": int(x1 - x0),
        "h": int(y1 - y0),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="input_dir", required=True)
    parser.add_argument("--out", dest="output_dir", required=True)
    args = parser.parse_args()

    in_dir = Path(args.input_dir)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    summary = {"processed": 0, "faces": 0, "files": []}

    mp_face_mesh = mp.solutions.face_mesh
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.3,
    ) as face_mesh:
        images = []
        for ext in ("*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"):
            images.extend(in_dir.glob(ext))
        images = sorted(set(images))

        for img_path in images:
            data = process_image(face_mesh, img_path)
            summary["processed"] += 1
            out_file = out_dir / f"{img_path.stem}.json"
            if data and data.get("ok"):
                summary["faces"] += 1
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump({"source": img_path.name, **(data or {"ok": False})}, f, indent=2)
            summary["files"].append(img_path.name)
            status = "OK" if data and data.get("ok") else "SKIP"
            print(f"  [{status}] {img_path.name}")

    summary_path = out_dir / "_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"\nLandmarks: {summary['faces']}/{summary['processed']} con rostro")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
