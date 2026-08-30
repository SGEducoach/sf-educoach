# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
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
ZEMIN_ACIK = HexColor("#F7FAFB")

ROLLER = [
    ("ÖĞRENCİ", TURKUAZ),
    ("ÖĞRETMEN", LACIVERT),
    ("VELİ", CORAL),
]

# Bölüm 1 ve 2: üç ayrı pencere (rol başına kutu). Bölüm 3: tek pencere,
# rol başına tek paragraf (kullanıcı isteği, 29.08.2026).
BOLUMLER = [
    ("1", "ÜYELİK / GİRİŞ", {
        "ÖĞRENCİ": ["Okulunu/dershanesini seçip okul numarasıyla kayıt olur, şifresini kendisi oluşturur."],
        "ÖĞRETMEN": ["Kurumu tarafından tanımlanan hesapla giriş yapar, sınıfı otomatik atanmış olur."],
        "VELİ": ["Kaydolur ve çocuğuyla bağlantı için kod talebinde bulunur."],
    }, None),
    ("2", "NASIL KULLANILIR?", {
        "ÖĞRENCİ": ["Çalıştığı konuları, çözdüğü soruları ve deneme sonuçlarını sisteme günlük olarak girer."],
        "ÖĞRETMEN": ["Ödev verir, çalışmaları takip eder ve öğrencisine geri bildirim sağlar."],
        "VELİ": ["Çocuğunun günlük çalışmasını ve deneme sonuçlarını kendi ekranından izler."],
    }, "Sistem tüm verileri otomatik olarak net, hız ve konu bazlı grafiklere dönüştürür."),
    ("3", "SONUÇ", {
        "ÖĞRENCİ": "Yapay zekâ analiziyle süreci takip eder, konu hakimiyetini ve gelişimini net verilerle görür.",
        "ÖĞRETMEN": "Sınıfının genel performansını tek ekrandan izler, doğru zamanda müdahale eder.",
        "VELİ": "Çocuğunun akademik sürecini şeffaf biçimde takip eder, evde nasıl destek olacağını bilir.",
    }, "Üç taraf da aynı veriye bakarak iletişim kurar."),
]

W, H = A4
MARGIN = 14 * mm
ICERIK_GENISLIK = W - 2 * MARGIN
AFIS_DIZIN = "E:/SG_EDUCOACH/tmp/pdfs/afis/"

c = canvas.Canvas(AFIS_DIZIN + "sefu_koc_nedir_afis_v4.pdf", pagesize=A4)

# ---- 1) Gradyanlı, süsleme daireli başlık bandı ----
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

# ---- 2) Alt CTA bandı ----
CTA_H = 34 * mm
c.drawImage(gradient_img, 0, 0, width=W, height=CTA_H, mask=None)

qr_boyut = 22 * mm
qr_img = ImageReader(AFIS_DIZIN + "qr_giris.png")
qr_x = W - MARGIN - qr_boyut
qr_y = CTA_H / 2 - qr_boyut / 2
c.setFillColor(BEYAZ)
c.roundRect(qr_x - 2.5*mm, qr_y - 2.5*mm, qr_boyut + 5*mm, qr_boyut + 5*mm, 2.5*mm, stroke=0, fill=1)
c.drawImage(qr_img, qr_x, qr_y, width=qr_boyut, height=qr_boyut)

c.setFont(FONT_BOLD, 17)
c.setFillColor(BEYAZ)
c.drawString(MARGIN, CTA_H / 2 + 4.5*mm, "Hemen Giriş Yap, Farkı Gör!")
c.setFont(FONT_NORMAL, 10.5)
c.drawString(MARGIN, CTA_H / 2 - 3.5*mm, "sefukoc.vercel.app  ·  QR kodu okutman yeterli")

# ---- 3) Gövde: 3 bölüm ----
madde_stili = ParagraphStyle(
    "madde", fontName=FONT_NORMAL, fontSize=9.4, leading=12.8,
    textColor=METIN, alignment=TA_CENTER,
)
sonuc_stili = ParagraphStyle(
    "sonuc", fontName=FONT_NORMAL, fontSize=9.6, leading=13.2,
    textColor=METIN, alignment=TA_LEFT,
)

alan_ust = H - HEADER_H - 7 * mm
alan_alt = CTA_H + 7 * mm
toplam_yukseklik = alan_ust - alan_alt
bolum_bosluk = 6 * mm
bolum_yuksekligi = (toplam_yukseklik - 2 * bolum_bosluk) / 3

kutu_bosluk = 4 * mm
kutu_genislik = (ICERIK_GENISLIK - 2 * kutu_bosluk) / 3

for i, (no, baslik, rol_icerik, sistem_notu) in enumerate(BOLUMLER):
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

    if no != "3":
        # ---- Bölüm 1 ve 2: üç ayrı pencere (rol başına kutu) ----
        for j, (rol_adi, rol_renk) in enumerate(ROLLER):
            kutu_x = MARGIN + j * (kutu_genislik + kutu_bosluk)
            kutu_y = kutular_alt

            c.saveState()
            c.setFillColor(rol_renk)
            c.setFillAlpha(0.16)
            c.roundRect(kutu_x, kutu_y, kutu_genislik, kutu_yuksekligi, 3.5 * mm, stroke=0, fill=1)
            c.restoreState()

            basit_h = 8 * mm
            c.setFillColor(rol_renk)
            c.roundRect(kutu_x, kutu_y + kutu_yuksekligi - basit_h, kutu_genislik, basit_h, 3.5 * mm, stroke=0, fill=1)
            c.rect(kutu_x, kutu_y + kutu_yuksekligi - basit_h, kutu_genislik, basit_h / 2, stroke=0, fill=1)

            c.setStrokeColor(rol_renk)
            c.setLineWidth(1.1)
            c.roundRect(kutu_x, kutu_y, kutu_genislik, kutu_yuksekligi, 3.5 * mm, stroke=1, fill=0)

            c.setFillColor(BEYAZ)
            c.setFont(FONT_BOLD, 10.8)
            c.drawCentredString(kutu_x + kutu_genislik / 2, kutu_y + kutu_yuksekligi - basit_h / 2 - 3.2, rol_adi)

            madde_y = kutu_y + kutu_yuksekligi - basit_h - 5.5 * mm
            ic_pad = 3.5 * mm
            for madde in rol_icerik[rol_adi]:
                p = Paragraph(madde, madde_stili)
                pw, ph = p.wrap(kutu_genislik - 2 * ic_pad, kutu_yuksekligi)
                p.drawOn(c, kutu_x + ic_pad, madde_y - ph)
                madde_y -= ph + 3 * mm
    else:
        # ---- Bölüm 3 (SONUÇ): tek pencere, rol başına tek paragraf ----
        panel_x, panel_y = MARGIN, kutular_alt
        panel_w, panel_h = ICERIK_GENISLIK, kutu_yuksekligi

        c.setFillColor(ZEMIN_ACIK)
        c.roundRect(panel_x, panel_y, panel_w, panel_h, 3.5 * mm, stroke=0, fill=1)
        c.setStrokeColor(HexColor("#E4E9EE"))
        c.setLineWidth(1)
        c.roundRect(panel_x, panel_y, panel_w, panel_h, 3.5 * mm, stroke=1, fill=0)

        ic_pad_x = 6 * mm
        satir_h = panel_h / 3
        rozet_w, rozet_h = 26 * mm, 6.4 * mm
        for k, (rol_adi, rol_renk) in enumerate(ROLLER):
            satir_ust = panel_y + panel_h - k * satir_h
            satir_orta_y = satir_ust - satir_h / 2

            if k > 0:
                c.setStrokeColor(HexColor("#E4E9EE"))
                c.setLineWidth(0.8)
                c.line(panel_x + ic_pad_x, satir_ust, panel_x + panel_w - ic_pad_x, satir_ust)

            rozet_x = panel_x + ic_pad_x
            rozet_y = satir_orta_y - rozet_h / 2
            c.setFillColor(rol_renk)
            c.roundRect(rozet_x, rozet_y, rozet_w, rozet_h, rozet_h / 2, stroke=0, fill=1)
            c.setFillColor(BEYAZ)
            c.setFont(FONT_BOLD, 9.6)
            c.drawCentredString(rozet_x + rozet_w / 2, rozet_y + rozet_h / 2 - 3.2, rol_adi)

            metin_x = rozet_x + rozet_w + 5 * mm
            metin_genislik = panel_x + panel_w - ic_pad_x - metin_x
            p = Paragraph(rol_icerik[rol_adi], sonuc_stili)
            pw, ph = p.wrap(metin_genislik, satir_h)
            p.drawOn(c, metin_x, satir_orta_y - ph / 2)

    if sistem_notu:
        c.setFont(FONT_NORMAL, 9.2)
        c.setFillColor(METIN_ACIK)
        c.drawCentredString(W / 2, bolum_alt + 2.2 * mm, "• " + sistem_notu)

c.showPage()
c.save()
print("PDF oluşturuldu (v4 - Üyelik/Giriş, Nasıl Kullanılır, Sonuç).")
