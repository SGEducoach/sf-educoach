from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "9_10_sinif_ekleme_senaryosu.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

FONT = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("ArialTR", str(FONT / "arial.ttf")))
pdfmetrics.registerFont(TTFont("ArialTR-Bold", str(FONT / "arialbd.ttf")))

TEAL = colors.HexColor("#0F766E")
DARK = colors.HexColor("#18302F")
MINT = colors.HexColor("#CCFBF1")
PALE = colors.HexColor("#F0FDFA")
GRAY = colors.HexColor("#58706E")
LINE = colors.HexColor("#82CFC6")
AMBER = colors.HexColor("#F59E0B")
RED = colors.HexColor("#B91C1C")
BLUE = colors.HexColor("#2563EB")

title = ParagraphStyle("title", fontName="ArialTR-Bold", fontSize=23, leading=29, textColor=DARK, spaceAfter=6*mm)
subtitle = ParagraphStyle("subtitle", fontName="ArialTR", fontSize=10.5, leading=16, textColor=GRAY, spaceAfter=6*mm)
h1 = ParagraphStyle("h1", fontName="ArialTR-Bold", fontSize=16, leading=21, textColor=TEAL, spaceBefore=3*mm, spaceAfter=2.5*mm)
h2 = ParagraphStyle("h2", fontName="ArialTR-Bold", fontSize=11.5, leading=16, textColor=DARK, spaceBefore=2.5*mm, spaceAfter=1.5*mm)
body = ParagraphStyle("body", fontName="ArialTR", fontSize=9.2, leading=14, textColor=DARK, spaceAfter=2*mm)
bullet = ParagraphStyle("bullet", parent=body, leftIndent=5*mm, firstLineIndent=-3.5*mm, spaceAfter=1.2*mm)
small = ParagraphStyle("small", fontName="ArialTR", fontSize=8, leading=11, textColor=GRAY)
thead = ParagraphStyle("thead", fontName="ArialTR-Bold", fontSize=8, leading=11, textColor=colors.white)


def footer(canvas, doc):
    canvas.saveState()
    w, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.line(18*mm, 14*mm, w-18*mm, 14*mm)
    canvas.setFont("ArialTR", 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawString(18*mm, 9*mm, "SG EduCoach - 9 ve 10. sınıf ekleme senaryosu")
    canvas.drawRightString(w-18*mm, 9*mm, f"Sayfa {doc.page}")
    canvas.restoreState()


def bullets(items):
    return [Paragraph(f"• {x}", bullet) for x in items]


def heading(no, text):
    return KeepTogether([
        Paragraph(f"{no}. {text}", h1),
        Table([[""]], colWidths=[174*mm], rowHeights=[0.7*mm], style=TableStyle([("BACKGROUND", (0,0), (-1,-1), TEAL)])),
        Spacer(1, 2*mm),
    ])


def callout(head, text, color=TEAL, background=PALE):
    return Table([[Paragraph(head, h2)], [Paragraph(text, body)]], colWidths=[165*mm], style=TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), background), ("BOX", (0,0), (-1,-1), 1.1, color),
        ("LEFTPADDING", (0,0), (-1,-1), 9), ("RIGHTPADDING", (0,0), (-1,-1), 9),
        ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ]))


def table(rows, widths, header=True):
    return Table(rows, colWidths=widths, repeatRows=1 if header else 0, style=TableStyle([
        ("BACKGROUND", (0,0), (-1,0), TEAL if header else PALE),
        ("GRID", (0,0), (-1,-1), 0.5, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ROWBACKGROUNDS", (0,1 if header else 0), (-1,-1), [colors.white, PALE]),
        ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))


story = [Spacer(1, 16*mm)]
story += [Paragraph("9 ve 10. Sınıf Ekleme<br/>Senaryo ve Etki Analizi", title)]
story += [Paragraph("Mevcut SG EduCoach altyapısına 9. ve 10. sınıfların güvenli, sürdürülebilir ve mobil uyumlu biçimde eklenmesi için teknik ve eğitsel değerlendirme", subtitle)]
story += [table([
    [Paragraph("Rapor tarihi", small), Paragraph("12 Ağustos 2026", body)],
    [Paragraph("Karar", small), Paragraph("Uygulanabilir - kontrollü genişletme önerilir", body)],
    [Paragraph("Zorluk", small), Paragraph("Orta: temel kayıt kolay, doğru eğitim modeli ek çalışma gerektiriyor", body)],
    [Paragraph("Tahmini uygulama", small), Paragraph("Asgari teknik açılım 3-5 saat; önerilen tam senaryo 1-2 iş günü", body)],
], [42*mm, 123*mm], header=False)]
story += [Spacer(1, 8*mm), callout("Yönetici özeti", "9 ve 10. sınıflar mevcut sisteme eklenebilir. Ancak yalnızca classes tablosundaki kısıtı değiştirmek eksik ve riskli olur. Sınıf türleri, admin ekranı ve müdür duyuru kapsamı 11-12 ile sınırlandırılmıştır. Ayrıca 9-10 öğrencileri için AYT alanı, deneme türü ve rozet eşikleri pedagojik olarak yeniden değerlendirilmelidir. Müfredat verisinin önemli bölümü hazırdır: 9. sınıf için 32, 10. sınıf için 37 konu kayıtlıdır.")]
story += [PageBreak()]

story += [heading("1", "Mevcut Durum")]
current_rows = [
    [Paragraph("Bileşen", thead), Paragraph("Mevcut durum", thead), Paragraph("9-10 etkisi", thead)],
    [Paragraph("Veritabanı sınıf kısıtı", body), Paragraph("Yalnız 11 ve 12 kabul ediyor", body), Paragraph("Doğrudan ekleme başarısız olur", body)],
    [Paragraph("TypeScript SchoolClass", body), Paragraph("11 | 12 birleşimi", body), Paragraph("Derleme ve form türleri genişletilmeli", body)],
    [Paragraph("Sınıf ekleme formu", body), Paragraph("Sadece 11 ve 12 seçeneği", body), Paragraph("9 ve 10 görünmez", body)],
    [Paragraph("Müdür duyuru kapsamı", body), Paragraph("11 ve 12 sabit seçenek", body), Paragraph("9-10 toplu hedeflenemez", body)],
    [Paragraph("Öğrenci/öğretmen listeleri", body), Paragraph("Veriye dayalı", body), Paragraph("Yeni sınıflar otomatik görünür", body)],
    [Paragraph("Moderatör filtreleri", body), Paragraph("Veriye dayalı sınıf listesi", body), Paragraph("Yeni sınıflar otomatik görünür", body)],
    [Paragraph("Müfredat", body), Paragraph("9: 32, 10: 37 konu hazır", body), Paragraph("Büyük ölçüde kullanılabilir", body)],
    [Paragraph("Deneme modeli", body), Paragraph("TYT veya AYT", body), Paragraph("Branş denemesi modeli eksik", body)],
    [Paragraph("AYT alanı", body), Paragraph("Öğrencide zorunlu", body), Paragraph("9-10 için erken ve yanıltıcı olabilir", body)],
]
story += [table(current_rows, [48*mm, 57*mm, 60*mm])]
story += [Spacer(1, 4*mm), Paragraph("Doğrudan çalışan alanlar", h2)]
story += bullets([
    "Okul ve sınıf bazlı erişim kuralları; yeni sınıf kimlikleri üzerinden çalışır.",
    "Öğrenci, veli ve öğretmen bağlantıları; sınıf seviyesi yerine class_id kullanır.",
    "Mesaj kutusu, duyurular, giriş bildirimleri ve hesap güvenliği sınıf seviyesinden bağımsızdır.",
    "Konu çalışma, soru çözümü ve grafik altyapısı öğrenci kimliği üzerinden çalışır.",
])
story += [Paragraph("Sabit 11-12 varsayımları", h2)]
story += bullets([
    "classes.seviye veritabanı CHECK kısıtı.",
    "SchoolClass.seviye ve sinifEkle fonksiyonunun TypeScript türleri.",
    "Admin/müdür sınıf ekleme ekranındaki seçimler.",
    "Müdürün seviye bazlı duyuru seçenekleri ve sunucu doğrulaması.",
    "İlk kurulum seed verisinde yalnız 11-12/A-D sınıfları.",
])
story += [PageBreak()]

story += [heading("2", "İki Uygulama Senaryosu")]
scenario_rows = [
    [Paragraph("Ölçüt", thead), Paragraph("Senaryo A - Hızlı teknik açılım", thead), Paragraph("Senaryo B - Önerilen tam uyarlama", thead)],
    [Paragraph("Amaç", body), Paragraph("9-10 sınıf ve öğrenci kaydı açmak", body), Paragraph("Yaşa ve sınıfa uygun bütün deneyimi sağlamak", body)],
    [Paragraph("Kapsam", body), Paragraph("DB, türler, formlar, duyuru", body), Paragraph("Senaryo A + kayıt modeli, deneme, rozet, müfredat ve terfi", body)],
    [Paragraph("Süre", body), Paragraph("3-5 saat", body), Paragraph("1-2 iş günü", body)],
    [Paragraph("Risk", body), Paragraph("Orta-yüksek: 9-10 öğrencisi YKS modeline zorlanır", body), Paragraph("Düşük-orta: daha fazla test gerekir", body)],
    [Paragraph("Kullanıma uygunluk", body), Paragraph("Pilot/idari kayıt", body), Paragraph("Gerçek öğrenci kullanımı", body)],
]
story += [table(scenario_rows, [38*mm, 62*mm, 65*mm])]
story += [Spacer(1, 5*mm), callout("Öneri", "Gerçek öğrencilerin kullanacağı ortam için Senaryo B tercih edilmelidir. Senaryo A yalnızca kısa pilot, sınıf listesi hazırlığı veya aşamalı veri aktarımı amacıyla kullanılmalıdır.", AMBER, colors.HexColor("#FEF3C7"))]

story += [Paragraph("Senaryo A adımları", h2)]
story += bullets([
    "Yeni migration ile classes.seviye kısıtını 9, 10, 11 ve 12 olarak genişletme.",
    "Ortak SinifSeviyesi türü oluşturup bütün 11|12 tanımlarını bununla değiştirme.",
    "Admin sınıf ekleme formuna 9 ve 10 seçenekleri ekleme.",
    "Müdür duyuru ekranında seviyeleri sabit yazmak yerine mevcut sınıflardan dinamik üretme.",
    "İstenen şubeleri okul bazında ekleme; mevcut sınıflara dokunmama.",
])
story += [Paragraph("Senaryo B ek adımları", h2)]
story += bullets([
    "9-10 öğrencilerinde AYT alanını isteğe bağlı veya 'henüz seçilmedi' durumuna dönüştürme.",
    "9-10 için deneme adını Branş Denemesi yapma ve örnek PDF dağılımını şablon olarak tanımlama.",
    "Müfredat önerilerini öğrencinin sınıfına göre önceliklendirme.",
    "Rozet eşiklerini sınıf seviyesi ve ders yüküne göre değerlendirme.",
    "Yıl sonu sınıf yükseltme süreci ve 12. sınıf mezuniyet/arşiv senaryosu ekleme.",
])
story += [PageBreak()]

story += [heading("3", "Önerilen Veri ve Ürün Modeli")]
story += [Paragraph("3.1 Sınıf seviyesi", h2)]
story += bullets([
    "Tek kaynak: 9, 10, 11, 12 değerlerini içeren ortak SinifSeviyesi türü.",
    "Veritabanı kısıtı ile uygulama türleri aynı migration/commit içinde güncellenmeli.",
    "Şube biçimi mevcut düzende devam etmeli: büyük harf, okul + seviye + şube benzersiz.",
])
story += [Paragraph("3.2 Öğrenci akademik profili", h2)]
story += bullets([
    "9 ve 10. sınıfta AYT alanı zorunlu tutulmamalı; 'belirsiz' durumu desteklenmeli.",
    "Hedef bölüm bilgisi isteğe bağlı olabilir; öğrenci daha sonra güncelleyebilmeli.",
    "11-12'ye geçişte alan/ hedef seçimi için tamamlanması gereken profil adımı gösterilmeli.",
])
story += [Paragraph("3.3 Müfredat ve konu önerileri", h2)]
story += bullets([
    "Mevcut veri 9. sınıfta 32, 10. sınıfta 37 konu içeriyor; yeniden veri toplama zorunlu değil.",
    "Kayıtlardaki seviye etiketleri '9. Sınıf' ve '10. Sınıf' biçiminde; classes.seviye değerleri '9'/'10' olduğundan merkezi eşleme gerekir.",
    "TYT konuları tamamen gizlenmemeli; sınıf müfredatı önce, TYT destek konuları ikinci sırada gösterilmeli.",
    "Konu anlatımı üretiminde öğrencinin sınıf seviyesi modele açıkça iletilmeli.",
])
story += [Paragraph("3.4 Deneme ve rozet sistemi", h2)]
story += bullets([
    "9-10 öğrencilerinde sınav türü Branş Denemesi olarak gösterilmeli; TYT/AYT adı kullanılmamalıdır.",
    "Deneme soru üst sınırları seçilen branş ve PDF'den çıkarılan soru dağılımına göre doğrulanmalı.",
    "Mevcut soru rozeti beş TYT çekirdek dersini aynı anda arıyor; 9-10 için ders bazlı veya daha düşük eşik değerlendirilmelidir.",
    "Rozet değişikliği yapılmazsa sistem çalışır ancak genç öğrencilerin rozet kazanması gereksiz zor olabilir.",
])
story += [PageBreak()]

story += [heading("4", "Riskler ve Çözümler")]
risk_rows = [
    [Paragraph("Risk", thead), Paragraph("Düzey", thead), Paragraph("Çözüm", thead)],
    [Paragraph("DB ve uygulama sınıf değerlerinin ayrışması", body), Paragraph("Yüksek", body), Paragraph("Migration ve ortak türü aynı yayında çıkar", body)],
    [Paragraph("9-10 öğrencisine zorunlu AYT alanı", body), Paragraph("Yüksek", body), Paragraph("Belirsiz/isteğe bağlı alan modeli", body)],
    [Paragraph("Yanlış sınıfa toplu duyuru", body), Paragraph("Orta", body), Paragraph("Dinamik seviye listesi + alıcı sayılı onay", body)],
    [Paragraph("YKS denemesi ile branş denemesinin karışması", body), Paragraph("Orta", body), Paragraph("Sınıfa göre Branş Denemesi adı ve ayrı doğrulama", body)],
    [Paragraph("Rozetlerin ulaşılmaz olması", body), Paragraph("Orta", body), Paragraph("Sınıf bazlı eşik/uygun ders seti", body)],
    [Paragraph("Yıl sonunda manuel veri karmaşası", body), Paragraph("Orta", body), Paragraph("Toplu sınıf yükseltme ve önizleme", body)],
    [Paragraph("Mobil formların kalabalıklaşması", body), Paragraph("Düşük", body), Paragraph("Kademeli seçim, kısa etiket, 6.5 inç test", body)],
]
story += [table(risk_rows, [55*mm, 23*mm, 87*mm])]
story += [Spacer(1, 5*mm), callout("Güvenlik sınırı", "Yeni sınıflar mevcut okul ve class_id tabanlı RLS modelini kullanmalıdır. İstemciden gelen school_id, class_id veya seviye değerine güvenilmemeli; sınıfın seçilen okula ait olduğu sunucuda yeniden doğrulanmalıdır.", RED, colors.HexColor("#FEE2E2"))]

story += [heading("5", "Uygulama Planı")]
plan_rows = [
    [Paragraph("Aşama", thead), Paragraph("İş", thead), Paragraph("Tahmin", thead)],
    [Paragraph("1", body), Paragraph("DB kısıtı, ortak türler, sınıf ekleme", body), Paragraph("1-2 saat", body)],
    [Paragraph("2", body), Paragraph("Dinamik müdür duyuruları ve admin filtreleri", body), Paragraph("1-2 saat", body)],
    [Paragraph("3", body), Paragraph("9-10 öğrenci profil modeli ve kayıt akışı", body), Paragraph("2-3 saat", body)],
    [Paragraph("4", body), Paragraph("Müfredat eşleme ve konu önerileri", body), Paragraph("2-3 saat", body)],
    [Paragraph("5", body), Paragraph("Branş denemesi, konu eşleme ve rozet uyarlaması", body), Paragraph("4-7 saat", body)],
    [Paragraph("6", body), Paragraph("Mobil, rol, veri ve canlı yayın testleri", body), Paragraph("2-3 saat", body)],
]
story += [table(plan_rows, [22*mm, 113*mm, 30*mm])]
story += [Paragraph("Bağımlılık sırası", h2)]
story += bullets([
    "Önce migration ve ortak türler; sonra formlar ve duyurular.",
    "Öğrenci kaydı açılmadan önce AYT alanı kararı kesinleşmeli.",
    "Gerçek öğrenci kabulünden önce müfredat, deneme ve rozet politikası tamamlanmalı.",
    "Mevcut 11-12 kullanıcıları için geriye dönük uyumluluk her aşamada korunmalı.",
])
story += [PageBreak()]

story += [heading("6", "Kabul ve Test Senaryoları")]
tests = [
    ("Sınıf oluşturma", "Admin 9-A ve 10-C ekler; tekrar ekleme reddedilir; 11-12 kayıtları etkilenmez."),
    ("Öğrenci ekleme", "9-A öğrencisi tekli ve toplu eklenir; okul numarası okul içinde benzersiz kalır."),
    ("Öğretmen atama", "Bir öğretmen 10-C sınıf öğretmeni yapılır; aynı sınıfa ikinci atama engellenir."),
    ("Müdür duyurusu", "Müdür 9. sınıfları seçer; hepsi/sadece öğrenci/sadece veli seçenekleri doğru alıcılara gider."),
    ("Moderatör", "9 ve 10 sekme/filtre listelerinde görünür; başka okul verisi görünmez."),
    ("Veli bağlantısı", "9-A öğrencisinin veli talebi öğretmene ulaşır; kod ve mesaj akışı çalışır."),
    ("Konu çalışması", "9. sınıf öğrencisine önce 9. Sınıf müfredat konuları önerilir."),
    ("Branş denemesi", "9-10 öğrencisinde Branş Denemesi adı görünür; seçilen branşın PDF soru sınırlarıyla kaydedilir."),
    ("Rozet", "9-10 için belirlenen ders/eşik politikası doğru hesaplanır; 11-12 sonucu değişmez."),
    ("Sınıf yükseltme", "9-A -> 10-A önizlemesi alınır; onay sonrası öğrenciler topluca taşınır; işlem kaydı oluşur."),
    ("Mobil", "iPhone 14 Pro Max ve 6.5 inç Android ölçülerinde seçimler taşmaz; alt menü alanları kapatmaz."),
]
test_rows = [[Paragraph("Test", thead), Paragraph("Beklenen sonuç", thead)]] + [[Paragraph(a, body), Paragraph(b, body)] for a,b in tests]
story += [table(test_rows, [42*mm, 123*mm])]
story += [Spacer(1, 5*mm), callout("Canlıya geçiş ölçütü", "9 ve 10. sınıf öğrencisi alınmadan önce bütün kritik testler geçmeli; migration canlıda doğrulanmalı; en az bir 9 ve bir 10. sınıf pilot hesabıyla öğrenci-öğretmen-veli-müdür-moderatör akışı baştan sona denenmelidir.", BLUE, colors.HexColor("#DBEAFE"))]

story += [PageBreak(), heading("7", "Branş Denemesi PDF Analizi ve İş Akışı")]
story += [Paragraph("7.1 İncelenen kaynaklar", h2)]
story += bullets([
    "dokumanlar/mufredat/9.sınıf_ornek_deneme.pdf - 40 sayfa, 9. sınıf 3. deneme.",
    "dokumanlar/mufredat/10.sınıf_ornek_deneme.pdf - 40 sayfa, 10. sınıf 3. deneme.",
    "PDF'ler metin kopyalamaya kapalı olduğundan 80 sayfa görsel olarak; bölüm başlıkları, soru numaraları ve geçiş sayfaları üzerinden incelenmiştir.",
    "Her iki örneğin kapak yönergesinde toplam 120 soru ve 135 dakika bilgisi yer almaktadır. Branş bazlı süre bu toplamdan otomatik türetilmemeli; ayrıca ürün kararı verilmelidir.",
])
distribution_rows = [
    [Paragraph("Branş / bölüm", thead), Paragraph("Alt ders dağılımı", thead), Paragraph("Soru", thead)],
    [Paragraph("Türk Dili ve Edebiyatı", body), Paragraph("Tek bölüm", body), Paragraph("30", body)],
    [Paragraph("Sosyal Bilimler", body), Paragraph("Tarih 10 + Coğrafya 10 + Din Kültürü 5 + Felsefe 5", body), Paragraph("30", body)],
    [Paragraph("Matematik", body), Paragraph("Tek bölüm", body), Paragraph("30", body)],
    [Paragraph("Fen Bilimleri", body), Paragraph("Fizik 10 + Kimya 10 + Biyoloji 10", body), Paragraph("30", body)],
    [Paragraph("Toplam", body), Paragraph("Dört ana branş/bölüm", body), Paragraph("120", body)],
]
story += [table(distribution_rows, [48*mm, 92*mm, 25*mm]), Spacer(1, 4*mm)]
story += [callout("Ürün kararı", "9 ve 10. sınıf ekranlarında deneme sınavının adı Branş Denemesi olacaktır. Kullanıcı tek bir ana branşı seçip sonuç girebilir; Sosyal ve Fen seçildiğinde alt ders sonuçları ayrıca tutulmalıdır. Tam PDF tek oturumda uygulanırsa dört branş aynı uygulama/grup kimliği altında birleştirilmelidir.", TEAL, MINT)]
story += [Paragraph("7.2 Önerilen veri modeli", h2)]
story += bullets([
    "branş_deneme_şablonu: sınıf seviyesi, ana branş, alt ders, soru başlangıç/bitiş numarası, soru sayısı, kaynak PDF ve sürüm.",
    "branş_deneme_uygulaması: öğrenci, tarih, sınıf seviyesi, kaynak/şablon, uygulama grup kimliği ve gerçek süre.",
    "branş_deneme_sonucu: alt ders, doğru, yanlış, boş ve net; toplam doğru+yanlış+boş şablon soru sayısını aşamaz.",
    "branş_deneme_soru_konu: şablon, soru numarası, ders, müfredat konusu ve kazanım. Konu önerisinin güvenilir olması için bu eşleme zorunludur.",
])
story += [Paragraph("7.3 Denemeden konu çalışmaya geçiş", h2)]
story += bullets([
    "Yanlış ve boş sorular soru-konu eşleme tablosundan konu listesine dönüştürülür.",
    "Aynı konuda birden fazla hata varsa öncelik yükseltilir; yalnız bir hataya dayanarak kesin zayıf konu etiketi verilmez.",
    "Önerilen konu öğrencinin 9/10 sınıf müfredatında olmalı; sınıf dışı konu ayrıca uyarıyla gösterilmelidir.",
    "Öğrenci konu anlatımını açabilir, çalışma süresi ve hâkimiyet düzeyini kaydedebilir; sonraki branş denemesinde gelişim karşılaştırılır.",
])
story += [Paragraph("7.4 Soru çözme derslerinin branş denemesi bazlı belirlenmesi", h2)]
story += bullets([
    "Türk Dili ve Edebiyatı seçimi yalnız ilgili ders havuzunu; Matematik seçimi yalnız Matematik havuzunu açar.",
    "Sosyal Bilimler seçimi Tarih, Coğrafya, Din Kültürü ve Felsefe derslerini; Fen Bilimleri seçimi Fizik, Kimya ve Biyoloji derslerini açar.",
    "Günlük soru hedefi, alt dersteki yanlış+boş sayısı ve son denemelerde tekrar eden konu hatalarından türetilir.",
    "Soru çözme kaydı branş, alt ders ve öneriyi doğuran deneme ile ilişkilendirilir; böylece öneri-sonuç döngüsü ölçülür.",
    "Bir tam PDF dört ayrı deneme gibi rozet sayısını şişirmemeli; uygulama grup kimliğiyle tek oturum, alt sonuçlarla dört branş olarak raporlanmalıdır.",
])
story += [Paragraph("7.5 Ek kabul testleri", h2)]
story += bullets([
    "9 ve 10. sınıfta kullanıcıya TYT/AYT yerine Branş Denemesi adı gösterilir.",
    "Türk Dili ve Edebiyatı 30, Sosyal 30, Matematik 30 ve Fen 30 sınırları sunucu tarafında doğrulanır.",
    "Sosyal ve Fen alt ders toplamları ana branş toplamıyla eşleşir.",
    "Yanlış/boş soru, doğru sınıf müfredat konusuna bağlanır ve konu çalışma önerisi üretir.",
    "Soru çözme ekranında yalnız seçilen branşın alt dersleri görünür.",
    "Tam uygulama rozet/deneme sayacında bir oturum olarak sayılır; alt branş başarıları ayrıca analiz edilir.",
])

story += [heading("8", "Sonuç ve Tavsiye")]
story += [Paragraph("9 ve 10. sınıf ekleme, mevcut mimariyi yeniden kurmayı gerektirmez. Yeni ürün modeli Branş Denemesi adı üzerine kurulmalıdır. Örnek PDF'ler iki sınıfta da aynı 30+30+30+30 ana dağılımı göstermektedir. Deneme sonucundan güvenilir konu çalışma ve soru çözme önerisi üretmek için yalnız ders toplamı yeterli değildir; her soru numarasının müfredat konusu/kazanımıyla doğrulanmış eşlemesi tutulmalıdır. Tavsiye edilen yaklaşım Senaryo B ile kontrollü genişletme, PDF şablonlarının sürümlenmesi ve öneri-sonuç döngüsünün ölçülmesidir.", body)]

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=17*mm, bottomMargin=20*mm, title="9 ve 10. Sınıf Ekleme Senaryosu", author="SG EduCoach")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
