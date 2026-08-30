# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont, ImageFilter

KAYNAK = "E:/SG_EDUCOACH/tmp/pdfs/afis/slider_0_4a8c3615-5deb-4565-bdee-c99f6a8769f7.jpg"
HEDEF = "E:/SG_EDUCOACH/tmp/pdfs/afis/slider_0_duzenlendi.jpg"

im = Image.open(KAYNAK).convert("RGB")
W, H = im.size

PATCH = (66, 266, 622, 408)
ARKA_PLAN = (215, 234, 242)

duz_katman = im.copy()
d = ImageDraw.Draw(duz_katman)
d.rectangle(PATCH, fill=ARKA_PLAN)

# Yumusak kenar: patch'in biraz DAHA KUCUGU tam opak, disi bulanikla harmanlanir
mask = Image.new("L", (W, H), 0)
mdraw = ImageDraw.Draw(mask)
ic_patch = (PATCH[0] + 10, PATCH[1] + 10, PATCH[2] - 10, PATCH[3] - 10)
mdraw.rectangle(ic_patch, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(12))

im = Image.composite(duz_katman, im, mask)
draw = ImageDraw.Draw(im)

LACIVERT = (15, 37, 64)
font_path = r"C:\Windows\Fonts\segoeuib.ttf"
satirlar = ["SİSTEMLİ TAKİP", "ODAKLI EĞİTİM", "BAŞARISI"]

boyut = 38
font = ImageFont.truetype(font_path, boyut)
patch_w = PATCH[2] - PATCH[0] - 24
while True:
    genislikler = [draw.textbbox((0,0), s, font=font)[2] for s in satirlar]
    if max(genislikler) <= patch_w or boyut <= 20:
        break
    boyut -= 1
    font = ImageFont.truetype(font_path, boyut)

satir_yuksekligi = draw.textbbox((0,0), "Ağİ", font=font)[3] + 8
toplam_yukseklik = satir_yuksekligi * len(satirlar)
patch_h = PATCH[3] - PATCH[1]
baslangic_y = PATCH[1] + (patch_h - toplam_yukseklik) / 2

for i, satir in enumerate(satirlar):
    y = baslangic_y + i * satir_yuksekligi
    draw.text((PATCH[0] + 12, y), satir, font=font, fill=LACIVERT)

im.save(HEDEF, quality=93)
print("kaydedildi, font boyutu:", boyut)
