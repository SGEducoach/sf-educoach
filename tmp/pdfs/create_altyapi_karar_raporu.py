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
OUT = ROOT / "output" / "pdf" / "sg_educoach_altyapi_hosting_ve_guvenlik_karar_raporu.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))

NAVY = colors.HexColor("#172554")
BLUE = colors.HexColor("#2563EB")
GREEN = colors.HexColor("#047857")
AMBER = colors.HexColor("#B45309")
RED = colors.HexColor("#B91C1C")
SLATE = colors.HexColor("#475569")
LIGHT = colors.HexColor("#F8FAFC")
PALE = colors.HexColor("#EFF6FF")
WHITE = colors.white

ss = getSampleStyleSheet()
ss.add(ParagraphStyle(name="TitleTR", fontName="Arial-Bold", fontSize=22, leading=27, textColor=NAVY, alignment=TA_CENTER, spaceAfter=7))
ss.add(ParagraphStyle(name="SubtitleTR", fontName="Arial", fontSize=10.5, leading=15, textColor=SLATE, alignment=TA_CENTER, spaceAfter=16))
ss.add(ParagraphStyle(name="H1TR", fontName="Arial-Bold", fontSize=15, leading=19, textColor=NAVY, spaceBefore=6, spaceAfter=8))
ss.add(ParagraphStyle(name="H2TR", fontName="Arial-Bold", fontSize=11.5, leading=15, textColor=BLUE, spaceBefore=4, spaceAfter=3))
ss.add(ParagraphStyle(name="BodyTR", fontName="Arial", fontSize=9.3, leading=13.6, textColor=colors.HexColor("#1E293B"), spaceAfter=6))
ss.add(ParagraphStyle(name="CellTR", fontName="Arial", fontSize=8, leading=10.6, textColor=colors.HexColor("#1E293B")))
ss.add(ParagraphStyle(name="HeadTR", fontName="Arial-Bold", fontSize=8.2, leading=10.7, textColor=WHITE))
ss.add(ParagraphStyle(name="CalloutTR", fontName="Arial-Bold", fontSize=10.8, leading=15.5, textColor=GREEN, alignment=TA_CENTER))
ss.add(ParagraphStyle(name="SmallTR", fontName="Arial", fontSize=7.6, leading=10.4, textColor=SLATE))

def P(text, style="BodyTR"):
    return Paragraph(text, ss[style])

def bullet(text, color=None):
    st = ParagraphStyle(name="b", parent=ss["BodyTR"], leftIndent=11, firstLineIndent=-7, spaceAfter=4)
    if color: st.textColor = color
    return Paragraph("• " + text, st)

def footer(canvas, doc):
    canvas.saveState()
    w, _ = A4
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.line(18*mm, 14*mm, w-18*mm, 14*mm)
    canvas.setFont("Arial", 7.5)
    canvas.setFillColor(SLATE)
    canvas.drawString(18*mm, 9*mm, "SG EduCoach - Altyapı, Hosting ve Güvenlik Karar Raporu")
    canvas.drawRightString(w-18*mm, 9*mm, f"Sayfa {doc.page}")
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=17*mm, bottomMargin=18*mm,
                      title="SG EduCoach - Altyapı, Hosting ve Güvenlik Karar Raporu")
doc.addPageTemplates(PageTemplate(id="main", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="frame")], onPage=footer))

story = [Spacer(1, 10*mm), P("SG EduCoach", "TitleTR"), P("Altyapı, hosting, veritabanı, alan adı ve kaynak kodu güvenliği karar raporu", "SubtitleTR")]

decision = Table([[P("ÖNERİLEN KARAR", "HeadTR")], [P("Mevcut uygulama için en dengeli yapı: Private GitHub + Vercel + Supabase Database + Supabase Auth + Squarespace DNS. Firebase'e geçiş önerilmez; Render veya Fly.io ise C# sürümüne geçilirse yeniden değerlendirilmelidir.", "CalloutTR")]], colWidths=[doc.width])
decision.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("BACKGROUND", (0,1), (-1,1), colors.HexColor("#ECFDF5")),
    ("BOX", (0,0), (-1,-1), .8, colors.HexColor("#A7F3D0")),
    ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
]))
story += [decision, Spacer(1, 7*mm), P("Önerilen hizmet dağılımı", "H1TR")]

rows = [[P("Görev", "HeadTR"), P("Önerilen hizmet", "HeadTR"), P("Gerekçe", "HeadTR")]]
data = [
    ("Uygulama ve arayüz", "Vercel", "Mevcut Next.js uygulamasıyla doğal entegrasyon"),
    ("Veritabanı", "Supabase PostgreSQL", "Mevcut ilişkisel şema, SQL ve RLS korunur"),
    ("Kullanıcı girişi", "Supabase Auth", "Mevcut hesap yapısı korunur"),
    ("Google ile giriş", "Supabase Google OAuth", "Firebase'e geçmeden eklenebilir"),
    ("Kaynak kodu", "Private GitHub", "Kod ve proje yapısı herkese açık olmaz"),
    ("Alan adı ve DNS", "Squarespace Domains", "Eski Google Domains hesapları buraya taşındı"),
    ("SSL ve HTTPS", "Vercel", "Otomatik sertifika oluşturma ve yenileme"),
    ("E-posta", "Resend", "Mevcut entegrasyon korunur"),
    ("Bildirim", "Web Push", "Mevcut PWA bildirim yapısı korunur"),
]
for a,b,c in data: rows.append([P(a,"CellTR"),P(b,"CellTR"),P(c,"CellTR")])
t = Table(rows, colWidths=[43*mm, 49*mm, 77*mm], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("GRID", (0,0), (-1,-1), .35, colors.HexColor("#CBD5E1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
]))
story += [t, Spacer(1, 6*mm)]

urgent = Table([[P("ACİL GÜVENLİK ÖNCELİĞİ", "HeadTR")], [P("GitHub deposu private yapılmalı. Depo daha önce public olduysa yalnızca görünürlüğü değiştirmek yeterli değildir; geçmişte yayımlanan gizli anahtarlar yenilenmelidir.", "BodyTR")]], colWidths=[doc.width])
urgent.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), RED), ("BACKGROUND", (0,1), (-1,1), colors.HexColor("#FEF2F2")),
    ("BOX", (0,0), (-1,-1), .8, colors.HexColor("#FCA5A5")),
    ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8),
]))
story.append(urgent)

story += [PageBreak(), P("GitHub güvenlik planı", "H1TR"), P("Yerel kontrolde .env.local dosyasının Git tarafından izlenmediği, yalnızca örnek ortam ayarı dosyasının takip edildiği görülmüştür. Bu olumlu bir bulgudur ancak geçmişte başka dosyalarda anahtar yayımlanmadığını tek başına kanıtlamaz.")]
for x in [
    "GitHub deposunu Private olarak ayarlayın.",
    "Tüm Git geçmişinde parola, API anahtarı ve bağlantı bilgisi taraması yapın.",
    "Yayımlanmış olma ihtimali bulunan Supabase service-role, Anthropic, Resend, VAPID ve cron anahtarlarını yenileyin.",
    "Gizli değerleri yalnızca Vercel Environment Variables bölümünde saklayın.",
    "GitHub organizasyon üyelerini ve depo erişim yetkilerini gözden geçirin.",
    "İki aşamalı doğrulama ve korumalı ana dal kurallarını etkinleştirin.",
]: story.append(bullet(x))

story += [Spacer(1, 4*mm), P("Vercel ve private depo", "H1TR"),
          P("Vercel private GitHub depolarını destekler. Ancak depo bir GitHub organizasyonuna aitse Vercel Hobby planında dağıtım kısıtları oluşabilir. Proje sahipliği, commit sahibinin Vercel erişimi ve takım planı birlikte kontrol edilmelidir."),
          P("Firebase kotası hakkında düzeltme", "H1TR")]

quota = Table([
    [P("Cloud Firestore ücretsiz kota", "HeadTR"), P("Güncel sınır", "HeadTR")],
    [P("Belge okuma", "CellTR"), P("Günlük 50.000", "CellTR")],
    [P("Belge yazma", "CellTR"), P("Günlük 20.000", "CellTR")],
    [P("Belge silme", "CellTR"), P("Günlük 20.000", "CellTR")],
    [P("Depolama", "CellTR"), P("1 GiB", "CellTR")],
    [P("Dışarı veri aktarımı", "CellTR"), P("Aylık 10 GiB", "CellTR")],
], colWidths=[84.5*mm,84.5*mm])
quota.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), AMBER), ("GRID", (0,0), (-1,-1), .35, colors.HexColor("#CBD5E1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT]),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story += [quota, Spacer(1, 4*mm), P("'Günlük 10 milyar okuma-yazma ücretsiz' bilgisi doğru değildir. Ücretsiz kota aşıldığında kullanım ve bölgeye göre ücretlendirme devreye girer.", "BodyTR")]

story += [PageBreak(), P("Firebase'e geçiş değerlendirmesi", "H1TR"),
          P("Mevcut sistem PostgreSQL ilişkileri, SQL fonksiyonları, Row Level Security politikaları ve 42 migration içeriyor. Firestore belge tabanlıdır; bu nedenle geçiş basit bir bağlantı değişikliği değil, veri modelinin yeniden tasarlanmasıdır.")]

firebase_rows = [[P("Değişecek alan", "HeadTR"), P("Firebase'e geçiş etkisi", "HeadTR")]]
for a,b in [
    ("Veri modeli", "Tablolar ve ilişkiler belge/koleksiyon yapısına dönüştürülür."),
    ("SQL ve raporlama", "SQL fonksiyonları ve toplu analiz sorguları yeniden yazılır."),
    ("Yetkilendirme", "Supabase RLS yerine Firebase Security Rules tasarlanır ve test edilir."),
    ("Kullanıcı hesapları", "Mevcut oturum ve hesap aktarımı ayrıca planlanır."),
    ("Maliyet modeli", "Belge ve indeks okumaları kullanım maliyetini etkiler."),
    ("Güvenlik", "Sunucu SDK'ları Security Rules'u atlayabildiği için IAM ayrıca doğru kurulmalıdır."),
]: firebase_rows.append([P(a,"CellTR"),P(b,"CellTR")])
ft = Table(firebase_rows, colWidths=[49*mm,120*mm], repeatRows=1)
ft.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("GRID", (0,0), (-1,-1), .35, colors.HexColor("#CBD5E1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE,LIGHT]), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story += [ft, Spacer(1, 6*mm), P("Google ile oturum", "H1TR"),
          P("Google girişi için Firebase zorunlu değildir. Supabase Auth; Google, parola, OTP ve diğer sağlayıcıları destekler. Öğrenci hesaplarında okul numarası ve geçici şifre akışı korunabilir; Google OAuth öğretmen, müdür, moderatör veya yönetici hesaplarına isteğe bağlı eklenebilir."),
          P("Firebase Authentication teknik olarak Google girişini destekler; ancak Firebase Auth ile Supabase veritabanını birlikte kullanmak kimlik ve yetki yönetimini iki platforma böler.")]

story += [P("Hosting seçenekleri", "H1TR")]
hosting = Table([
    [P("Platform", "HeadTR"), P("Güçlü taraf", "HeadTR"), P("Bu proje için değerlendirme", "HeadTR")],
    [P("Vercel", "CellTR"), P("Next.js entegrasyonu, CDN, otomatik SSL", "CellTR"), P("Mevcut uygulama için birinci tercih", "CellTR")],
    [P("Render", "CellTR"), P("Kolay web servisleri, özel alan adı, yönetilen TLS", "CellTR"), P("C# sürümü için güçlü seçenek", "CellTR")],
    [P("Fly.io", "CellTR"), P("Bölgesel dağıtım, daha fazla altyapı kontrolü", "CellTR"), P("C# sürümü için uygun; yönetimi daha teknik", "CellTR")],
], colWidths=[28*mm,69*mm,72*mm])
hosting.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), BLUE), ("GRID", (0,0), (-1,-1), .35, colors.HexColor("#CBD5E1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE,LIGHT]), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story.append(hosting)

story += [PageBreak(), P("Alan adı, DNS ve SSL", "H1TR"),
          P("Google Domains artık faaliyet göstermiyor; eski Google Domains hesapları Squarespace Domains'e taşındı. Alan adı DNS kayıtları büyük ihtimalle Squarespace panelinden yönetilecektir.")]

for no, x in enumerate([
    "Alan adını Vercel projesine ekleyin.",
    "Vercel'in verdiği A, CNAME veya doğrulama kaydını alın.",
    "Kaydı Squarespace Domains DNS paneline girin.",
    "DNS doğrulamasının tamamlanmasını bekleyin.",
    "Vercel'in otomatik SSL sertifikasını oluşturduğunu doğrulayın.",
    "Kök alan adı, www adresi ve HTTP'den HTTPS'ye yönlendirmeyi test edin.",
],1):
    story.append(Paragraph(f"<b>{no}.</b> {x}", ParagraphStyle(name=f"step{no}", parent=ss["BodyTR"], leftIndent=9, firstLineIndent=-9, spaceAfter=5)))

story += [Spacer(1, 5*mm), P("Uygulama sırası", "H1TR")]
phases = [
    ("Bugün", "GitHub private, erişim kontrolü, anahtar taraması ve gerekiyorsa anahtar yenileme"),
    ("Kısa vadede", "Vercel private repo bağlantısını ve takım planını doğrulama"),
    ("Sonraki adım", "Squarespace DNS üzerinden özel alan adı bağlantısı ve SSL testi"),
    ("Ürün geliştirme", "Supabase Google OAuth'u ihtiyaç olan rollere ekleme"),
    ("Ayrı karar", "C# sürümü başlarsa Render ve Fly.io maliyet/operasyon karşılaştırması"),
]
pr = [[P("Zaman", "HeadTR"),P("İş", "HeadTR")]] + [[P(a,"CellTR"),P(b,"CellTR")] for a,b in phases]
pt = Table(pr, colWidths=[40*mm,129*mm], repeatRows=1)
pt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), GREEN), ("GRID", (0,0), (-1,-1), .35, colors.HexColor("#CBD5E1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE,LIGHT]), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story += [pt, Spacer(1, 6*mm)]

final = Table([[P("NET SONUÇ", "HeadTR")], [P("Mevcut SG EduCoach için Vercel + Supabase yapısını korumak, GitHub deposunu private yapmak ve alan adını Squarespace DNS üzerinden Vercel'e bağlamak en düşük riskli çözümdür. Firebase geçişi performans sorununu otomatik çözmez ve mevcut ilişkisel veri yapısını yeniden yazmayı gerektirir.", "BodyTR")]], colWidths=[doc.width])
final.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY), ("BACKGROUND", (0,1), (-1,1), PALE),
    ("BOX", (0,0), (-1,-1), .8, colors.HexColor("#93C5FD")),
    ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
]))
story += [final, Spacer(1, 7*mm), P("Başlıca resmî kaynaklar", "H1TR")]
for src in [
    "Firebase - Cloud Firestore pricing: firebase.google.com/docs/firestore/pricing",
    "Firebase - Security Rules: firebase.google.com/docs/rules",
    "Supabase - Auth: supabase.com/docs/guides/auth",
    "Vercel - Git deployments: vercel.com/docs/git",
    "Render - Custom domains: render.com/docs/custom-domains",
    "Fly.io - Custom domains: fly.io/docs/networking/custom-domain",
    "Squarespace - Google Domains migration: support.squarespace.com",
]: story.append(bullet(src))

doc.build(story)
print(OUT)
