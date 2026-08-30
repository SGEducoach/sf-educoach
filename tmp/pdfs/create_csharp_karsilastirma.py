from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from pathlib import Path

ROOT = Path(r"E:\SG_EDUCOACH")
OUT = ROOT / "output" / "pdf" / "sg_educoach_csharp_karsilastirma.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))

NAVY = colors.HexColor("#172554")
BLUE = colors.HexColor("#2563EB")
PALE = colors.HexColor("#EFF6FF")
LIGHT = colors.HexColor("#F8FAFC")
SLATE = colors.HexColor("#475569")
GREEN = colors.HexColor("#047857")
WHITE = colors.white

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleTR", fontName="Arial-Bold", fontSize=23, leading=28,
                          textColor=NAVY, alignment=TA_CENTER, spaceAfter=6))
styles.add(ParagraphStyle(name="SubtitleTR", fontName="Arial", fontSize=10.5, leading=15,
                          textColor=SLATE, alignment=TA_CENTER, spaceAfter=16))
styles.add(ParagraphStyle(name="H1TR", fontName="Arial-Bold", fontSize=15, leading=19,
                          textColor=NAVY, spaceBefore=8, spaceAfter=8))
styles.add(ParagraphStyle(name="H2TR", fontName="Arial-Bold", fontSize=11.5, leading=15,
                          textColor=BLUE, spaceBefore=7, spaceAfter=4))
styles.add(ParagraphStyle(name="BodyTR", fontName="Arial", fontSize=9.3, leading=13.5,
                          textColor=colors.HexColor("#1E293B"), spaceAfter=6))
styles.add(ParagraphStyle(name="SmallTR", fontName="Arial", fontSize=8, leading=11,
                          textColor=SLATE))
styles.add(ParagraphStyle(name="CellTR", fontName="Arial", fontSize=7.7, leading=10.2,
                          textColor=colors.HexColor("#1E293B")))
styles.add(ParagraphStyle(name="CellHeadTR", fontName="Arial-Bold", fontSize=8, leading=10.5,
                          textColor=WHITE))
styles.add(ParagraphStyle(name="CalloutTR", fontName="Arial-Bold", fontSize=10.5, leading=15,
                          textColor=GREEN, alignment=TA_CENTER))

def P(text, style="BodyTR"):
    return Paragraph(text, styles[style])

def bullet(text):
    return Paragraph("• " + text, ParagraphStyle(
        name="BulletTemp", parent=styles["BodyTR"], leftIndent=11, firstLineIndent=-7,
        spaceAfter=3
    ))

def footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.line(18*mm, 14*mm, w-18*mm, 14*mm)
    canvas.setFont("Arial", 7.5)
    canvas.setFillColor(SLATE)
    canvas.drawString(18*mm, 9*mm, "SG EduCoach - C# Yeniden Geliştirme Karşılaştırması")
    canvas.drawRightString(w-18*mm, 9*mm, f"Sayfa {doc.page}")
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm,
                      topMargin=17*mm, bottomMargin=18*mm,
                      title="SG EduCoach - C# Yeniden Geliştirme Karşılaştırması")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
doc.addPageTemplates(PageTemplate(id="all", frames=[frame], onPage=footer))

story = []
story += [Spacer(1, 12*mm), P("SG EduCoach", "TitleTR"),
          P("Mevcut sistem ile HTML, CSS, JavaScript ve C# tabanlı yeni sistemin karşılaştırması", "SubtitleTR")]

summary = Table([[P("SONUÇ", "CellHeadTR")],
                 [P("Sistem C# ile baştan sona yeniden geliştirilebilir. Kullanıcı deneyimi ve temel işlevler korunabilir; en büyük değişiklik arka uç mimarisi, kimlik doğrulama, güvenlik ve yayınlama yönteminde olur.", "CalloutTR")]],
                colWidths=[doc.width])
summary.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("BACKGROUND", (0,1), (-1,1), colors.HexColor("#ECFDF5")),
    ("BOX", (0,0), (-1,-1), 0.8, colors.HexColor("#A7F3D0")),
    ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
]))
story += [summary, Spacer(1, 8*mm), P("Temel teknoloji farkları", "H1TR")]

rows = [[P("Konu", "CellHeadTR"), P("Şu anki sistem", "CellHeadTR"), P("C# ile yeni sistem", "CellHeadTR")]]
data = [
    ("Arayüz", "Next.js, React ve TypeScript", "HTML5, CSS3 ve Vanilla JavaScript"),
    ("Sunucu", "Next.js sunucu işlemleri", "ASP.NET Core C#"),
    ("Veritabanı", "Supabase PostgreSQL", "PostgreSQL ve Entity Framework Core"),
    ("Kullanıcı girişi", "Supabase Auth", "ASP.NET Core Identity"),
    ("Yetkilendirme", "Supabase RLS ve uygulama kontrolleri", "C# rol ve politika kontrolleri"),
    ("Yayınlama", "Vercel ve Supabase", "IIS, Linux, Docker veya Azure"),
    ("Anlık güncellemeler", "React durum yönetimi", "Fetch/AJAX veya SignalR"),
    ("Arka plan işleri", "Vercel Cron", "Hosted Services veya Hangfire"),
    ("Grafikler", "Recharts", "Chart.js veya benzeri JavaScript kütüphanesi"),
]
for a,b,c in data:
    rows.append([P(a, "CellTR"), P(b, "CellTR"), P(c, "CellTR")])
tbl = Table(rows, colWidths=[35*mm, 67*mm, 67*mm], repeatRows=1)
tbl.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#CBD5E1")),
    ("VALIGN", (0,0), (-1,-1), "TOP"), ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]),
    ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
]))
story += [tbl, PageBreak(), P("Kullanıcının görebileceği değişiklikler", "H1TR")]
for x in [
    "Sayfa adresleri ve genel tasarım istenirse mevcut sistemle aynı tutulabilir.",
    "Bazı sayfalarda tam sayfa yenilemesi görülebilir; AJAX kullanımıyla bu etki azaltılabilir.",
    "Formlar, grafikler, mobil menüler ve tema sistemi yeniden uygulanacağı için küçük görsel farklılıklar oluşabilir.",
    "PWA kurulumu, çevrimdışı ekranı ve Web Push bildirimleri korunabilir.",
    "SignalR kullanılırsa bazı bildirimler gerçek zamanlı çalışabilir.",
    "İyi optimize edilmiş bir uygulama mevcut sistemle aynı veya daha iyi performans verebilir; teknoloji değişimi tek başına hız garantisi değildir.",
]: story.append(bullet(x))

story += [Spacer(1, 4*mm), P("Yönetim ve teknik taraftaki farklar", "H1TR")]
cards = [
    ("Daha merkezî yönetim", "Kullanıcı, rol, izin, loglama ve hata takibi C# uygulamasında tek merkezden yönetilebilir."),
    ("Daha fazla barındırma seçeneği", "Uygulama kurum içi IIS sunucusunda, Linux üzerinde, Docker ile veya Azure'da çalıştırılabilir."),
    ("Bakım sorumluluğu", "Sunucu güvenliği, güncellemeler, yedekleme ve izleme yeni altyapının işletmecisine ait olur."),
    ("Veritabanı yönetimi", "Şema değişiklikleri Entity Framework Core migration'larıyla takip edilebilir."),
]
for title, body in cards:
    box = Table([[P(title, "H2TR")], [P(body)]], colWidths=[doc.width])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), PALE), ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#BFDBFE")),
        ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 3), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story += [KeepTogether([box, Spacer(1, 3*mm)])]

story += [P("En önemli risk", "H1TR"),
          P("En büyük iş yükü ekranları çizmek değil; mevcut veritabanı kurallarını, rol sistemini ve güvenlik kontrollerini eksiksiz taşımaktır. Supabase Row Level Security kurallarının karşılığı C# tarafında doğru kurulmazsa veri erişim açıkları oluşabilir.")]
for x in [
    "Öğrenci-veli eşleştirmeleri ve okul bazlı kullanıcı numaraları",
    "Öğretmen, müdür, moderatör ve yönetici yetkileri",
    "Geçici şifreler, hesap aktifliği ve oturum güvenliği",
    "Deneme sonuçları, rozetler, duyurular ve hatırlatmalar",
    "Mevcut kullanıcı ve operasyon verilerinin kayıpsız aktarılması",
]: story.append(bullet(x))

story += [PageBreak(), P("Önerilen C# mimarisi", "H1TR")]
arch = [
    ("Arayüz", "Razor görünümleri + HTML + CSS + gerektiği yerlerde Vanilla JavaScript"),
    ("Uygulama", "ASP.NET Core MVC"),
    ("Veri", "PostgreSQL + Entity Framework Core"),
    ("Güvenlik", "ASP.NET Core Identity + rol/politika tabanlı yetkilendirme"),
    ("Gerçek zaman", "SignalR"),
    ("Zamanlanmış işler", "Hosted Services veya Hangfire"),
    ("Dış servisler", "Claude API, Resend/SMTP ve Web Push"),
]
arch_rows = [[P(a, "CellHeadTR"), P(b, "CellHeadTR")] for a,b in []]
arch_rows = [[P("Katman", "CellHeadTR"), P("Öneri", "CellHeadTR")]] + [[P(a,"CellTR"),P(b,"CellTR")] for a,b in arch]
at = Table(arch_rows, colWidths=[46*mm, 123*mm], repeatRows=1)
at.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), BLUE), ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#CBD5E1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story += [at, Spacer(1, 7*mm), P("Uygulama yaklaşımı", "H1TR")]
for i, x in enumerate([
    "Yeni C# çözümünü mevcut çalışan sistemden ayrı kurmak.",
    "Veritabanı modelleri, giriş sistemi ve rol yetkileriyle başlamak.",
    "Öğrenci, öğretmen, veli ve yönetim ekranlarını modül modül taşımak.",
    "Her modülü mevcut sistemle karşılaştırmalı olarak test etmek.",
    "Veri aktarımı ve güvenlik kontrolleri tamamlandıktan sonra canlı geçiş yapmak.",
], 1):
    story.append(Paragraph(f"<b>{i}.</b> {x}", ParagraphStyle(name=f"Step{i}", parent=styles["BodyTR"], leftIndent=8, firstLineIndent=-8, spaceAfter=5)))

story += [Spacer(1, 6*mm)]
final_box = Table([[P("Genel değerlendirme", "CellHeadTR")],
                   [P("İşlevlerin tamamı korunabilir ve sistem C# merkezli, kurumsal sunucu ortamlarına daha uygun bir yapıya dönüştürülebilir. Ancak bu çalışma basit bir kod çevirisi değil; güvenlik, veri ve kullanıcı deneyimiyle birlikte yürütülmesi gereken kapsamlı bir yeniden geliştirme projesidir.", "BodyTR")]], colWidths=[doc.width])
final_box.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("BACKGROUND", (0,1), (-1,1), PALE),
    ("BOX", (0,0), (-1,-1), 0.8, colors.HexColor("#93C5FD")),
    ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
]))
story.append(final_box)

doc.build(story)
print(OUT)
