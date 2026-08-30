# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont

KAYNAK = "E:/SG_EDUCOACH/tmp/pdfs/afis/slider_0_4a8c3615-5deb-4565-bdee-c99f6a8769f7.jpg"
HEDEF = "E:/SG_EDUCOACH/tmp/pdfs/afis/slider_0_duzenlendi.jpg"

im = Image.open(KAYNAK).convert("RGB")
draw = ImageDraw.Draw(im)

# Genis, tam opak, yuvarlatilmis dikdortgen - eski metnin TAMAMINI (kenar
# payiyla) kapsiyor. Bulaniklik/feather YOK (bir onceki denemelerde eski
# metnin hayaletimsi izlerini blend ediyordu).
PATCH = (58, 262, 662, 412)
ARKA_PLAN = (214, 233, 241)
draw.rounded_rectangle(PATCH, radius=14, fill=ARKA_PLAN)

LACIVERT = (15, 37, 64)
font_path = r"C:\Windows\Fonts\segoeuib.ttf"
satirlar = ["SİSTEMLİ TAKİP", "ODAKLI EĞİTİM", "BAŞARISI"]

boyut = 40
font = ImageFont.truetype(font_path, boyut)
patch_w = PATCH[2] - PATCH[0] - 28
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
    draw.text((PATCH[0] + 14, y), satir, font=font, fill=LACIVERT)

im.save(HEDEF, quality=93)
print("kaydedildi, font boyutu:", boyut)
