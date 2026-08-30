# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
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
BEYAZ = HexColor("#FFFFFF")
GRI_CIZGI = HexColor("#D8DEE4")

ROLLER = [
    ("ÖĞRENCİ", TURKUAZ),
    ("ÖĞRETMEN", LACIVERT),
    ("VELİ", CORAL),
]

W, H = A4
MARGIN = 16 * mm
ICERIK_GENISLIK = W - 2 * MARGIN

c = canvas.Canvas("E:/SG_EDUCOACH/tmp/pdfs/afis/sefu_koc_nedir_afis.pdf", pagesize=A4)

# ---- Baslik alani ----
logo_path = "E:/SG_EDUCOACH/public/logo.png"
logo = ImageReader(logo_path)
logo_w_px, logo_h_px = logo.getSize()
logo_h = 15 * mm
logo_w = logo_h * (logo_w_px / logo_h_px)
logo_y = H - MARGIN - logo_h
c.drawImage(logo, MARGIN, logo_y, width=logo_w, height=logo_h, mask='auto')

c.setFont(FONT_BOLD, 27)
c.setFillColor(LACIVERT)
c.drawCentredString(W / 2, H - MARGIN - 11.5 * mm, "SeFu Koç Nedir?")

ayrac_y = logo_y - 5 * mm
c.setStrokeColor(TURKUAZ)
c.setLineWidth(1.6)
c.line(MARGIN, ayrac_y, W - MARGIN, ayrac_y)

# ---- Icerik stilleri ----
madde_stili = ParagraphStyle(
    "madde", fontName=FONT_NORMAL, fontSize=9.6, leading=13.2,
    textColor=METIN, alignment=TA_LEFT,
)
sistem_notu_stili = ParagraphStyle(
    "sistemnotu", fontName=FONT_NORMAL, fontSize=9.6, leading=13.2,
    textColor=HexColor("#5A6472"), alignment=TA_CENTER, fontName_=None,
)

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

alan_ust = ayrac_y - 8 * mm
alan_alt = MARGIN
toplam_yukseklik = alan_ust - alan_alt
bolum_bosluk = 7 * mm
bolum_yuksekligi = (toplam_yukseklik - 2 * bolum_bosluk) / 3

kutu_bosluk = 4 * mm
kutu_genislik = (ICERIK_GENISLIK - 2 * kutu_bosluk) / 3

for i, (no, baslik, rol_maddeleri, sistem_notu) in enumerate(BOLUMLER):
    bolum_ust = alan_ust - i * (bolum_yuksekligi + bolum_bosluk)
    bolum_alt = bolum_ust - bolum_yuksekligi

    # --- Bolum basligi: numara rozeti + baslik ---
    rozet_cap = 8 * mm
    rozet_merkez_y = bolum_ust - rozet_cap / 2
    c.setFillColor(LACIVERT)
    c.circle(MARGIN + rozet_cap / 2, rozet_merkez_y, rozet_cap / 2, stroke=0, fill=1)
    c.setFillColor(BEYAZ)
    c.setFont(FONT_BOLD, 11)
    c.drawCentredString(MARGIN + rozet_cap / 2, rozet_merkez_y - 3.8, no)

    c.setFillColor(LACIVERT)
    c.setFont(FONT_BOLD, 14.5)
    c.drawString(MARGIN + rozet_cap + 3.5 * mm, rozet_merkez_y - 3.8, baslik)

    kutular_ust = bolum_ust - rozet_cap - 4 * mm
    sistem_notu_yuksekligi = 7 * mm if sistem_notu else 0
    kutular_alt = bolum_alt + sistem_notu_yuksekligi
    kutu_yuksekligi = kutular_ust - kutular_alt

    # --- 3 yan yana rol kutusu ---
    for j, (rol_adi, rol_renk) in enumerate(ROLLER):
        kutu_x = MARGIN + j * (kutu_genislik + kutu_bosluk)
        kutu_y = kutular_alt

        # Hafif tonlanmis zemin (fotokopi/baski dostu - koyu degil)
        c.saveState()
        c.setFillColor(rol_renk)
        c.setFillAlpha(0.07)
        c.roundRect(kutu_x, kutu_y, kutu_genislik, kutu_yuksekligi, 3 * mm, stroke=0, fill=1)
        c.restoreState()

        # Ust renkli serit
        serit_yuksekligi = 2.2 * mm
        c.setFillColor(rol_renk)
        c.roundRect(kutu_x, kutu_y + kutu_yuksekligi - serit_yuksekligi, kutu_genislik, serit_yuksekligi, 1.2 * mm, stroke=0, fill=1)

        # Ince cerceve
        c.setStrokeColor(rol_renk)
        c.setLineWidth(0.7)
        c.roundRect(kutu_x, kutu_y, kutu_genislik, kutu_yuksekligi, 3 * mm, stroke=1, fill=0)

        # Rol basligi
        c.setFillColor(rol_renk)
        c.setFont(FONT_BOLD, 10.5)
        c.drawCentredString(kutu_x + kutu_genislik / 2, kutu_y + kutu_yuksekligi - serit_yuksekligi - 6.5 * mm, rol_adi)

        # Maddeler (Paragraph ile ortadan hizali sarma)
        madde_stili.alignment = TA_CENTER
        madde_y = kutu_y + kutu_yuksekligi - serit_yuksekligi - 11 * mm
        ic_pad = 3.5 * mm
        for madde in rol_maddeleri[rol_adi]:
            p = Paragraph(madde, madde_stili)
            pw, ph = p.wrap(kutu_genislik - 2 * ic_pad, kutu_yuksekligi)
            p.drawOn(c, kutu_x + ic_pad, madde_y - ph)
            madde_y -= ph + 3 * mm

    # --- Sistem notu (varsa), kutularin altinda ortali ---
    if sistem_notu:
        c.setFont(FONT_NORMAL, 9.3)
        c.setFillColor(HexColor("#5A6472"))
        italic_font = FONT_NORMAL
        c.drawCentredString(W / 2, bolum_alt + 2.2 * mm, "• " + sistem_notu)

c.showPage()
c.save()
print("PDF olusturuldu (v2 - kutulu).")
