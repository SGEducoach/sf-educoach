# WhatsApp duyuru ekleri — Google Drive kurulumu

Genel WhatsApp duyurusundaki ek dosyalar (PDF, Word, Excel, PowerPoint, TXT, PNG, JPG, WEBP; en fazla 5 dosya, dosya başına 25 MB) ortak bir Google Drive klasörüne yüklenir. Öğrenci mesajdaki bağlantıdan ya da karttaki QR koddan açar. Kurulum bitmeden bu bölüm kapalı kalır ve eski "WhatsApp eki olarak paylaş" akışı aynen çalışır.

Kurulumu **site yöneticisi** (Google hesabı klasörün sahibi) yapar. Gizli değerleri sohbete, e-postaya ya da Git'e koymayın; yalnız Vercel ortam değerlerine yazın.

## 1. Google Cloud

1. Bir Google Cloud projesi seçin ya da oluşturun. **Proje numarasını** not edin (Proje ayarları → "Proje numarası", rakamlardan oluşur).
2. **API'ler ve hizmetler → Kitaplık**'tan şu iki API'yi etkinleştirin: **Google Drive API** ve **Google Picker API**.
3. **OAuth izin ekranı:**
   - Kullanıcı türü: Harici (kurum Google Workspace ise Dahili de olur).
   - Kapsam: yalnız `https://www.googleapis.com/auth/drive.file`. Başka kapsam eklemeyin; site yalnız kendi yüklediği ya da klasör seçicisinden seçilen öğelere erişir, Drive'ın geri kalanını göremez.
   - **Yayın durumunu "Üretimde" (In production) yapın.** "Test" durumunda Google yenileme anahtarını 7 gün sonra geçersiz kılar ve bağlantı her hafta kopar.
4. **Kimlik bilgileri → OAuth istemci kimliği oluştur → Web uygulaması:**
   - Yetkili yönlendirme URI'si: `https://www.sefukoc.com/api/whatsapp-drive/callback` (tam olarak bu; başka bir alan adı kullanılacaksa `GOOGLE_DRIVE_SITE_URL` de değişir).
   - İstemci kimliği ve istemci gizli anahtarını kaydedin.
5. **Kimlik bilgileri → API anahtarı oluştur** (klasör seçici için):
   - Uygulama kısıtı: HTTP yönlendiren (web sitesi) → `https://www.sefukoc.com/*`.
   - API kısıtı: Google Picker API.

## 2. Drive klasörü

1. Drive'da dosyaların toplanacağı klasörü (ya da alt klasörü) oluşturun.
2. Klasör paylaşımı: **"Bağlantıya sahip olan herkes → Görüntüleyen"**. Site bu paylaşımı doğrular; değilse klasörü kabul etmez.
3. Klasöre yalnız duyuru ekleri konur. **Öğrenciye özel sonuç, kimlik, not gibi kişisel veri yüklemeyin;** bağlantıyı bilen herkes açabilir.

## 3. Vercel ortam değerleri (Production)

| Ad | Değer |
| --- | --- |
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth istemci kimliği |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth istemci gizli anahtarı |
| `GOOGLE_DRIVE_TOKEN_KEY` | 64 onaltılık karakter (32 bayt). Üretmek için: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_DRIVE_PICKER_KEY` | Picker API anahtarı |
| `GOOGLE_DRIVE_PROJECT_NUMBER` | Google Cloud proje numarası |
| `GOOGLE_DRIVE_SITE_URL` | İsteğe bağlı; varsayılan `https://www.sefukoc.com` |

`GOOGLE_DRIVE_TOKEN_KEY` değişirse kayıtlı Google bağlantısı çözülemez; admin hesabı yeniden bağlar. Anahtarı Supabase ya da JWT anahtarlarıyla karıştırmayın.

Ortam değerlerini ekledikten sonra yeni bir yayın (redeploy) gerekir.

## 4. Veritabanı

`supabase/migrations/0181_whatsapp_drive_baglantisi.sql` uygulanır (tek satırlık `whatsapp_drive_baglantisi` tablosu, yalnız servis anahtarıyla erişilir). Uygulanmadan önce admin ekranı "Veritabanı güncellemesi 0181 uygulanmalı" uyarısı gösterir.

## 5. Sitede bağlama

1. Admin → İletişim → WhatsApp → **Duyuru ekleri · Google Drive → Drive bağlantısını yönet**.
2. **Google hesabını bağla** → Google'da klasörün sahibi hesapla izin verin ("Seçtiğiniz dosya ve klasörler" izni).
3. **Hedef klasörü seç** → Google klasör seçicisinden klasörü seçin. Seçim sunucuda yeniden doğrulanır (klasör mü, çöpte mi, eklenebilir mi, herkese açık mı).
4. Durum "Hazır · klasör adı" olmalı.

## 6. Deneme listesi (gerçek hesapla)

- Bir öğretmen/müdür hesabıyla genel duyuru hazırlayıp **Dosyaları Drive üzerinden paylaş** bölümünden küçük bir PDF yükleyin; "Yüklendi · Drive'da aç" bağlantısı gizli sekmede açılmalı.
- Uzantısı `.pdf` olup içeriği PDF olmayan bir dosya reddedilmeli ve Drive'dan silinmeli.
- Kart indirmesinde QR kodu telefonla okunmalı, bağlantı dosyayı açmalı.
- Telefonda "Paylaş (WhatsApp)": kart ve bağlantı metni gelmeli; metin görünmezse "Dosya bağlantılarını kopyala" çalışmalı.
- Drive ayarsızken (ortam değeri yokken) duyuru ekranı eskisi gibi çalışmalı; Drive bölümü "henüz hazır değil" demeli.
- Admin "Bağlantıyı kaldır" dedikten sonra yeni yükleme reddedilmeli; Drive'daki eski dosyalar silinmemeli.

## 7. Davranış ve sınırlar

- Yükleyebilenler: genel duyuru yetkisi olan öğretmen, müdür, rehber, sınıf öğretmeni ve admin; kurumun duyuru modülü açık ve süresi dolmamış olmalı. Öğrenci/veli yükleyemez.
- Dosya baytları tarayıcıdan doğrudan Google'a gider; sunucu yalnız tek dosyalık yükleme oturumu açar ve sonunda ad, boyut, tür, klasör ve herkese açık erişimi yeniden doğrular. Ayrıca dosyanın ilk baytları uzantıyla karşılaştırılır; uyuşmuyorsa dosya silinir.
- Saatlik en fazla 30 yükleme başlatılır (denetim kaydına bakılarak; aynı anda gelen isteklerde kesin değildir).
- Karttan "Kaldır" ya da bağlantıyı kesmek Drive'daki dosyayı **silmez**. Eski ekleri zaman zaman klasörden elle temizleyin.
- Her işlem `admin_audit_log` tablosuna yazılır (`whatsapp_drive_bagla/klasor/baslat/tamamla/ayir/icerik_reddedildi`).
