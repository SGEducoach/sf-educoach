# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFilter
import math

W, H = 1654, 500  # header band, ~A4 genislik oranli, yeterli yukseklik

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

LACIVERT = hex_to_rgb("0F2540")
TURKUAZ = hex_to_rgb("14B8B0")

img = Image.new("RGB", (W, H))
px = img.load()
for x in range(W):
    t = x / (W - 1)
    r = int(LACIVERT[0] + (TURKUAZ[0] - LACIVERT[0]) * t)
    g = int(LACIVERT[1] + (TURKUAZ[1] - LACIVERT[1]) * t)
    b = int(LACIVERT[2] + (TURKUAZ[2] - LACIVERT[2]) * t)
    for y in range(H):
        px[x, y] = (r, g, b)

# Dekoratif yumusak daireler (AI-poster tarzi susleme) - yari saydam beyaz
overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)
daireler = [
    (200, 80, 260, 28), (1500, 380, 220, 22), (900, -60, 340, 18),
    (1300, 120, 150, 20), (60, 380, 180, 16),
]
for cx, cy, r, alpha in daireler:
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, alpha))
overlay = overlay.filter(ImageFilter.GaussianBlur(18))
img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

img.save("E:/SG_EDUCOACH/tmp/pdfs/afis/header_gradient.png", quality=95)
print("gradient olusturuldu", img.size)
