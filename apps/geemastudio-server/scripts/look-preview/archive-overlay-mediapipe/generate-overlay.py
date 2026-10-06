#!/usr/bin/env python3
"""Genera overlay PNG sintético estilo Anime (picos marcados) para el spike."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


def draw_anime_lash_strip(width: int = 240, height: int = 100) -> Image.Image:
    """Tira de pestañas con picos Anime — fondo transparente."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    base_y = int(height * 0.72)
    cx = width // 2

    # Picos Anime: centro más alto, laterales más bajos
    peaks = [
        (0.08, 0.55, 2),
        (0.18, 0.42, 2),
        (0.30, 0.35, 3),
        (0.42, 0.28, 3),
        (0.50, 0.22, 4),  # pico central
        (0.58, 0.28, 3),
        (0.70, 0.35, 3),
        (0.82, 0.42, 2),
        (0.92, 0.55, 2),
    ]

    for frac_x, frac_h, stroke in peaks:
        x = int(frac_x * width)
        tip_y = int(base_y - frac_h * height * 0.55)
        # Curva desde base del párpado hasta punta
        draw.line([(x, base_y), (x, tip_y)], fill=(15, 10, 20, 220), width=stroke)
        # Ramificación suave (volumen)
        if stroke >= 3:
            draw.line(
                [(x - 2, base_y - 4), (x + 1, tip_y + 6)],
                fill=(30, 20, 35, 140),
                width=1,
            )
            draw.line(
                [(x + 2, base_y - 4), (x - 1, tip_y + 6)],
                fill=(30, 20, 35, 140),
                width=1,
            )

    return img


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    out_dir = root / "assets"
    out_dir.mkdir(parents=True, exist_ok=True)

    strip = draw_anime_lash_strip()
    out_path = out_dir / "anime_lash_strip.png"
    strip.save(out_path)
    print(f"  ✓ {out_path} ({strip.size[0]}x{strip.size[1]})")

    # Espejo para ojo derecho (compositor rota; guardamos copia flipped)
    flipped = strip.transpose(Image.FLIP_LEFT_RIGHT)
    flip_path = out_dir / "anime_lash_strip_flipped.png"
    flipped.save(flip_path)
    print(f"  ✓ {flip_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
