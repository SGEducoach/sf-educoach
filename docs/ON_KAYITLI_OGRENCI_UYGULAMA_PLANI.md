# Ön kayıtlı (hesapsız) okul öğrencileri — uygulama planı (24.10.2026)

Durum: **yalnızca plan**; kod ve veritabanı değişikliği yok. Onay verirsen aşağıdaki fazlarla uygularım.
Kapsam: Elbistan Bist Fen Lisesi'nden başlayıp tüm "okul" türü kurumlarda çalışacak şekilde. Rapora öğrenci adı/numarası yazılmadı (yalnızca sayılar).

## 1. İstediğin üç şey

1. Resmî listedeki ama sisteme üye olmamış öğrenciler **sistemde görünsün** ve üzerlerinde **"sisteme kayıtlı değil"** bilgisi yer alsın; **denemeleri yüklensin**.
2. Bu öğrencilere, sisteme girince kullanmaları/uygulamaları için verilen **ödev ve duyurular 10 gün saklansın**.
3. **10 gün içinde üye olursa** saklı ödev ve duyurular sayfasına eklensin (süre dolarsa silinsin).

## 2. Canlıda şu an ne var (salt okunur ölçüm)

Elbistan Bist Fen Lisesi:

| Ölçü | Sayı |
|---|---|
| Okul öğrenci listesi (`okul_ogrenci_listesi`) | 502 |
| — hesabı olan | 228 |
| — **hesabı olmayan (ön kayıtlı)** | **274** |
| Resmî liste (`resmi_ogrenci_listesi`, üyelik kapısı) | 500 |
| Yüklü ama kimseye bağlanmamış deneme sonucu (`pdf_deneme_eslesme_bekleyenler`, durum "bekliyor") | 669 satır / 409 kişi (347 TYT + 322 Branş) |
| — okul numarasıyla **hesapsız** öğrenciye denk gelen | 508 satır / **258 kişi** |
| — okul numarasıyla **hesabı olan** öğrenciye denk gelen (atanmamış kalmış) | 27 satır / 25 kişi |
| — numarası boş | 125 satır (65'i ad ile tek kişiye denk geliyor, 0'ı birden fazla) |
| — numarası var ama listede yok | 9 satır |

Yani 274 hesapsız öğrencinin **258'inin denemesi zaten yüklü**; sadece öğrenciye/listeye bağlı değil, bu yüzden hiçbir ekranda görünmüyor. Eksik olan sadece bağlantı ve ekran.

Mevcut yapı taşları (yeniden kullanılacak):
- `okul_ogrenci_listesi`: sınıf mevcudunun tek kaynağı. Öğrenci üye olunca `students` tetikleyicisi (`okul_ogrenci_listesini_esitle`, 0105) aynı okul numaralı satıra `student_id` bağlar. Yazılı analizi bu listeyi zaten hesapsız öğrencilerle kullanıyor.
- `pdf_deneme_eslesme_bekleyenler`: PDF'ten gelen, eşleşmemiş sonuçlar (ad, numara, ders sonuçları jsonb, yayınevi, tarih, tür).
- `bekleyenPdfSonuclariniOgrenciyeAktar` (`deneme-sonucu-kaydet.ts`): bekleyen sonucu gerçek öğrenciye yazan işlev — bugün **yalnız dershane ön kaydında** çağrılıyor, okul öğrencisinde yok.
- `bekleyen_ogretmen_programlari` + öğretmen `INSERT` tetikleyicisi: "üye olmayan için sakla, üyelikte kopyala" deseninin çalışan örneği.
- Günlük cron'lar `src/app/api/cron/*` (silme işi buraya eklenir; `pg_cron` kullanılmıyor).

Engel: `gorev_atamalari.student_id`, `denemeler.student_id` → `students`, `duyuru_aliciler.profile_id` → `profiles` yabancı anahtarı; hesabı olmayana doğrudan satır yazılamaz.

## 3. Temel karar: sahte hesap açmıyoruz

Hesapsız öğrenci için `auth.users`/`students` satırı **uydurmuyoruz** (giriş/e-posta/aktiflik/risk hesaplarını bozar, "hesabı var" sayımını şişirir, silinmesi zor). Kimlik olarak zaten var olan **`okul_ogrenci_listesi.id`** kullanılır; hesapsız veri bu kimliğe bağlanır, üyelikte gerçek öğrenciye taşınır. Yazılı analizi aynı yolu 0105'te izledi.

## 4. Plan

### Faz 1 — Denemeleri listeye bağla ve göster (hesapsız öğrenci görünür olur)

- Migration (0179): `pdf_deneme_eslesme_bekleyenler.liste_ogrenci_id` (null, `okul_ogrenci_listesi`'ne FK, `on delete set null`) + indeks.
- Geri doldurma: **yalnız okul numarası eşleşmesiyle** otomatik (258 hesapsız + 25 hesaplı kişi). Ad ile eşleşen 65 satır **otomatik yazılmaz**: "deneme PDF'inde ad tek başına kimlik değil" kuralı (adaş tuzağı) gereği sınıf seviyesi de uyuyorsa yönetici onay ekranında toplu öneri olarak sunulur.
- Hesabı olan 25 kişinin 27 satırı: bugün atanmamış kalmış; bunlar kendi öğrencilerine toplu atanır (en hızlı kazanım, plandan bağımsız yapılabilir).
- Yeni PDF yüklemelerinde eşleştirme sırasında okul numarası listede varsa `liste_ogrenci_id` otomatik yazılır (`deneme-pdf-actions.ts`).
- Ekranlar: öğretmen/müdür/rehber **sınıf listesi**, **Sınıf Analizi**, **Deneme sonuçları sınıf görünümü** — hesapsız öğrenci satırı **"Sisteme kayıtlı değil"** rozetiyle, deneme neti/yüzdeliği yüklü denemeden hesaplanarak gösterilir. **Aktiflik, risk bayrağı, "bıraktı/geriledi" hesapları hesapsıza uygulanmaz** (veri girişi yok; yanlış alarm üretir). Mevcut "Kayıp nesil" özeti bu listeye bağlanıp "denemesi yüklü" bilgisini de taşır.
- Üyelikte: öğrenci hesap açıp numarasıyla eşleştiğinde bekleyen denemeler gerçek öğrenciye aktarılır (aynı kayıt biçimi: `ogretmenDenemeSonucuKaydet`). Okul kaydı tarayıcıdan (`supabase.auth.signUp`) yapıldığı için işlev sunucu kodunda çağrılamaz; iki seçenek: (a) ilk panel açılışında bir kez çalışan, tekrar çalışsa zarar vermeyen sunucu adımı (**önerim**, mevcut TS kodu aynen kullanılır), (b) tamamını SQL'e taşımak (tekrar yazım, daha riskli).

### Faz 2 — Ödev ve duyuru için 10 günlük bekleme

Veri modeli (aynı migration veya 0180):
- `bekleyen_gorev_atamalari (gorev_id, liste_ogrenci_id, created_at)` — `gorevler` satırı normal oluşur, hesapsız alıcı yalnız bu bağ tablosuna yazılır.
- `bekleyen_duyuru_aliciler (duyuru_id, liste_ogrenci_id)` — `duyurular` satırı normal oluşur.
- Süre: **verilme tarihinden 10 gün** (`created_at + interval '10 days'`); ayrı sütun gerekmez.
- Alıcı seçimi: öğretmen "Ödev ver" ve duyuru formunda sınıfın hesapsız öğrencileri de listelenir ("Sisteme kayıtlı değil" etiketli, seçilebilir). Toplu "tüm sınıf" seçimi hesapsızları da kapsar.
- Üyelik anı (DB, `students` tetikleyicisi içinde, hata öğrenci kaydını düşürmez): öğrenci listeye bağlanınca, bekleyen bağlardan **süresi dolmamış** olanlar için `gorev_atamalari` (durum "bekliyor") ve `duyuru_aliciler` (okundu=false) satırları açılır; bağ satırları silinir. Süresi dolmuşlar atlanır.
- Temizlik: günlük cron (`api/cron/bekleyen-temizle`, mevcut cron deseni) 10 günü geçen bağları siler. Cron geç kalsa bile üyelikte süre kontrolü yapıldığı için eski ödev yanlışlıkla eklenmez.
- Hesapsıza **bildirim gidemez** (push/e-posta yok). Bu yüzden davet şart: sınıf öğretmeni/müdür için mevcut WhatsApp kart akışına "sisteme giriş daveti" kartı (okul adı, adres, 10 gün içinde ödevlerin sizi beklediği) eklenir; otomatik mesaj gönderilmez, kişi kendisi paylaşır.

### Faz 3 — Güvenlik, test, canlı doğrulama

- RLS: yeni tablolara yazma yalnız sunucu/tetikleyici; okuma yalnız aynı okulun öğretmen/müdürü, okul moderatörü ve admin (`okul_ogrenci_listesi` politikasıyla aynı).
- Testler: eşleşme (numara/ad/adaş), süre sınırı (9. gün eklenir, 11. gün eklenmez), çift üyelik/tekrar çalıştırma (aynı ödev iki kez eklenmez), hesapsıza risk/aktiflik hesaplanmaması, yetki.
- Canlı: migration kullanıcı onayıyla; önce salt okunur karşılaştırma (kaç satır bağlanacak), sonra uygulama; gerçek bir test öğrencisiyle üyelik → ödev/duyuru/deneme geliyor mu doğrulaması (hesap açma sende/test hesabı).

## 5. Önerilerim

1. Okul numarasıyla eşleşmeyi otomatik, **adla eşleşmeyi onaylı** yap (yanlış öğrenciye not yazma riski; yazılı ve PDF tarafında zaten bu kural var).
2. 10 günü **ödev/duyurunun verildiği günden** say; üye olduğu günden sayarsan saklama süresi belirsiz uzar ve hesapsızın kişisel verisi daha uzun tutulur.
3. Saklı satırlarda "X gün sonra silinecek" göster (öğretmen görsün, öğrenciye davet ederken kullansın).
4. Süre dolunca kayıp yaşanmasın diye öğretmene "bu ödev/duyuru süresi doldu, yenilensin mi?" tek tık yenileme seçeneği.
5. Deneme sonuçları 10 günle **sınırlanmasın**: istediğin süre ödev/duyuru için; deneme sonucu okul yönetiminin yüklediği resmî veri ve sınıf analizinin parçası. Hesapsız öğrenciye ait deneme verisinin ne kadar tutulacağına KVKK açısından karar ver (öneri: okul dönemi sonuna kadar, sonra silme).
6. Faz 1'i ayrı yayınla (en hızlı değer: 258 öğrencinin zaten yüklü denemesi görünür olur); Faz 2'yi ardından.
7. Dershane ön kaydı (`pending_dershane_ogrenciler`) aynı mantığı ayrı yoldan yapıyor; şimdilik dokunma, ileride tek yapıya birleştir.

## 6. Senden bekleyen kararlar

1. 10 gün **verilme tarihinden** mi, **üyelikten** mi? (Önerim: verilme tarihi.)
2. Hesapsız öğrencinin deneme verisi ne kadar saklansın?
3. Ad ile eşleşen 65 satır yönetici onayıyla mı, hiç mi eşleştirilmesin?
4. Hesapsız öğrenciler Sınıf Analizi ortalamalarına katılsın mı? (Önerim: net/yüzdelik evet, aktiflik/risk hayır.)
5. Davet için WhatsApp kartı yeterli mi, yoksa öğrenci başına tek kullanımlık davet bağlantısı mı istenir?
6. Kapsam: yalnız Elbistan mı, tüm okul türü kurumlar mı? (Önerim: kod genel, veri bağlama kurum kurum.)

## 7. Tahmini iş sırası

Faz 1 (migration + geri doldurma + ekranlar + üyelikte aktarım) → onay + canlı doğrulama → Faz 2 (bağ tabloları, üyelik tetikleyicisi, form seçimi, cron, davet kartı) → onay + canlı doğrulama. Her faz ayrı commit, migration'lar sen onaylayınca uygulanır.
