# Konu Çalışma Alanı — Sesli Giriş Planı

**Durum:** Plan; bu dosya Konu Çalışma formunda henüz özellik açmaz.
**Kapsam:** Öğrenci panelindeki `KonuCalismaForm`; fotoğraf/OCR ve Deneme girişi kapsam dışı.

## Amaç ve sınırlar

Öğrenci konu çalışmasını sesle daha hızlı taslak olarak girebilsin. Ses yalnızca form alanlarını doldurur; **asla otomatik kayıt, “Konuyu oku” çağrısı veya tarih değiştirme yapmaz**. Öğrenci alanları kontrol edip Kaydet'e kendisi basar. Ses kaydı sunucuya veya veritabanına gönderilmez; tarayıcının konuşma tanıma hizmetinin kendi işleme biçimi ise tarayıcıya bağlıdır. Ücretli ses API'si eklenmez.

## Önerilen ilk sürüm

1. `Soru Çözümü` için kullanılan tanıma oturumu, 4 saniyelik sessizlik sayacı, Türkçe hata mesajları ve iOS/Chrome klavye diktesi alternatifi ortak bir istemci yardımcı bileşenine ayrılır.
2. Konu Çalışma formunda ayrı ses düğmeleriyle **ders**, **konu araması / ünite**, **tek oturum süresi** ve **yayınevi** doldurulur. Tek uzun komutla bütün formu otomatik çözmeye ilk sürümde çalışılmaz.
3. Ders adı yalnızca öğrencinin mevcut `dersListesi` değerleriyle eşleşirse seçilir. Eşleşme yoksa alan değişmez, açık hata gösterilir. Önceden görevden gelen ders sessizce değiştirilmez; değişim için öğrenci onayı istenir.
4. Konu adı serbestçe kaydedilmez: ses sonucu mevcut önerilerde arama yapar; birden çok eşleşme varsa seçenekler gösterilir ve öğrenci seçer. 9–11. sınıfın hiyerarşik müfredatında önce **ünite**, varsa sonra **alt konu** seçilir. Tanınmayan konu için tahmin üretilmez.
5. Süre yalnızca tam dakika olarak ve `SURE_UST_SINIR` dâhil mevcut form kurallarıyla doğrulanır. “Kırk dakika” ve “40 dakika” aynı değere çevrilebilir; günlük toplam ile tek oturum süresi karıştırılmaması için formdaki açıklama korunur.
6. Yayınevi serbest metin olarak sesle doldurulabilir; “yayınevi Palme” gibi ön ek temizlenir. Metin mutlaka formda görünür ve düzeltilebilir.
7. **Konuya hakimiyet** ve buna bağlı değişen takip sorusu ilk sürümde elle seçilir. “Konuyu oku” yapay zekâ çağrısı ses komutuyla tetiklenmez. Tarih, sınıf filtresi ve kayıt onayları mevcut davranışını korur.

## Teknik yaklaşım

- Tanıma yalnızca düğmeye basıldığında başlar; ana sayfa paketine yeni model/API eklenmez. `SpeechRecognition` / `webkitSpeechRecognition` ve desteklenmeyen cihazlar için metin/klavye diktesi kullanılır.
- Son algılanan sonuçtan sonra 4 saniyelik uygulama sayacı oturumu durdurur. Tarayıcı kendi oturumunu daha erken bitirebilir; bunun iOS Safari üzerinde gerçek cihazla sınanması gerekir.
- Ders/konu/süre çözümleme saf fonksiyonlarda tutulur ve mevcut sunucu doğrulamalarıyla aynı sınırları kullanır. Belirsiz, yinelenen veya sınır dışı değer forma aktarılmaz.
- Aynı anda iki mikrofon oturumu çalıştırılmaz; alan değiştirildiğinde önceki oturum durdurulur. Form kapandığında zamanlayıcı ve tanıma nesnesi temizlenir.
- Görev karşılığı ve rehberin öğrenci adına giriş yaptığı formlarda `prefillDers`, `prefillKonu`, `gorevAtamaId`, `gorevTarihi` korunur; ses bunları arkadan değiştiremez.

## Kabul ölçütleri

- Ders, konu, süre ve yayınevi ayrı ayrı söylenip görünür taslak alanlara aktarılabiliyor; kullanıcı her alanı düzeltebiliyor.
- “Matematik — Türev — 40 dakika — Palme” örneğinde doğru öneriler gösteriliyor; belirsiz veya listede olmayan ders/konu seçilmiyor.
- 9–11. sınıf ünite/alt konu akışı, görevden önceden doldurulmuş form ve rehber formu ayrı ayrı test ediliyor.
- iOS Safari, iOS Chrome klavye diktesi, Android Chrome ve masaüstünde izin reddi, sessizlik, erken tarayıcı bitişi ve manuel düzeltme deneniyor.
- Sesli giriş hiçbir koşulda kayıt veya yapay zekâ konu anlatımı çağrısı yapmıyor. Kayıt yalnızca öğrencinin Kaydet eylemiyle gerçekleşiyor.
- Vitest, TypeScript, lint ve üretim derlemesi geçiyor; gerçek telefon denemesi yapılmadan “iOS doğrulandı” denmiyor.

## Uygulama sırası

Önce alan bazlı prototip ve testler, sonra iki gerçek iPhone/Android denemesi, ardından sınırlı canlı pilot. Pilotta yanlış eşleşme örnekleri anonim olarak değerlendirilir; gerektiğinde sözcük eşlemesi revize edilir. Fotoğrafla veri girişi bu planın dışında bekler.
