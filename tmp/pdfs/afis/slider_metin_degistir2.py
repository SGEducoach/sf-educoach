# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

KAYNAK = "E:/SG_EDUCOACH/tmp/pdfs/afis/slider_0_4a8c3615-5deb-4565-bdee-c99f6a8769f7.jpg"
HEDEF = "E:/SG_EDUCOACH/tmp/pdfs/afis/slider_0_duzenlendi.jpg"

im = Image.open(KAYNAK).convert("RGB")
W, H = im.size

# Patch alani: eski basligin oldugu bolge (ust satirla alt satir arasi)
PATCH = (66, 268, 620, 406)

# 1) Yumusak-kenarli yama: patch alanini kapsayan bulanik bir maske olustur,
#    bu maskeyle ORIJINAL FOTOGRAFTAN (patch'in biraz USTUNDEKI temiz seritten)
#    orneklenen dokuyu dikey olarak gerip harmanla - duz renkten daha dogal.
temiz_serit_y0, temiz_serit_y1 = 240, 265  # baslikdan hemen once, yazi yok
serit = im.crop((PATCH[0]-10, temiz_serit_y0, PATCH[2]+10, temiz_serit_y1))
serit = serit.resize((PATCH[2]-PATCH[0]+20, PATCH[3]-PATCH[1]+20), Image.LANCZOS)

yama_katmani = im.copy()
yama_katmani.paste(serit, (PATCH[0]-10, PATCH[1]-10))

# Maske: patch alanini kapsayan yuvarlatilmis dikdortgen, kenarlari bulanik
mask = Image.new("L", (W, H), 0)
mdraw = ImageDraw.Draw(mask)
mdraw.rounded_rectangle(PATCH, radius=18, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(9))

im = Image.composite(yama_katmani, im, mask)
draw = ImageDraw.Draw(im)

LACIVERT = (15, 37, 64)
font_path = r"C:\Windows\Fonts\segoeuib.ttf"
satirlar = ["SİSTEMLİ TAKİP", "ODAKLI EĞİTİM", "BAŞARISI"]

boyut = 38
font = ImageFont.truetype(font_path, boyut)
patch_w = PATCH[2] - PATCH[0] - 20
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
    draw.text((PATCH[0] + 10, y), satir, font=font, fill=LACIVERT)

im.save(HEDEF, quality=93)
print("kaydedildi, font boyutu:", boyut)
