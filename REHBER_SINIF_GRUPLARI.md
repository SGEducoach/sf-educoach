# Lise rehber öğretmenlerinin sınıf grupları

## Kapsam

Yalnızca `tur=okul`, `kademe=lise/ikisi` kurumlarındaki Rehber Öğretmen branşı. Yönetici ve kurum moderatörü her rehbere 9, 10, 11, 12 düzeylerinden birden fazlasını atayabilir. Örnek: A öğretmen 9–11, B öğretmen 10–12. Aynı düzeye birden fazla rehber atanabilir. Dershane, grup koçluğu ve yalnız ortaokul kurumlarının yapısı değiştirilmez.

## Kullanım

- Yönetici: Okullar bölümünde seçilen lise kurumunun rehber sınıf atamaları.
- Moderatör: Öğretmenler bölümündeki rehber sınıf grupları.
- Her rehberin seçimlerini ayrı Kaydet düğmesiyle kaydedin.
- Boş seçim rehberin öğrenci kapsamını kaldırır. Kurumda henüz sınıfı bulunmayan düzey seçilemez.

Öğrenci listesi, öğrenci profili, rehber mesajı/duyurusu ve kurum/deneme performansı atanmış düzeylerle sınırlanır. Öğrenciye bağlı RLS tablolarına ek kısıtlayıcı politikalar uygulanır; mevcut izinleri genişletmez. Rozet ve sayaç RPC'leri de sınırı kontrol eder. Öğretmen kendi düzeylerini, kapsamı atlatmak için branşını veya kurumunu değiştiremez. Bu çalışma okul rehberlerine daha önce olmayan dershane veri giriş yetkilerini eklemez.

## Geçiş ve yayın sırası

1. Test veritabanında `supabase/migrations/0143_rehber_sinif_duzeyleri.sql` dosyasını uygulayın.
2. 9/11 atanmış rehberle 10/12 öğrencilerini listeleme, doğrudan profil URL'si, mesaj ve doğrudan Supabase sorgusunu deneyin. Okuma/yazma reddedilmelidir. Boş seçim, kendi atamasını değiştirme, diğer kurum ve dershane regresyonunu da kontrol edin.
3. Doğrulamadan sonra canlı veritabanına migration uygulayın; sonra uygulama kodunu yayınlayın. Kod yeni sütunu okuduğu için bu sıra zorunludur.
4. Kurum moderatörleriyle gerçek atamaları düzenleyin.

Migration ilk geçişte mevcut lise rehberlerine kurumun mevcut 9–12 düzeylerini atar; mevcut erişim yönetici seçim yapana kadar korunur. Sonradan eklenen rehberler boş kapsamla başlar. Veri taşıma kısmı ilk kurulum içindir: migration dosyasını tekrar elle çalıştırmayın; yeniden çalıştırmak atamaları başa döndürür.

## Doğrulama durumu

- TypeScript tür kontrolü ve değişen dosyalarda ESLint başarılı.
- Vitest: 41 dosya, 481 test başarılı; 11 yeni sunucu atama yetkisi testi dahil.
- SQL migration yerel PGlite/PostgreSQL motorunda başarılı: sınıf bazlı RLS, boş kapsam, kapsam dışı doğrudan yazma, kendi atamasını/branşını değiştirme, rozet RPC ve sayaç kontrolleri geçti. Test: `node scripts/test-rehber-sinif.mjs` (PGlite bağımlılığı `tmp/sql-tests` altında).
- Canlı Supabase üzerinde henüz uygulanmadı; yönetim oturumu bekleniyor.
- GitHub'a gönderim ve canlı yayın yapılmadı. OneDrive kopyası kullanılmadı.
