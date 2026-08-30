from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path(r"E:\SG_EDUCOACH")
OUT = ROOT / "output" / "pdf" / "sg_educoach_buton_gecikmesi_ve_performans_raporu.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))

NAVY = colors.HexColor("#172554")
BLUE = colors.HexColor("#2563EB")
PALE = colors.HexColor("#EFF6FF")
LIGHT = colors.HexColor("#F8FAFC")
SLATE = colors.HexColor("#475569")
GREEN = colors.HexColor("#047857")
AMBER = colors.HexColor("#B45309")
RED = colors.HexColor("#B91C1C")
WHITE = colors.white

s = getSampleStyleSheet()
s.add(ParagraphStyle(name="TitleTR", fontName="Arial-Bold", fontSize=22, leading=27, textColor=NAVY, alignment=TA_CENTER, spaceAfter=7))
s.add(ParagraphStyle(name="SubtitleTR", fontName="Arial", fontSize=10.5, leading=15, textColor=SLATE, alignment=TA_CENTER, spaceAfter=17))
s.add(ParagraphStyle(name="H1TR", fontName="Arial-Bold", fontSize=15, leading=19, textColor=NAVY, spaceBefore=6, spaceAfter=8))
s.add(ParagraphStyle(name="H2TR", fontName="Arial-Bold", fontSize=11.5, leading=15, textColor=BLUE, spaceBefore=5, spaceAfter=3))
s.add(ParagraphStyle(name="BodyTR", fontName="Arial", fontSize=9.3, leading=13.6, textColor=colors.HexColor("#1E293B"), spaceAfter=6))
s.add(ParagraphStyle(name="CellTR", fontName="Arial", fontSize=8, leading=10.5, textColor=colors.HexColor("#1E293B")))
s.add(ParagraphStyle(name="CellHeadTR", fontName="Arial-Bold", fontSize=8.2, leading=10.7, textColor=WHITE))
s.add(ParagraphStyle(name="CalloutTR", fontName="Arial-Bold", fontSize=10.8, leading=15.5, textColor=GREEN, alignment=TA_CENTER))
s.add(ParagraphStyle(name="SmallTR", fontName="Arial", fontSize=7.5, leading=10, textColor=SLATE))

def P(text, style="BodyTR"):
    return Paragraph(text, s[style])

def bullet(text, color=None):
    st = ParagraphStyle(name="bullet", parent=s["BodyTR"], leftIndent=11, firstLineIndent=-7, spaceAfter=4)
    if color: st.textColor = color
    return Paragraph("• " + text, st)

def footer(canvas, doc):
    canvas.saveState()
    w, _ = A4
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.line(18*mm, 14*mm, w-18*mm, 14*mm)
    canvas.setFont("Arial", 7.5)
    canvas.setFillColor(SLATE)
    canvas.drawString(18*mm, 9*mm, "SG EduCoach - Buton Gecikmesi ve Performans Raporu")
    canvas.drawRightString(w-18*mm, 9*mm, f"Sayfa {doc.page}")
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=17*mm, bottomMargin=18*mm,
                      title="SG EduCoach - Buton Gecikmesi ve Performans Raporu")
doc.addPageTemplates(PageTemplate(id="main", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="frame")], onPage=footer))

story = [Spacer(1, 10*mm), P("SG EduCoach", "TitleTR"), P("Buton gecikmesinin nedenleri ve performans iyileştirme raporu", "SubtitleTR")]

summary = Table([[P("KISA TEŞHİS", "CellHeadTR")], [P("Beklemenin temel nedeni internet hızından çok, tek bir tıklamada birden fazla sunucu ve veritabanı işleminin tamamlanmasının beklenmesi ve ardından dashboard verilerinin yeniden hazırlanmasıdır.", "CalloutTR")]], colWidths=[doc.width])
summary.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("BACKGROUND", (0,1), (-1,1), colors.HexColor("#ECFDF5")),
    ("BOX", (0,0), (-1,-1), .8, colors.HexColor("#A7F3D0")),
    ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
]))
story += [summary, Spacer(1, 7*mm), P("Tıklamadan sonuca kadar mevcut akış", "H1TR")]

steps = [
    ("1", "Butona basılır", "Tarayıcı sunucu işlemine istek gönderir."),
    ("2", "Oturum doğrulanır", "Supabase üzerinden kullanıcı ve yetki kontrolü yapılır."),
    ("3", "Kayıt yazılır", "Form verisi veritabanına eklenir veya güncellenir."),
    ("4", "Ek işler çalışır", "Rozet, bildirim ve verimlilik kontrolleri tamamlanır."),
    ("5", "Dashboard yenilenir", "Analiz, zayıf konular, konu listeleri ve rozetler tekrar hazırlanır."),
    ("6", "Ekran açılır", "Tüm zincir bittikten sonra kullanıcı güncel sonucu görür."),
]
for no, title, body in steps:
    row = Table([[P(no, "CellHeadTR"), P(title, "H2TR"), P(body)]], colWidths=[12*mm, 44*mm, 113*mm])
    row.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,0), BLUE), ("BACKGROUND", (1,0), (-1,0), LIGHT),
        ("BOX", (0,0), (-1,-1), .4, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("ALIGN", (0,0), (0,0), "CENTER"),
        ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    story += [row, Spacer(1, 2*mm)]

story += [PageBreak(), P("Kodda belirlenen gecikme kaynakları", "H1TR")]
causes = [
    ("Tam ekran yükleme katmanı", "Gösterge 180 ms sonra açılıyor ve işlem tamamlansa bile en az 650 ms görünür tutuluyor. Hızlı istekler de yavaşmış gibi hissediliyor.", "Yüksek algısal etki"),
    ("Tek işlemde çok sayıda görev", "Öğrenci kaydı sonrasında kayıt ekleme, rozet kontrolü, bildirim işlemleri ve verimlilik sorgusu sırayla tamamlanıyor.", "Yüksek gerçek etki"),
    ("Dashboard'un yeniden hazırlanması", "Kayıt sonrası tüm dashboard geçersiz kılınıyor; profil, analizler, zayıf konular, konu listeleri ve rozetler yeniden çekilebiliyor.", "Yüksek gerçek etki"),
    ("Her istekte oturum kontrolü", "Sunucu isteklerinde Supabase kullanıcı doğrulaması tekrar yapılıyor. Bu güvenlik için gerekli olsa da ağ gecikmesi ekliyor.", "Orta etki"),
    ("Sunucu-veritabanı mesafesi", "Vercel ve Supabase farklı bölgelerdeyse her sorgunun ağ süresi büyür; arka arkaya sorgularda gecikmeler birikir.", "Ortama bağlı"),
    ("Tek tek bildirim gönderimi", "Bazı yönetim işlemlerinde bildirimler kullanıcı bazında sırayla gönderilebiliyor. Alıcı sayısı arttıkça bekleme uzar.", "Toplu işlemlerde yüksek"),
]
rows = [[P("Kaynak", "CellHeadTR"), P("Açıklama", "CellHeadTR"), P("Etki", "CellHeadTR")]]
for a,b,c in causes: rows.append([P(a,"CellTR"), P(b,"CellTR"), P(c,"CellTR")])
t = Table(rows, colWidths=[43*mm, 94*mm, 32*mm], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("GRID", (0,0), (-1,-1), .35, colors.HexColor("#CBD5E1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story += [t, Spacer(1, 6*mm), P("Neden bazı siteler anlık hissediliyor?", "H1TR"),
          P("Hızlı hissedilen siteler çoğunlukla ekrandaki sonucu hemen değiştirir, sunucu kaydını arka planda tamamlar ve yalnızca değişen bölümü günceller. SG EduCoach mevcut durumda çoğu zaman bütün işlem zincirinin bitmesini ve sayfa verilerinin yeniden hazırlanmasını bekliyor.")]

compare = Table([
    [P("Anlık hissedilen yaklaşım", "CellHeadTR"), P("Mevcut yaklaşım", "CellHeadTR")],
    [P("Buton veya ilgili kart üzerinde küçük gösterge", "CellTR"), P("Tüm ekranı kaplayan yükleme katmanı", "CellTR")],
    [P("Ekranda anında, iyimser güncelleme", "CellTR"), P("Sunucu cevabından sonra güncelleme", "CellTR")],
    [P("Yalnızca değişen veriyi yenileme", "CellTR"), P("Dashboard verilerini tekrar hazırlama", "CellTR")],
    [P("Rozet ve bildirimleri arka planda işleme", "CellTR"), P("Ek işleri kullanıcıya cevap vermeden önce bekleme", "CellTR")],
], colWidths=[84.5*mm,84.5*mm])
compare.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (0,0), GREEN), ("BACKGROUND", (1,0), (1,0), AMBER),
    ("GRID", (0,0), (-1,-1), .35, colors.HexColor("#CBD5E1")), ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]),
    ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story += [compare, PageBreak(), P("Önerilen iyileştirmeler", "H1TR")]

priorities = [
    ("1", "Genel yükleme katmanını değiştir", "Tam ekran katmanı yalnızca uzun işlemlerde gösterilmeli. Normal kayıtlarda yalnızca ilgili buton dönmeli.", "En hızlı kazanım"),
    ("2", "Tüm dashboard'u yenileme", "Kayıt sonrasında sadece analiz, rozet veya ilgili kart güncellenmeli.", "Çok yüksek etki"),
    ("3", "İyimser arayüz kullan", "Kayıt ekranda anında gösterilmeli; sunucu işlemi arkada tamamlanmalı ve hata olursa geri alınmalı.", "Yüksek algısal etki"),
    ("4", "Ek işleri arka plana taşı", "Rozet hesaplama, bildirim ve ağır analizler kullanıcı cevabından ayrılmalı.", "Yüksek gerçek etki"),
    ("5", "Sorguları paralelleştir ve önbellekle", "Birbirinden bağımsız sorgular aynı anda çalışmalı; sık değişmeyen konu listeleri önbelleğe alınmalı.", "Orta-yüksek etki"),
    ("6", "Bölgeleri yakınlaştır", "Vercel işlevleri ile Supabase veritabanı mümkün olduğunca aynı veya yakın bölgede olmalı.", "Ortama bağlı"),
    ("7", "Süre ölçümü ekle", "Her sunucu işlemi ve sorgu için süre kaydı tutulmalı; en yavaş adımlar ölçümle belirlenmeli.", "Teşhis için şart"),
]
for no,title,body,impact in priorities:
    card = Table([[P(no,"CellHeadTR"), P(title,"H2TR"), P(impact,"SmallTR")], ["", P(body), ""]], colWidths=[12*mm, 118*mm, 39*mm])
    card.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), BLUE), ("BACKGROUND", (1,0), (-1,-1), PALE),
        ("BOX", (0,0), (-1,-1), .45, colors.HexColor("#BFDBFE")), ("SPAN", (0,0), (0,1)),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("ALIGN", (0,0), (0,-1), "CENTER"), ("ALIGN", (2,0), (2,0), "RIGHT"),
        ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    story += [KeepTogether([card, Spacer(1, 2.3*mm)])]

story += [Spacer(1, 4*mm)]
final = Table([[P("ÖNEMLİ NOT", "CellHeadTR")], [P("C# ile yeniden yazmak gecikmeyi otomatik olarak çözmez. Aynı sıralı işlem zinciri C# tarafında da kurulursa sonuç yine yavaş olur. Mevcut Next.js uygulamasında doğru optimizasyonlar yapılarak çoğu tıklama kullanıcıya anlık hissettirilebilir; bu yaklaşım tamamen yeniden yazmaktan daha kısa ve daha düşük risklidir.", "BodyTR")]], colWidths=[doc.width])
final.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("BACKGROUND", (0,1), (-1,1), colors.HexColor("#FFF7ED")),
    ("BOX", (0,0), (-1,-1), .8, colors.HexColor("#FDBA74")),
    ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
]))
story.append(final)

doc.build(story)
print(OUT)
