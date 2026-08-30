# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont

KAYNAK = "E:/SG_EDUCOACH/tmp/pdfs/afis/slider_0_4a8c3615-5deb-4565-bdee-c99f6a8769f7.jpg"
HEDEF = "E:/SG_EDUCOACH/tmp/pdfs/afis/slider_0_duzenlendi.jpg"

im = Image.open(KAYNAK).convert("RGB")
draw = ImageDraw.Draw(im)

# Eski basligin ("UZAKTAN KOCLUK SISTEMLERI") kapladigi alan - kart icinde,
# ust satir (SIZI GELECEGE...) ve alt satirin (TAM KAPSAMLI...) arasinda.
PATCH = (68, 262, 640, 412)
ARKA_PLAN = (212, 232, 240)
draw.rectangle(PATCH, fill=ARKA_PLAN)

LACIVERT = (15, 37, 64)
font_path = r"C:\Windows\Fonts\segoeuib.ttf"
satirlar = ["SİSTEMLİ TAKİP", "ODAKLI EĞİTİM", "BAŞARISI"]

boyut = 40
font = ImageFont.truetype(font_path, boyut)
# Genislige gore boyutu ayarla (en uzun satir patch genisligini asmasin)
patch_w = PATCH[2] - PATCH[0] - 16
while True:
    genislikler = [draw.textbbox((0,0), s, font=font)[2] for s in satirlar]
    if max(genislikler) <= patch_w or boyut <= 20:
        break
    boyut -= 1
    font = ImageFont.truetype(font_path, boyut)

satir_yuksekligi = draw.textbbox((0,0), "Ağİ", font=font)[3] + 6
toplam_yukseklik = satir_yuksekligi * len(satirlar)
patch_h = PATCH[3] - PATCH[1]
baslangic_y = PATCH[1] + (patch_h - toplam_yukseklik) / 2

for i, satir in enumerate(satirlar):
    y = baslangic_y + i * satir_yuksekligi
    draw.text((PATCH[0] + 8, y), satir, font=font, fill=LACIVERT)

im.save(HEDEF, quality=92)
print("kaydedildi, font boyutu:", boyut)
