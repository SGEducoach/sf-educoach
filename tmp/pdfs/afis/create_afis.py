# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# Turkce karakterler icin DejaVu Sans (Windows'ta genelde bulunur) veya
# reportlab'in kendi Helvetica'si (Turkce karakterleri kismen destekler,
# ama ı/İ/ğ/ş gibi harflerde sorun cikarabilir) yerine TTF font kaydediyoruz.
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

LACIVERT = "#0F2540"
TURKUAZ = "#14B8B0"
METIN = "#2B3542"
METIN_ACIK = "#5A6472"

W, H = A4
MARGIN = 20 * mm
ICERIK_GENISLIK = W - 2 * MARGIN

c = canvas.Canvas("E:/SG_EDUCOACH/tmp/pdfs/afis/sefu_koc_nedir_afis.pdf", pagesize=A4)

# ---- Baslik alani ----
logo_path = "E:/SG_EDUCOACH/public/logo.png"
logo = ImageReader(logo_path)
logo_w_px, logo_h_px = logo.getSize()
logo_h = 16 * mm
logo_w = logo_h * (logo_w_px / logo_h_px)
logo_y = H - MARGIN - logo_h
c.drawImage(logo, MARGIN, logo_y, width=logo_w, height=logo_h, mask='auto')

c.setFont(FONT_BOLD, 26)
c.setFillColor(LACIVERT)
c.drawCentredString(W / 2, H - MARGIN - 12 * mm, "SeFu Koç Nedir?")

# Ince ayrac cizgisi
c.setStrokeColor(TURKUAZ)
c.setLineWidth(1.4)
ayrac_y = logo_y - 6 * mm
c.line(MARGIN, ayrac_y, W - MARGIN, ayrac_y)

# ---- Bolum stili ----
madde_stili = ParagraphStyle(
    "madde", fontName=FONT_NORMAL, fontSize=11.3, leading=15.5,
    textColor=METIN, alignment=TA_LEFT, spaceAfter=5.5,
    bulletIndent=0, leftIndent=12,
)

BOLUMLER = [
    ("1", "KULLANIM", [
        "Öğrenci, okul numarası ve şifresiyle; öğretmen e-posta ve şifresiyle giriş yapar.",
        "Veli, öğrencinin numarası ve öğretmen onaylı bağlantı koduyla hesabını tamamlar — ayrı bir e-posta/şifre gerekmez.",
        "Her rol, girişten sonra kendine özel bir menüyle karşılanır: öğrenci veri girişini, öğretmen sınıfını, veli çocuğunun takibini görür.",
        "Duyurular ve bildirimler menüden tüm rollere aynı şekilde ulaşır.",
        "Şifresini unutan öğretmen/müdür kendisi sıfırlar; öğrenci/veli okulunun yetkilisine başvurur.",
    ]),
    ("2", "İŞLEYİŞ", [
        "Öğrenci; günlük konu çalışmasını, soru çözümünü ve deneme sonuçlarını sisteme girer.",
        "Sistem bu verileri otomatik olarak net, hız ve konu bazlı grafiklere dönüştürür.",
        "Öğretmen, kendi sınıfındaki öğrencilerin gelişimini anlık izler; ödev ve çalışma programı atar.",
        "Veli, çocuğunun çalışma ve deneme performansını kendi ekranından aynı anda takip eder.",
        "Rozet ve hatırlatma sistemi düzenli veri girişini teşvik eder.",
    ]),
    ("3", "FAYDA", [
        "Öğrenci kendi gelişimini somut verilerle görür, eksik konularını erken fark eder.",
        "Öğretmen sınıfının genelini tek ekrandan izler, doğru öğrenciye doğru zamanda müdahale eder.",
        "Veli, çocuğunun okul dışındaki çalışma disiplinini şeffaf şekilde görür, habersiz kalmaz.",
        "Üç taraf da aynı veriye bakarak iletişim kurar — yanlış anlaşılma ve bilgi kaybı azalır.",
    ]),
]

alan_ust = ayrac_y - 10 * mm
alan_alt = MARGIN
toplam_yukseklik = alan_ust - alan_alt
bolum_yuksekligi = toplam_yukseklik / 3

for i, (no, baslik, maddeler) in enumerate(BOLUMLER):
    bolum_ust = alan_ust - i * bolum_yuksekligi
    bolum_alt = bolum_ust - bolum_yuksekligi

    # Bolum basligi: numara rozeti + metin, ince turkuaz alt cizgi
    rozet_cap = 9 * mm
    rozet_merkez_y = bolum_ust - rozet_cap / 2
    c.setFillColor(LACIVERT)
    c.circle(MARGIN + rozet_cap / 2, rozet_merkez_y, rozet_cap / 2, stroke=0, fill=1)
    c.setFillColor("#FFFFFF")
    c.setFont(FONT_BOLD, 12)
    c.drawCentredString(MARGIN + rozet_cap / 2, rozet_merkez_y - 4.2, no)

    c.setFillColor(LACIVERT)
    c.setFont(FONT_BOLD, 15)
    c.drawString(MARGIN + rozet_cap + 4 * mm, rozet_merkez_y - 4.2, baslik)

    baslik_alt_y = bolum_ust - rozet_cap - 3 * mm
    c.setStrokeColor(TURKUAZ)
    c.setLineWidth(0.8)
    c.line(MARGIN, baslik_alt_y, W - MARGIN, baslik_alt_y)

    # Maddeler (bullet + Paragraph ile otomatik satir sarma)
    madde_y = baslik_alt_y - 7 * mm
    bullet_x = MARGIN + 2 * mm
    metin_x = MARGIN + 8 * mm
    metin_genislik = ICERIK_GENISLIK - 8 * mm

    for madde in maddeler:
        p = Paragraph(madde, madde_stili)
        pw, ph = p.wrap(metin_genislik, bolum_yuksekligi)
        c.setFillColor(TURKUAZ)
        c.circle(bullet_x, madde_y - 3.2, 1.3, stroke=0, fill=1)
        p.drawOn(c, metin_x, madde_y - ph + 3)
        madde_y -= ph + 2

c.showPage()
c.save()
print("PDF olusturuldu.")
