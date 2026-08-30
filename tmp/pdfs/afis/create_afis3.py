# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
import os

FONT_ADAYLARI = [
    (r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\segoeuib.ttf"),
    (r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\arialbd.ttf"),
]
FONT_NORMAL = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
for normal, bold in FONT_ADAYLARI:
    if os.path.exists(normal) and os.path.exists(bold):
        pdfmetrics.registerFont(TTFont("Ana", normal))
        pdfmetrics.registerFont(TTFont("Ana-Bold", bold))
        FONT_NORMAL = "Ana"
        FONT_BOLD = "Ana-Bold"
        break

LACIVERT = HexColor("#0F2540")
TURKUAZ = HexColor("#14B8B0")
CORAL = HexColor("#E8785A")
METIN = HexColor("#2B3542")
METIN_ACIK = HexColor("#5A6472")
BEYAZ = HexColor("#FFFFFF")

ROLLER = [
    ("ÖĞRENCİ", TURKUAZ),
    ("ÖĞRETMEN", LACIVERT),
    ("VELİ", CORAL),
]

BOLUMLER = [
    ("1", "KULLANIM", {
        "ÖĞRENCİ": ["Okul numarası ve şifresiyle giriş yapar.", "Menüden veri girişine, ödevlerine ve programına ulaşır."],
        "ÖĞRETMEN": ["E-posta ve şifresiyle giriş yapar.", "Kendi sınıfını ve öğrencilerini menüden yönetir."],
        "VELİ": ["Öğrencinin numarası ve öğretmen onaylı koduyla hesabını tamamlar."],
    }, None),
    ("2", "İŞLEYİŞ", {
        "ÖĞRENCİ": ["Konu çalışmasını, soru çözümünü ve deneme sonuçlarını sisteme girer."],
        "ÖĞRETMEN": ["Öğrencilerinin verilerini anlık izler, ödev ve program atar."],
        "VELİ": ["Çocuğunun çalışma ve deneme performansını aynı anda takip eder."],
    }, "Sistem tüm verileri otomatik olarak net, hız ve konu bazlı grafiklere dönüştürür."),
    ("3", "FAYDA", {
        "ÖĞRENCİ": ["Kendi gelişimini somut verilerle görür, eksik konularını erken fark eder."],
        "ÖĞRETMEN": ["Sınıfının genelini tek ekrandan izler, doğru zamanda müdahale eder."],
        "VELİ": ["Çocuğunun çalışma disiplinini şeffaf şekilde görür, habersiz kalmaz."],
    }, "Üç taraf da aynı veriye bakarak iletişim kurar."),
]

W, H = A4
MARGIN = 14 * mm
ICERIK_GENISLIK = W - 2 * MARGIN
AFIS_DIZIN = "E:/SG_EDUCOACH/tmp/pdfs/afis/"

c = canvas.Canvas(AFIS_DIZIN + "sefu_koc_nedir_afis.pdf", pagesize=A4)

# ---- 1) Gradyanli, susleme daireli baslik bandi ----
HEADER_H = 46 * mm
gradient_img = ImageReader(AFIS_DIZIN + "header_gradient.png")
c.drawImage(gradient_img, 0, H - HEADER_H, width=W, height=HEADER_H, mask=None)

logo_beyaz = ImageReader(AFIS_DIZIN + "logo_beyaz.png")
logo_w_px, logo_h_px = logo_beyaz.getSize()
logo_h = 17 * mm
logo_w = logo_h * (logo_w_px / logo_h_px)
c.drawImage(logo_beyaz, MARGIN, H - HEADER_H / 2 - logo_h / 2, width=logo_w, height=logo_h, mask='auto')

c.setFont(FONT_BOLD, 25)
c.setFillColor(BEYAZ)
c.drawCentredString(W / 2 + 8 * mm, H - HEADER_H / 2 + 3, "SeFu Koç Nedir?")
c.setFont(FONT_NORMAL, 10.5)
c.drawCentredString(W / 2 + 8 * mm, H - HEADER_H / 2 - 9, "Öğrenci · Öğretmen · Veli için tek platform")

# ---- 2) Alt CTA bandi (once yukseklik ayirmak icin, govde bu ikisi arasinda) ----
CTA_H = 34 * mm
c.drawImage(gradient_img, 0, 0, width=W, height=CTA_H, mask=None)

qr_boyut = 22 * mm
qr_img = ImageReader(AFIS_DIZIN + "qr_giris.png")
qr_x = W - MARGIN - qr_boyut
qr_y = CTA_H / 2 - qr_boyut / 2
# QR kodun beyaz zemini icin kucuk bir kart
c.setFillColor(BEYAZ)
c.roundRect(qr_x - 2.5*mm, qr_y - 2.5*mm, qr_boyut + 5*mm, qr_boyut + 5*mm, 2.5*mm, stroke=0, fill=1)
c.drawImage(qr_img, qr_x, qr_y, width=qr_boyut, height=qr_boyut)

c.setFont(FONT_BOLD, 17)
c.setFillColor(BEYAZ)
c.drawString(MARGIN, CTA_H / 2 + 4.5*mm, "Hemen Giriş Yap, Farkı Gör!")
c.setFont(FONT_NORMAL, 10.5)
c.drawString(MARGIN, CTA_H / 2 - 3.5*mm, "sefukoc.vercel.app  ·  QR kodu okutman yeterli")

# ---- 3) Govde: 3 bolum, her birinde 3 yan yana canli renkli kutu ----
madde_stili = ParagraphStyle(
    "madde", fontName=FONT_NORMAL, fontSize=9.4, leading=12.8,
    textColor=METIN, alignment=TA_CENTER,
)

alan_ust = H - HEADER_H - 7 * mm
alan_alt = CTA_H + 7 * mm
toplam_yukseklik = alan_ust - alan_alt
bolum_bosluk = 6 * mm
bolum_yuksekligi = (toplam_yukseklik - 2 * bolum_bosluk) / 3

kutu_bosluk = 4 * mm
kutu_genislik = (ICERIK_GENISLIK - 2 * kutu_bosluk) / 3

for i, (no, baslik, rol_maddeleri, sistem_notu) in enumerate(BOLUMLER):
    bolum_ust = alan_ust - i * (bolum_yuksekligi + bolum_bosluk)
    bolum_alt = bolum_ust - bolum_yuksekligi

    rozet_cap = 8.5 * mm
    rozet_merkez_y = bolum_ust - rozet_cap / 2
    c.setFillColor(LACIVERT)
    c.circle(MARGIN + rozet_cap / 2, rozet_merkez_y, rozet_cap / 2, stroke=0, fill=1)
    c.setFillColor(BEYAZ)
    c.setFont(FONT_BOLD, 11.5)
    c.drawCentredString(MARGIN + rozet_cap / 2, rozet_merkez_y - 4, no)

    c.setFillColor(LACIVERT)
    c.setFont(FONT_BOLD, 16)
    c.drawString(MARGIN + rozet_cap + 4 * mm, rozet_merkez_y - 4, baslik)

    kutular_ust = bolum_ust - rozet_cap - 4.5 * mm
    sistem_notu_yuksekligi = 7 * mm if sistem_notu else 0
    kutular_alt = bolum_alt + sistem_notu_yuksekligi
    kutu_yuksekligi = kutular_ust - kutular_alt

    for j, (rol_adi, rol_renk) in enumerate(ROLLER):
        kutu_x = MARGIN + j * (kutu_genislik + kutu_bosluk)
        kutu_y = kutular_alt

        # Canli tonlanmis zemin (v2'den daha belirgin: %16 alpha)
        c.saveState()
        c.setFillColor(rol_renk)
        c.setFillAlpha(0.16)
        c.roundRect(kutu_x, kutu_y, kutu_genislik, kutu_yuksekligi, 3.5 * mm, stroke=0, fill=1)
        c.restoreState()

        # Dolgu renkli ust basit (rol adi icin), koseleri yuvarlak gorunsun diye
        basit_h = 8 * mm
        c.setFillColor(rol_renk)
        c.roundRect(kutu_x, kutu_y + kutu_yuksekligi - basit_h, kutu_genislik, basit_h, 3.5 * mm, stroke=0, fill=1)
        # Alt koselerin kare gorunmesini onlemek icin ust yarisini dikdortgenle kapat
        c.rect(kutu_x, kutu_y + kutu_yuksekligi - basit_h, kutu_genislik, basit_h / 2, stroke=0, fill=1)

        c.setStrokeColor(rol_renk)
        c.setLineWidth(1.1)
        c.roundRect(kutu_x, kutu_y, kutu_genislik, kutu_yuksekligi, 3.5 * mm, stroke=1, fill=0)

        c.setFillColor(BEYAZ)
        c.setFont(FONT_BOLD, 10.8)
        c.drawCentredString(kutu_x + kutu_genislik / 2, kutu_y + kutu_yuksekligi - basit_h / 2 - 3.2, rol_adi)

        madde_y = kutu_y + kutu_yuksekligi - basit_h - 5.5 * mm
        ic_pad = 3.5 * mm
        for madde in rol_maddeleri[rol_adi]:
            p = Paragraph(madde, madde_stili)
            pw, ph = p.wrap(kutu_genislik - 2 * ic_pad, kutu_yuksekligi)
            p.drawOn(c, kutu_x + ic_pad, madde_y - ph)
            madde_y -= ph + 3 * mm

    if sistem_notu:
        c.setFont(FONT_NORMAL, 9.2)
        c.setFillColor(METIN_ACIK)
        c.drawCentredString(W / 2, bolum_alt + 2.2 * mm, "✦ " + sistem_notu)

c.showPage()
c.save()
print("PDF olusturuldu (v3 - canli/gradyanli).")
