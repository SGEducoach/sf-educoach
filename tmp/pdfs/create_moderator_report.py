from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "moderator_talepleri_ve_calisma_plani.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

FONT_DIR = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("DejaVu", str(FONT_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONT_DIR / "arialbd.ttf")))

TEAL = colors.HexColor("#0F766E")
DARK = colors.HexColor("#18302F")
MINT = colors.HexColor("#CCFBF1")
PALE = colors.HexColor("#F0FDFA")
GRAY = colors.HexColor("#526665")
LINE = colors.HexColor("#99D5CF")
AMBER = colors.HexColor("#F59E0B")
RED = colors.HexColor("#B91C1C")

styles = getSampleStyleSheet()
title = ParagraphStyle("TitleTR", fontName="DejaVu-Bold", fontSize=23, leading=29, textColor=DARK, alignment=TA_LEFT, spaceAfter=7 * mm)
subtitle = ParagraphStyle("SubtitleTR", fontName="DejaVu", fontSize=10.5, leading=16, textColor=GRAY, spaceAfter=5 * mm)
h1 = ParagraphStyle("H1TR", fontName="DejaVu-Bold", fontSize=16, leading=21, textColor=TEAL, spaceBefore=4 * mm, spaceAfter=3 * mm)
h2 = ParagraphStyle("H2TR", fontName="DejaVu-Bold", fontSize=11.5, leading=16, textColor=DARK, spaceBefore=3 * mm, spaceAfter=2 * mm)
body = ParagraphStyle("BodyTR", fontName="DejaVu", fontSize=9.3, leading=14, textColor=DARK, spaceAfter=2 * mm)
bullet = ParagraphStyle("BulletTR", parent=body, leftIndent=5 * mm, firstLineIndent=-3.5 * mm, bulletIndent=0, spaceAfter=1.4 * mm)
small = ParagraphStyle("SmallTR", fontName="DejaVu", fontSize=8, leading=11, textColor=GRAY)
table_header = ParagraphStyle("TableHeaderTR", fontName="DejaVu-Bold", fontSize=8, leading=11, textColor=colors.white)
callout = ParagraphStyle("CalloutTR", fontName="DejaVu-Bold", fontSize=9.2, leading=14, textColor=DARK, leftIndent=3 * mm, rightIndent=3 * mm, spaceBefore=2 * mm, spaceAfter=2 * mm)


def footer(canvas, doc):
    canvas.saveState()
    w, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 14 * mm, w - 18 * mm, 14 * mm)
    canvas.setFont("DejaVu", 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawString(18 * mm, 9 * mm, "SG EduCoach - Moderatör değerlendirme raporu")
    canvas.drawRightString(w - 18 * mm, 9 * mm, f"Sayfa {doc.page}")
    canvas.restoreState()


def bullets(items):
    return [Paragraph(f"• {item}", bullet) for item in items]


def section_heading(number, text):
    return KeepTogether([Paragraph(f"{number}. {text}", h1), Table([[""]], colWidths=[174 * mm], rowHeights=[0.7 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL)])), Spacer(1, 2 * mm)])


story = []
story.append(Spacer(1, 18 * mm))
story.append(Paragraph("Moderatör Talepleri ve<br/>Önerilen Çalışma Planı", title))
story.append(Paragraph("WhatsApp görüşmelerinden çıkarılan gereksinimler, güvenlik değerlendirmesi ve uygulanabilir yol haritası", subtitle))
story.append(Table(
    [[Paragraph("Hazırlanma tarihi", small), Paragraph("11 Ağustos 2026", body)],
     [Paragraph("Kapsam", small), Paragraph("Moderatör paneli, bildirimler, oturum güvenliği, yetkilendirme, sistem yönetimi ve tema", body)],
     [Paragraph("Öncelik yaklaşımı", small), Paragraph("Önce güvenlik, sonra yetki doğruluğu ve kullanılabilirlik, en son görsel geliştirmeler", body)]],
    colWidths=[40 * mm, 125 * mm],
    style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 1, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ])
))
story.append(Spacer(1, 10 * mm))
story.append(Table([[Paragraph("Yönetici özeti", h2)], [Paragraph("Görüşmelerde en kritik ihtiyaçlar; kaba kuvvet saldırılarına karşı giriş koruması, moderatör ve admin oturumlarının güvenli biçimde sonlandırılması, bildirimlerin yanlışlıkla veya aşırı sayıda gönderilmesinin önlenmesi ve moderatör yetkilerinin öğretmenlik göreviyle çakışmadan çalışmasıdır. Panelin sekmeli ve sayım bilgili yapıya dönüştürülmesi ikinci aşamada, otomatik tema ise son aşamada ele alınmalıdır.", body)]], colWidths=[165 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), MINT), ("BOX", (0, 0), (-1, -1), 1.2, TEAL), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)])))
story.append(PageBreak())

story.append(section_heading("1", "Moderatörün İstekleri"))
sections = [
    ("1.1 Moderatör panelinin kullanılabilirliği", [
        "Öğrenciler, öğretmenler ve diğer kullanıcı türleri ayrı sekmelerde gösterilsin.",
        "Kullanıcılar okul ve sınıfa göre kategorize edilebilsin veya filtrelenebilsin.",
        "Bir sekme açıldığında yalnızca ilgili liste yüklensin.",
        "Listenin üzerinde toplam kişi sayısı gösterilsin.",
        "Moderatör panelinden ana sayfaya ve erişebildiği diğer sayfalara geçiş butonları bulunsun.",
        "Site logosuna ana sayfa bağlantısı verilsin; moderatör panelinde sıkışıp kalma sorunu giderilsin.",
        "Moderatör olan kişinin sağ üstteki unvanı Öğretmen yerine Moderatör olarak gösterilsin.",
    ]),
    ("1.2 Moderatör ve öğretmen yetkilerinin birlikteliği", [
        "Bir kullanıcı aynı zamanda hem moderatör hem sınıf öğretmeni olabilsin.",
        "Moderatörlük, kullanıcının öğretmenlik ve sınıf sorumluluğunu kaldırmasın.",
        "Birden fazla yetki çakışmaya yol açmasın; bütün görevler doğru tanınsın.",
        "Mevcut yaklaşımda ana rol öğretmen olarak kalabilir, moderatörlük okul bazlı ek yetki olarak tutulabilir; arayüzde görünen unvan buna göre belirlenmelidir.",
    ]),
    ("1.3 Duyuru ve bildirim güvenliği", [
        "Bildirim gönderilmeden önce bir onay penceresi açılsın.",
        "Duyuru gönder, Bildirim gönder ve Push bildirimi ifadeleri tutarlı ve herkesin anlayacağı şekilde düzenlensin.",
        "Minimum karakter sınırı belirlensin; yalnızca boşluklardan oluşan içerik engellensin.",
        "Çok sık bildirim gönderilmesi engellensin.",
        "Başlangıç önerisi: kısa sürede en fazla 2 bildirim, ardından yaklaşık 5 dakika bekleme ve günlük en fazla 10 bildirim.",
        "Sınırlar yalnızca ekranda değil, sunucu ve veritabanı tarafında da uygulanmalı.",
    ]),
    ("1.4 Oturum ve giriş güvenliği", [
        "Admin ve moderatör oturumları belirli bir hareketsizlik süresinden sonra otomatik kapatılsın.",
        "Art arda hatalı giriş denemelerine süreli engel getirilsin.",
        "Kaba kuvvet yöntemiyle şifre denemelerine karşı sunucu taraflı koruma sağlansın.",
        "Engellenen kullanıcıya beklemesi gereken süre açıkça gösterilsin.",
    ]),
]
for heading, items in sections:
    story.append(Paragraph(heading, h2)); story.extend(bullets(items))

story.append(PageBreak())
story.append(Paragraph("1.5 Veritabanına ve sisteme bağımsız erişim", h2))
story.extend(bullets([
    "Proje sahipleri Supabase veritabanındaki tabloları görsel olarak görüntüleyebilsin.",
    "Gerektiğinde kullanıcıların rol ve yetkileri doğrudan düzeltilebilsin.",
    "Yetkili kişiler SQL çalıştırma, veri kontrolü ve acil müdahale yapabilsin.",
    "Kod, GitHub, Vercel ve Supabase erişimleri proje sahiplerinde bulunsun.",
    "Sistem yalnızca yapay zekâ yardımıyla yönetilebilir durumda bırakılmasın; işletme ve acil müdahale adımları belgelensin.",
]))
story.append(Table([[Paragraph("Güvenlik notu", h2)], [Paragraph("Bu erişim site içine gömülü bir SQL ekranıyla verilmemelidir. Supabase'in kendi yönetim paneli kullanılmalı ve erişim yalnızca proje sahipleri veya teknik yöneticilerle sınırlandırılmalıdır. Aksi durumda veritabanı anahtarlarının ve tüm kullanıcı verilerinin ele geçirilmesi riski doğar.", body)]], colWidths=[165 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")), ("BOX", (0, 0), (-1, -1), 1, AMBER), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)])))
story.append(Paragraph("1.6 Görsel tema önerisi", h2))
story.extend(bullets([
    "Sistem saatine göre gündüz açık, akşam koyu tema kullanılabilsin.",
    "Tema; arka plan, yazılar, kenarlıklar, kartlar ve diğer bileşenlerde bütünlüklü çalışsın.",
    "Bu madde işlevsel ve güvenlik ihtiyaçlarından daha düşük öncelikte ele alınsın.",
]))

story.append(section_heading("2", "Karar Verilmesi Gereken Noktalar"))
decision_data = [
    [Paragraph("Konu", table_header), Paragraph("Önerilen başlangıç değeri", table_header)],
    [Paragraph("Hareketsizlik zaman aşımı", body), Paragraph("Admin ve moderatör için 30 dakika", body)],
    [Paragraph("Hatalı giriş sınırı", body), Paragraph("5 başarısız deneme", body)],
    [Paragraph("İlk geçici engel", body), Paragraph("15 dakika; tekrarda kademeli artış", body)],
    [Paragraph("Bildirim minimum uzunluğu", body), Paragraph("10 görünür karakter", body)],
    [Paragraph("Bildirim sıklığı", body), Paragraph("5 dakikada en fazla 2 bildirim", body)],
    [Paragraph("Günlük bildirim limiti", body), Paragraph("Moderatör ve okul için ayrı ayrı en fazla 10", body)],
    [Paragraph("Otomatik tema saati", body), Paragraph("Europe/Istanbul saat dilimi", body)],
]
story.append(Table(decision_data, colWidths=[70 * mm, 95 * mm], repeatRows=1, style=TableStyle([("BACKGROUND", (0, 0), (-1, 0), TEAL), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)])))

story.append(PageBreak())
story.append(section_heading("3", "Önerilen Çalışma Planı"))
phases = [
    ("Aşama 1 - Kritik güvenlik", RED, [
        "Giriş denemelerini IP, hesap ve oturum bilgileriyle sunucu tarafında sınırlandırma.",
        "Tekrarlanan başarısız denemelerde kademeli geçici engel uygulama.",
        "Admin ve moderatörler için hareketsizlik zaman aşımı.",
        "Bildirim gönderim limitlerini veritabanında tutma ve gönderim öncesi son onay ekranı.",
        "Mobil ve masaüstünde güvenlik senaryolarını test etme.",
    ]),
    ("Aşama 2 - Rol ve yetki düzeni", TEAL, [
        "Öğretmenlik rolü ile moderatörlük yetkisinin birlikte çalışmasını kontrol etme.",
        "Sağ üst unvanı Moderatör olarak gösterme.",
        "Moderatörün sınıf öğretmenliği özelliklerini kullanabildiğini doğrulama.",
        "Admin, moderatör ve öğretmen yetki çakışma testleri.",
        "Başka okul verilerine yetkisiz erişimin engellendiğini doğrulama.",
    ]),
    ("Aşama 3 - Moderatör panelinin yenilenmesi", TEAL, [
        "Öğrenci, öğretmen, veli ve gerekiyorsa sınıf sekmeleri oluşturma.",
        "Her sekmede kayıt sayısı, okul/sınıf filtresi, arama ve aktif/pasif filtresi.",
        "Ana sayfa ve izinli bölümlere geçiş bağlantıları; logoya ana sayfa bağlantısı.",
        "Önce mobil ekran, ardından masaüstü doğrulaması.",
    ]),
    ("Aşama 4 - Bildirim ekranının sadeleştirilmesi", TEAL, [
        "Terminolojiyi Duyuru gönder ifadesinde birleştirme; teknik push bildirimi ifadesini kaldırma.",
        "Minimum/maksimum karakter bilgisini gösterme.",
        "Göndermeden önce hedef okul, alıcı sayısı, başlık ve metin özetini gösterme.",
        "Gönderimden sonra başarı bilgisini ve kalan günlük hakkı gösterme.",
        "Gönderilmiş duyurular için geçmiş kaydı oluşturma.",
    ]),
    ("Aşama 5 - Yönetim ve acil müdahale altyapısı", TEAL, [
        "Supabase, Vercel ve GitHub sahiplik/yetki kontrolleri.",
        "Yetkili hesaplarda iki aşamalı doğrulama.",
        "Hizmet anahtarlarını kişisel mesajlarla paylaşmama.",
        "Rol düzeltme, kullanıcı kurtarma, yedekleme ve geri dönüş yönergeleri.",
        "Kritik işlemler için kim, ne zaman, ne yaptı denetim kaydı.",
    ]),
    ("Aşama 6 - Görsel geliştirmeler", GRAY, [
        "Mevcut açık temayı koruyarak isteğe bağlı koyu tema hazırlama.",
        "Otomatik tema yanında elle seçim imkânı ve tercihin saklanması.",
        "Kart, grafik, pencere ve mobil alt menüleri iki temada kontrol etme.",
    ]),
]
for name, color, items in phases:
    story.append(KeepTogether([Table([[Paragraph(name, h2)]], colWidths=[165 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.Color(color.red, color.green, color.blue, alpha=0.10)), ("BOX", (0, 0), (-1, -1), 1, color), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)])), Spacer(1, 1.2 * mm), *bullets(items), Spacer(1, 2 * mm)]))

story.append(PageBreak())
story.append(section_heading("4", "Ek Güvenlik ve İşletme Önerileri"))
story.extend(bullets([
    "Moderatöre ham veritabanı erişimi verilmemeli; bu yetki proje sahipleri veya teknik yöneticilerle sınırlandırılmalı.",
    "Kullanıcı silme, şifre sıfırlama, rol değiştirme ve duyuru gönderme işlemleri denetim kaydına yazılmalı.",
    "Bildirim onay penceresinde hedef okul ve gerçek alıcı sayısı mutlaka gösterilmeli.",
    "Kullanıcı silme gibi geri dönüşü zor işlemlerde ikinci bir onay metni kullanılmalı.",
    "Moderatör paneli yalnızca moderatörün atandığı okulun verilerini göstermeli; değiştirilmiş isteklerle başka okula erişim önlenmeli.",
    "Otomatik tema, güvenlik ve panel kullanılabilirliği tamamlandıktan sonra ele alınmalı.",
    "Her aşama ayrı commit edilmeli ve canlıya çıkmadan önce iPhone 14 Pro Max ölçülerinde mobil test yapılmalı.",
    "Yedekleme ve acil geri dönüş adımları en az iki yetkili kişi tarafından bilinmeli ve düzenli olarak denenmeli.",
]))
story.append(Spacer(1, 5 * mm))
story.append(Table([[Paragraph("Önerilen uygulama sırası", h2)], [Paragraph("1) Giriş ve oturum güvenliği  →  2) Bildirim güvenliği  →  3) Rol/yetki doğrulaması  →  4) Moderatör paneli  →  5) Yönetim dokümantasyonu  →  6) Görsel tema", callout)]], colWidths=[165 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 1.2, TEAL), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)])))
story.append(Spacer(1, 6 * mm))
story.append(Paragraph("Sonuç", h1))
story.append(Paragraph("Çalışmanın ilk teslimatı güvenliği ve yetki doğruluğunu sağlamalıdır. Panel düzeni bu temel üzerine kurulmalı; görsel tema en son eklenmelidir. Böylece yeni özellikler eklenirken kritik kullanıcı verileri ve okul sınırları korunur, proje sahipleri de sistemi bağımsız şekilde yönetebilecek güvenli bir işletme modeline kavuşur.", body))

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=17 * mm, bottomMargin=20 * mm, title="Moderatör Talepleri ve Önerilen Çalışma Planı", author="SG EduCoach")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
