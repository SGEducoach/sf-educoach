# -*- coding: utf-8 -*-
"""SeFu Koç Ortaokul Paneli — kurum tanıtım ve uygulama kılavuzu (A4, basıma hazır).

Çalıştırma:  py ortaokul/kilavuz-uret.py
Çıktı:       ortaokul/SeFu_Ortaokul_Paneli_Kurum_Kilavuzu.pdf

Baskı ilkesi (kullanıcı kararı): fotokopiye dayanıklı olmalı — dolu koyu zemin
ve gradyan KULLANILMAZ. Yapı ince çizgiler ve açık tonlarla kurulur.

Ders/çıktı sayıları ortaokul/veri/*.json'dan OKUNUR; kılavuz veriyle birlikte
güncel kalır, elle sayı yazılmaz.
"""

import json
import os
import glob

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

KOK = os.path.dirname(os.path.abspath(__file__))
CIKTI = os.path.join(KOK, "SeFu_Ortaokul_Paneli_Kurum_Kilavuzu.pdf")
LOGO = os.path.join(KOK, "..", "public", "icon-192.png")

# ---- Yazı tipi: Türkçe harfler için gömülü TTF şart (yerleşik fontlarda ğ/ı/ş yok)
FONTLAR = {
    "SeFu": r"C:\Windows\Fonts\segoeui.ttf",
    "SeFu-Bold": r"C:\Windows\Fonts\segoeuib.ttf",
    "SeFu-Italic": r"C:\Windows\Fonts\segoeuii.ttf",
}
for ad, yol in FONTLAR.items():
    pdfmetrics.registerFont(TTFont(ad, yol))
pdfmetrics.registerFontFamily("SeFu", normal="SeFu", bold="SeFu-Bold", italic="SeFu-Italic")

MAVI = colors.HexColor("#17506B")       # başlık ve çizgiler
ACIK = colors.HexColor("#C2E9F8")       # marka mavisi — yalnız ince vurgu
TINT = colors.HexColor("#EAF6FB")       # tablo başlığı için çok açık ton
GRI = colors.HexColor("#444444")
CIZGI = colors.HexColor("#9AA5AC")

s = getSampleStyleSheet()
G = ParagraphStyle("G", parent=s["Normal"], fontName="SeFu", fontSize=10, leading=15,
                   textColor=colors.black, alignment=TA_JUSTIFY, spaceAfter=5)
GK = ParagraphStyle("GK", parent=G, alignment=0)
H1 = ParagraphStyle("H1", parent=G, fontName="SeFu-Bold", fontSize=15, leading=19,
                    textColor=MAVI, spaceBefore=10, spaceAfter=7, alignment=0)
H2 = ParagraphStyle("H2", parent=G, fontName="SeFu-Bold", fontSize=11.5, leading=15,
                    textColor=colors.black, spaceBefore=8, spaceAfter=3, alignment=0)
KUCUK = ParagraphStyle("KUCUK", parent=G, fontSize=8.5, leading=12, textColor=GRI)
HUCRE = ParagraphStyle("HUCRE", parent=G, fontSize=9, leading=12.5, spaceAfter=0, alignment=0)
HUCRE_B = ParagraphStyle("HUCRE_B", parent=HUCRE, fontName="SeFu-Bold")
KAPAK_BASLIK = ParagraphStyle("KB", parent=G, fontName="SeFu-Bold", fontSize=26, leading=32,
                              textColor=MAVI, alignment=TA_CENTER, spaceAfter=4)
KAPAK_ALT = ParagraphStyle("KA", parent=G, fontSize=13, leading=18, alignment=TA_CENTER,
                           textColor=colors.black, spaceAfter=3)


def p(metin, stil=G):
    return Paragraph(metin, stil)


def madde(metinler, stil=GK):
    """Kurşun işaretli liste — fotokopide kaybolmayan düz tire."""
    return [Paragraph("—&nbsp;&nbsp;" + m, stil) for m in metinler]


def tablo(veri, genislikler, baslikli=True):
    # Düz metin hücreleri Paragraph'a sarılır; aksi hâlde uzun metin hücreye
    # sığmayıp komşu sütunun üstüne taşıyor.
    sarili = []
    for i, satir in enumerate(veri):
        yeni = []
        for h in satir:
            if isinstance(h, str):
                yeni.append(Paragraph(h, HUCRE_B if (baslikli and i == 0) else HUCRE))
            else:
                yeni.append(h)
        sarili.append(yeni)
    veri = sarili
    t = Table(veri, colWidths=genislikler, hAlign="LEFT", repeatRows=1 if baslikli else 0)
    stil = [
        ("FONTNAME", (0, 0), (-1, -1), "SeFu"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, CIZGI),
    ]
    if baslikli:
        stil += [("BACKGROUND", (0, 0), (-1, 0), TINT),
                 ("FONTNAME", (0, 0), (-1, 0), "SeFu-Bold")]
    t.setStyle(TableStyle(stil))
    return t


def kutu(icerik):
    """Çerçeveli vurgu kutusu — zemin dolgusu yok, yalnız çizgi."""
    t = Table([[icerik]], colWidths=[165 * mm], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.9, MAVI),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def kutucuk_listesi(satirlar):
    """İşaretlenebilir kontrol listesi."""
    veri = [["\u25A1", Paragraph(x, HUCRE)] for x in satirlar]
    t = Table(veri, colWidths=[8 * mm, 157 * mm], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "SeFu"),
        ("FONTSIZE", (0, 0), (0, -1), 13),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("LINEBELOW", (1, 0), (1, -1), 0.3, colors.HexColor("#D5DBDF")),
    ]))
    return t


def not_satirlari(adet=12, genislik=165 * mm):
    veri = [[""] for _ in range(adet)]
    t = Table(veri, colWidths=[genislik], rowHeights=[9 * mm] * adet, hAlign="LEFT")
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.4, CIZGI)]))
    return t


# ---- Müfredat sayıları: veriden okunur -------------------------------------

def mufredat_ozeti():
    ozet = {}
    for yol in sorted(glob.glob(os.path.join(KOK, "veri", "*-taslak.json"))):
        with open(yol, encoding="utf-8") as f:
            v = json.load(f)
        gruplar = v.get("temalar") or v.get("beceriler") or []
        n = sum(len(g.get("ogrenmeCiktilari", [])) for g in gruplar)
        ozet.setdefault(v["ders"], {})[str(v["sinif"])] = n
    return ozet


OZET = mufredat_ozeti()
TOPLAM_CIKTI = sum(sum(v.values()) for v in OZET.values())

# ---- Sayfa çerçevesi --------------------------------------------------------

SAYFA_W, SAYFA_H = A4
KENAR = 22 * mm


def sayfa_cerceve(canvas, doc):
    canvas.saveState()
    canvas.setFont("SeFu", 8)
    canvas.setFillColor(GRI)
    canvas.drawString(KENAR, 12 * mm, "SeFu Koç — Ortaokul Paneli Kurum Kılavuzu")
    canvas.drawRightString(SAYFA_W - KENAR, 12 * mm, "Sayfa %d" % canvas.getPageNumber())
    canvas.setStrokeColor(CIZGI)
    canvas.setLineWidth(0.4)
    canvas.line(KENAR, 16 * mm, SAYFA_W - KENAR, 16 * mm)
    canvas.restoreState()


def kapak_cerceve(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(MAVI)
    canvas.setLineWidth(1.1)
    canvas.rect(14 * mm, 14 * mm, SAYFA_W - 28 * mm, SAYFA_H - 28 * mm)
    canvas.setStrokeColor(ACIK)
    canvas.setLineWidth(2.5)
    canvas.line(14 * mm, SAYFA_H - 70 * mm, SAYFA_W - 14 * mm, SAYFA_H - 70 * mm)
    canvas.restoreState()


doc = BaseDocTemplate(CIKTI, pagesize=A4,
                      leftMargin=KENAR, rightMargin=KENAR,
                      topMargin=20 * mm, bottomMargin=20 * mm,
                      title="SeFu Koç Ortaokul Paneli — Kurum Kılavuzu",
                      author="SeFu Koç")
cerceve = Frame(KENAR, 20 * mm, SAYFA_W - 2 * KENAR, SAYFA_H - 40 * mm, id="ana")
doc.addPageTemplates([
    PageTemplate(id="kapak", frames=[cerceve], onPage=kapak_cerceve),
    PageTemplate(id="ic", frames=[cerceve], onPage=sayfa_cerceve),
])

A = []

# ============================ KAPAK =========================================
A.append(Spacer(1, 26 * mm))
if os.path.exists(LOGO):
    A.append(Image(LOGO, width=26 * mm, height=26 * mm, hAlign="CENTER"))
    A.append(Spacer(1, 8 * mm))
A.append(p("SeFu Koç", KAPAK_BASLIK))
A.append(p("Ortaokul Paneli", KAPAK_BASLIK))
A.append(Spacer(1, 6 * mm))
A.append(p("Kurum Tanıtım ve Uygulama Kılavuzu", KAPAK_ALT))
A.append(Spacer(1, 3 * mm))
A.append(p("5, 6, 7 ve 8. sınıflar · LGS hazırlığı", KAPAK_ALT))
A.append(Spacer(1, 30 * mm))
A.append(kutu(p(
    "Bu kılavuz, ortaokul panelinin <b>ne yaptığını</b>, <b>kimin ne gördüğünü</b> ve "
    "<b>kurumda nasıl uygulanacağını</b> anlatmak için hazırlanmıştır. Görüşmede birlikte "
    "okunmak, sonunda karar ve sorumluların yazılması için tasarlandı.", G)))
A.append(Spacer(1, 12 * mm))
A.append(tablo([
    [p("Kurum", HUCRE_B), p("", HUCRE)],
    [p("Görüşme tarihi", HUCRE_B), p("", HUCRE)],
    [p("Katılımcılar", HUCRE_B), p("", HUCRE)],
    [p("SeFu Koç yetkilisi", HUCRE_B), p("", HUCRE)],
], [42 * mm, 123 * mm], baslikli=False))
A.append(NextPageTemplate("ic"))
A.append(PageBreak())

# ============================ 1. BU KILAVUZ =================================
A.append(p("1. Bu kılavuz ne için?", H1))
A.append(p(
    "SeFu Koç, lise düzeyinde (YKS) çalışan bir öğrenci takip ve koçluk sistemidir. "
    "Ortaokul paneli, aynı altyapı üzerine kurulan <b>ayrı bir deneyimdir</b> — lise panelinin "
    "küçültülmüş kopyası değildir. Bu kılavuz ön görüşme içindir: neyin sunulduğunu, kurumdan "
    "ne beklendiğini ve uygulamanın hangi adımlarla ilerleyeceğini tek belgede toplar.", G))
A.append(Spacer(1, 3 * mm))
A.append(p("Kılavuzun bölümleri", H2))
A.extend(madde([
    "<b>2-3.</b> Panel nedir, kim ne görür",
    "<b>4.</b> İçerik: hangi dersler, kaç öğrenme çıktısı",
    "<b>5.</b> İşleyiş: bir hafta nasıl geçer",
    "<b>6.</b> Ölçme ve LGS",
    "<b>7.</b> Çocuk güvenliği ve kişisel veriler",
    "<b>8-9.</b> Uygulama adımları ve kurumdan beklenenler",
    "<b>10-11.</b> Sık sorulan sorular ve görüşme notu",
]))

# ============================ 2. PANEL NEDİR ================================
A.append(p("2. Ortaokul paneli nedir?", H1))
A.append(p(
    "Panelin tek bir amacı var: öğrenci her girdiğinde <b>“şimdi ne yapmalıyım?”</b> sorusuna "
    "on saniye içinde cevap bulsun. Bunun için öğretmenin verdiği görev, öğrencinin kendi planı "
    "ve deneme sonuçları tek bir akışta birleştirilir.", G))
A.append(Spacer(1, 2 * mm))
A.append(p("Sorumluluk sınıfa göre kademeli devredilir:", G))
A.append(Spacer(1, 2 * mm))
A.append(tablo([
    ["Sınıf", "Odak", "Panelin davranışı", "Öğrencinin sorumluluğu"],
    ["5", "Rutin kurma", "Büyük kartlar, tek adımlı görev", "Günlük görevi tamamlamak"],
    ["6", "Düzenli çalışma", "Haftalık hedef, kısa kontrol listesi", "Planı öneriyle düzenlemek"],
    ["7", "Öz düzenleme", "Konu haritası, süre takibi", "Ders bazlı hedef koymak"],
    ["8", "LGS hazırlığı", "LGS modu, deneme analizi, tekrar döngüsü", "Planı yönetmek"],
], [14 * mm, 30 * mm, 66 * mm, 55 * mm]))
A.append(Spacer(1, 4 * mm))
A.append(kutu(p(
    "<b>Bilinçli olarak yapmadıklarımız:</b> öğrenciler arası mesajlaşma yok, herkese açık "
    "sıralama tablosu yok, not veya net üzerinden rozet yok, 5. sınıfa LGS geri sayımı yok. "
    "Bunlar kaygıyı artırdığı ve öğrenmeyi yarışa çevirdiği için kapsam dışı bırakıldı.", G)))

A.append(PageBreak())

# ============================ 3. ROLLER =====================================
A.append(p("3. Kim ne görür?", H1))
A.append(p(
    "Her rol yalnızca işini yapmak için gereken kadarını görür. Sınırlar teknik olarak "
    "uygulanır; “göreceği varsayılmaz”, sunucu tarafında engellenir.", G))
A.append(Spacer(1, 2 * mm))
A.append(tablo([
    ["Rol", "Görür", "Göremez / yapamaz"],
    ["Öğrenci", "Kendi görev, plan, ders ve deneme sonuçları; yardım isteyebilir",
     "Başka öğrencinin notu, sıralaması, profili"],
    ["Veli", "Yalnız eşleştiği çocuğun haftalık sade özeti, yaklaşan tarihler",
     "Rehberlik notları; öğrenci adına veri girmek veya plan değiştirmek"],
    ["Branş öğretmeni", "Yetkili olduğu sınıfın görev, teslim ve kazanım durumu",
     "Başka branşın değerlendirmesini düzenlemek"],
    ["Rehber öğretmen", "Öğrencinin dersler arası iş yükü, risk sinyalleri, görüşme notları",
     "Akademik notu veya branş kazanımını değiştirmek"],
    ["Müdür", "Kurum, sınıf ve ders düzeyinde toplu performans",
     "Öğrencinin özel rehberlik notlarının içeriği"],
], [28 * mm, 73 * mm, 64 * mm]))
A.append(Spacer(1, 3 * mm))
A.append(p(
    "<b>Velinin konumu özellikle önemlidir.</b> Veli paneli bir gözetim aracı değil, destek "
    "rehberidir: çocuğun güçlü yönü, desteğe ihtiyaç duyduğu alan ve evde uygulanabilecek tek "
    "bir öneri gösterilir. Teknik kazanım tablosu veliye açılmaz.", G))

# ============================ 4. İÇERİK =====================================
A.append(p("4. İçerik: neyi kapsıyor?", H1))
A.append(p(
    "Müfredat, <b>MEB 2024 Maarif Modeli</b> öğretim programlarından alınmıştır. Panel, konu "
    "başlıklarıyla değil programın kendi <b>öğrenme çıktılarıyla</b> çalışır; böylece öğretmenin "
    "verdiği görev ile ölçme sonucu aynı dile bağlanır.", G))
A.append(Spacer(1, 2 * mm))

ders_sirasi = ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler",
               "T.C. İnkılap Tarihi ve Atatürkçülük", "Din Kültürü ve Ahlak Bilgisi"]
# Sayı sütunları ortalanır; hücreler Paragraph olduğu için hizalama ve
# kalınlık tablo stiliyle değil paragraf stiliyle verilmeli.
ORTA = ParagraphStyle("ORTA", parent=HUCRE, alignment=TA_CENTER)
ORTA_B = ParagraphStyle("ORTA_B", parent=ORTA, fontName="SeFu-Bold")

satirlar = [[p("Ders", HUCRE_B)] + [p(x, ORTA_B) for x in ("5", "6", "7", "8", "Toplam")]]
for d in ders_sirasi:
    if d not in OZET:
        continue
    g = OZET[d]
    satirlar.append([p(d, HUCRE)]
                    + [p(str(g.get(k, "—")), ORTA) for k in ("5", "6", "7", "8")]
                    + [p(str(sum(g.values())), ORTA)])
satirlar.append([p("Toplam", HUCRE_B)] + [p("", ORTA)] * 4 + [p(str(TOPLAM_CIKTI), ORTA_B)])
A.append(tablo(satirlar, [62 * mm, 17 * mm, 17 * mm, 17 * mm, 17 * mm, 22 * mm]))
A.append(Spacer(1, 3 * mm))
A.append(p(
    "Toplam <b>%d öğrenme çıktısı</b> kaynak programlardan çıkarılmış ve her ders için programın "
    "kendi bildirdiği çıktı sayısıyla karşılaştırılarak doğrulanmıştır." % TOPLAM_CIKTI, G))
A.append(Spacer(1, 2 * mm))
A.extend(madde([
    "<b>Türkçe</b> tema değil beceri temelli işler: okuma, dinleme/izleme, yazma, konuşma ayrı izlenir.",
    "<b>Sosyal Bilgiler</b> 5-7. sınıfta; 8. sınıfta yerini T.C. İnkılap Tarihi ve Atatürkçülük alır.",
    "<b>İngilizce</b> programı numaralı öğrenme çıktısı vermez; ünite ve iletişim görevleriyle izlenir.",
    "Müfredat sürümlüdür: MEB programı değişince eski sürüm arşivlenir, geçmiş veri bozulmaz.",
]))

A.append(PageBreak())

# ============================ 5. İŞLEYİŞ ====================================
A.append(p("5. İşleyiş: bir hafta nasıl geçer?", H1))
A.append(tablo([
    ["Adım", "Kim", "Ne olur"],
    ["1", "Branş öğretmeni", "Sınıfa görev verir; görevi bir derse ve öğrenme çıktısına bağlar, "
     "tahmini süreyi ve teslim gününü yazar."],
    ["2", "Sistem", "Aynı güne yığılan görevleri öğretmene gösterir; öğrenciye günde en fazla "
     "üç öncelikli iş düşer."],
    ["3", "Öğrenci", "“Bugün” ekranından işe başlar. Her kartta tek bir eylem vardır: "
     "Başla / Devam et / Teslim et."],
    ["4", "Öğrenci", "Gün sonunda üç dokunuşluk kısa değerlendirme yapar: kolay / dengeli / zor, "
     "yardım gerekiyor mu."],
    ["5", "Branş öğretmeni", "Teslimleri görür, “güçlü yan / sonraki adım” biçiminde geri bildirim yazar. "
     "Not vermek zorunlu değildir."],
    ["6", "Rehber öğretmen", "Dersler arası iş yükünü ve risk sinyallerini izler; gereken öğrenciyle görüşür."],
    ["7", "Veli", "Hafta sonunda sade bir özet alır: tamamlananlar, yaklaşan tarihler, evde tek öneri."],
], [12 * mm, 32 * mm, 121 * mm]))
A.append(Spacer(1, 3 * mm))
A.append(kutu(p(
    "<b>İş yükü koruması:</b> geç saatte verilen bir görevin teslimi ertesi sabaha konamaz; "
    "sistem öğretmeni uyarır. Öğrenci “çok yoğun” sinyali gönderebilir. Gecikme, öğrencinin "
    "etiketi değil görevin durumudur.", G)))

# ============================ 6. ÖLÇME / LGS ================================
A.append(p("6. Ölçme ve LGS", H1))
A.append(p(
    "Deneme sonuçları kurumun yüklediği yayınevi PDF'lerinden okunur; öğrencilerle ad-soyad "
    "üzerinden eşleştirilir, belirsiz kalan satırlar elle bağlanmak üzere kuyruğa düşer. "
    "Sonuç üç ayrı dille sunulur:", G))
A.append(Spacer(1, 2 * mm))
A.append(tablo([
    ["Kime", "Ne gösterilir"],
    ["Öğrenciye", "Önce “neyi öğrendin, sırada ne var”; en fazla üç gelişim alanı ve bir sonraki adım. "
     "Karşılaştırma kendi önceki sonucuyla yapılır."],
    ["Öğretmene", "Sınıf dağılımı, kazanım bazlı başarı, hata türleri, boş bırakma ve süre sinyalleri."],
    ["Veliye", "Teknik tablo değil sade özet: güçlü yön, destek gereken alan, evde bir öneri."],
], [26 * mm, 139 * mm]))
A.append(Spacer(1, 4 * mm))
A.append(p("LGS modu", H2))
A.append(p(
    "LGS görünümü <b>8. sınıfta</b> varsayılan olarak açıktır; 7. sınıfta kurum isterse "
    "“hazırlık alışkanlıkları” görünümü açılabilir. Son deneme özeti, ders bazlı doğru/yanlış/boş, "
    "süre kullanımı, konu haritası ve en fazla üç odak önerisi gösterilir.", G))
A.append(Spacer(1, 2 * mm))
A.append(kutu(p(
    "<b>Vermediğimiz söz:</b> geçmiş yılların soru dağılımları çalışma planına bağlam sağlar, "
    "gelecek sınavın dağılımını göstermez. Tek denemeden LGS puanı veya yüzdelik dilim tahmini "
    "üretilmez. Kırmızı alarm ve kesin hüküm dili kullanılmaz.", G)))

A.append(PageBreak())

# ============================ 7. GÜVENLİK ===================================
A.append(p("7. Çocuk güvenliği ve kişisel veriler", H1))
A.append(p(
    "Ortaokul öğrencisi söz konusu olduğunda varsayılan tutum <b>en az veri</b>dir. "
    "Kurumun sorması muhtemel başlıklar:", G))
A.append(Spacer(1, 2 * mm))
A.extend(madde([
    "Yalnızca gereken veri toplanır; çocuk verileri reklam hedeflemesinde <b>kullanılmaz</b>.",
    "Öğrenciler arasında doğrudan mesajlaşma <b>yoktur</b>.",
    "Öğrencinin görünür adı kurum tercihine göre “ad + soyad baş harfi” olabilir.",
    "Rehber öğretmen notu veliye varsayılan olarak <b>kapalıdır</b>.",
    "Öğrencinin duygu/yoğunluk bildirimi bir performans puanı değildir; yalnız destek önceliği üretir.",
    "Varsayılan sessiz saatler: <b>20.30 – 08.00</b> arasında öğrenciye anlık bildirim gitmez.",
    "Yapay zekâ öğretmen yerine karar vermez: tanı koymaz, disiplin önermez, ödevi öğrenci yerine yazmaz; "
    "üretilen içerik öğretmen onayından geçer.",
    "Yönetici işlemleri denetim kaydına yazılır.",
]))
A.append(Spacer(1, 3 * mm))
A.append(p(
    "Kurumla imzalanacak sözleşmede saklama süresi, hesap kapatma ve veri silme süreci ayrıca "
    "yazılır. Veli bilgilendirme metni kurumla birlikte hazırlanır.", G))

# ============================ 8. UYGULAMA ===================================
A.append(p("8. Uygulama adımları", H1))
A.append(p(
    "Pilot <b>yalnız 8. sınıfla</b> başlar. Sebebi basit: LGS omurgası en çok yeniden kullanılan "
    "parçadır ve geri bildirim en hızlı oradan gelir. 7, 6 ve 5. sınıflar pilot sonrası, yaşa göre "
    "sadeleştirilmiş biçimde açılır.", G))
A.append(Spacer(1, 2 * mm))
A.append(tablo([
    ["Aşama", "Kurum ne yapar", "SeFu Koç ne yapar"],
    ["Hazırlık", "Pilot sınıfı ve sorumlu öğretmeni belirler; sınıf ve öğretmen listesini iletir.",
     "Kurumu, sınıfları ve hesapları oluşturur; müfredatı yükler."],
    ["Tanıtım", "Öğretmenlere bir saatlik tanıtım için zaman ayırır.",
     "Öğretmen ve rehber öğretmen eğitimini yapar; giriş bilgilerini teslim eder."],
    ["Veli bilgisi", "Veli bilgilendirmesini yapar, onayları toplar.",
     "Bilgilendirme metnini ve veli tanıtımını hazırlar."],
    ["İlk hafta", "Her branştan en az bir görev verilmesini sağlar.",
     "Günlük takip eder, takılan noktaları aynı gün giderir."],
    ["Değerlendirme", "Dördüncü hafta sonunda öğretmen ve öğrenci geri bildirimini paylaşır.",
     "Bulguları raporlar; yaygınlaştırma kararına birlikte varılır."],
], [26 * mm, 70 * mm, 69 * mm]))

A.append(PageBreak())

# ============================ 9. KONTROL LİSTESİ ============================
A.append(p("9. Kurumdan beklenenler", H1))
A.append(p("Görüşmede birlikte işaretleyin; eksikler sonraki adımın önünü tıkar.", G))
A.append(Spacer(1, 3 * mm))
A.append(kutucuk_listesi([
    "Pilot sınıf(lar) belirlendi (öneri: tek bir 8. sınıf şubesi)",
    "Kurumda sorumlu bir kişi belirlendi (tercihen rehber öğretmen)",
    "Sınıf listeleri (şube ve öğrenci adları) hazır",
    "Branş öğretmenleri listesi ve branşları hazır",
    "Öğretmenlere tanıtım için bir saat ayrıldı",
    "Veli bilgilendirmesinin nasıl yapılacağına karar verildi",
    "Deneme sonuçlarının hangi yayınevinden geldiği belirtildi",
    "Öğrencilerin panele nereden gireceği netleşti (okul / ev / ikisi)",
    "Günlük çalışma süresi üst sınırı konusunda kurum tercihi alındı",
    "Sözleşme ve kişisel veri metinleri iletildi",
]))

# ============================ 10. SSS ======================================
A.append(p("10. Sık sorulan sorular", H1))
sss = [
    ("Öğretmenin iş yükü artar mı?",
     "Görev vermek üç adımdır ve sınıfa topluca yapılır. Not vermek zorunlu değildir; "
     "geri bildirim iki cümleyle yazılabilir. Sistemin asıl işi, öğretmenin göremediği "
     "birikmiş eksikleri görünür kılmaktır."),
    ("Öğrencinin telefonu yoksa?",
     "Panel tarayıcıda çalışır; okul bilgisayarından da kullanılabilir. Zorunlu mobil uygulama yoktur."),
    ("Veli her şeyi görecek mi?",
     "Hayır. Veli haftalık sade özeti ve yaklaşan tarihleri görür; rehberlik notlarına ve "
     "öğrencinin özel bildirimlerine erişemez."),
    ("Yapay zekâ öğrencinin ödevini yapar mı?",
     "Hayır. Ödevin tamamını üretmesi engellenmiştir. Yanlış yapılan soruda ek açıklama, "
     "uzun yönergeyi sadeleştirme gibi işlerde kullanılır ve öğretmen onayından geçer."),
    ("LGS puanı tahmin ediliyor mu?",
     "Tek denemeden kesin puan veya yüzdelik dilim söylenmez. Gösterilirse aralık olarak, "
     "kaç denemeye dayandığı belirtilerek gösterilir."),
    ("Veriler nerede tutuluyor, silinebilir mi?",
     "Veriler kurumla imzalanan sözleşmedeki süre boyunca tutulur; hesap kapatma ve silme "
     "süreci tanımlıdır. Yönetici işlemleri kayıt altındadır."),
    ("Mevcut lise sistemimizi etkiler mi?",
     "Hayır. Ortaokul tarafı ayrı bir katman olarak kurulmuştur; lise paneli ve verisi "
     "değişmeden çalışmaya devam eder."),
]
for soru, cevap in sss:
    A.append(KeepTogether([p(soru, H2), p(cevap, G)]))

A.append(PageBreak())

# ============================ 11. GÖRÜŞME NOTU ==============================
A.append(p("11. Görüşme notu ve karar", H1))
A.append(p("Bu sayfa görüşme sırasında doldurulur ve iki tarafta da kalır.", G))
A.append(Spacer(1, 4 * mm))
A.append(p("Konuşulanlar", H2))
A.append(not_satirlari(9))
A.append(Spacer(1, 4 * mm))
A.append(p("Kurumun soruları / çekinceleri", H2))
A.append(not_satirlari(5))
A.append(Spacer(1, 4 * mm))
A.append(p("Karar ve sonraki adım", H2))
A.append(tablo([
    [p("Pilot sınıf", HUCRE_B), p("", HUCRE), p("Başlangıç tarihi", HUCRE_B), p("", HUCRE)],
    [p("Kurum sorumlusu", HUCRE_B), p("", HUCRE), p("Telefon / e-posta", HUCRE_B), p("", HUCRE)],
    [p("SeFu Koç sorumlusu", HUCRE_B), p("", HUCRE), p("Sonraki görüşme", HUCRE_B), p("", HUCRE)],
], [34 * mm, 48 * mm, 34 * mm, 49 * mm], baslikli=False))
A.append(Spacer(1, 10 * mm))
A.append(tablo([
    [p("Kurum yetkilisi (ad, imza)", KUCUK), p("SeFu Koç yetkilisi (ad, imza)", KUCUK)],
    [p("<br/><br/><br/>", HUCRE), p("<br/><br/><br/>", HUCRE)],
], [82 * mm, 83 * mm], baslikli=False))

doc.build(A)
print("PDF hazır:", CIKTI)
print("%d ders, %d öğrenme çıktısı tablodan okundu." % (len(OZET), TOPLAM_CIKTI))
