#!/usr/bin/env python3
"""Cluster de pestañas Anime — fibras curvas (no rayitas verticales)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


def draw_lash_cluster(width: int = 56, height: int = 40) -> Image.Image:
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    base_y = height - 5

    # Fibras en abanico; centro más largo (Anime)
    specs = [
        (6, 14, 18),
        (14, 18, 24),
        (22, 20, 30),
        (30, 22, 34),  # pico
        (38, 20, 30),
        (46, 18, 24),
        (50, 14, 18),
    ]

    for x, tip_y, alpha in specs:
        # Curva bezier aproximada con polyline
        pts = [
            (x, base_y),
            (x + 1, base_y - tip_y * 0.4),
            (x - 1, base_y - tip_y * 0.75),
            (x, base_y - tip_y),
        ]
        draw.line(pts, fill=(18, 12, 22, alpha), width=2, joint="curve")
        # volumen secundario
        if tip_y >= 24:
            draw.line(
                [(x + 1, base_y - 2), (x + 2, base_y - tip_y + 4)],
                fill=(35, 25, 40, alpha // 2),
                width=1,
            )

    return img


def main() -> int:
    root = Path(__file__).resolve().parent.parent / "assets"
    root.mkdir(parents=True, exist_ok=True)
    cluster = draw_lash_cluster()
    path = root / "lash_cluster.png"
    cluster.save(path)
    print(f"  ✓ {path} (synthetic curved)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
