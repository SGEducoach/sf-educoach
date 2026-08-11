# SG EduCoach Yönetim ve Acil Müdahale Rehberi

Bu rehber, sistemin yapay zekâ desteği olmadan da güvenli biçimde yönetilebilmesi için hazırlanmıştır.

## 1. Yetkili hesaplar

- GitHub, Vercel ve Supabase üzerinde en az iki proje sahibi bulunmalıdır.
- Her proje sahibi kendi hesabını kullanmalı; ortak kullanıcı adı ve şifre kullanılmamalıdır.
- Bütün sahip hesaplarında iki aşamalı doğrulama açılmalıdır.
- Supabase `service_role`, VAPID özel anahtarı ve diğer gizli değerler WhatsApp, e-posta veya ekran görüntüsüyle paylaşılmamalıdır.
- Ayrılan personelin GitHub, Vercel ve Supabase erişimi aynı gün kaldırılmalıdır.

## 2. Sistem bileşenleri

| Bileşen | Görevi | Yönetim yeri |
| --- | --- | --- |
| GitHub | Kaynak kodu ve değişiklik geçmişi | Proje deposu |
| Vercel | Canlı yayın ve ortam değişkenleri | Proje ayarları / Deployments |
| Supabase | Veritabanı, kullanıcı hesapları ve erişim kuralları | Table Editor, Authentication, SQL Editor |

Bilgisayar kapalıyken site çalışmaya devam eder. Canlı uygulama Vercel'de, veritabanı ve kullanıcı hesapları Supabase'de barındırılır.

## 3. Güvenli veritabanı erişimi

1. Supabase Dashboard'a kişisel sahip hesabıyla giriş yapın.
2. Veri incelemek için önce **Table Editor** kullanın.
3. SQL Editor'da değişiklik yapmadan önce hedef tabloyu ve koşulu bir `select` sorgusuyla doğrulayın.
4. Toplu `update` veya `delete` işleminde okul ve kullanıcı kimliği koşullarını açıkça yazın.
5. Geri dönüşü zor bir işlemden önce yedek alın veya etkilenecek satırları dışa aktarın.
6. Site içine genel amaçlı SQL ekranı veya `service_role` anahtarı eklemeyin.

## 4. Kullanıcı rolü veya yetkisi çakışması

- Ana kullanıcı rolü `profiles.role` alanında tutulur.
- Öğretmen ve müdürün okul/sınıf bilgisi `teachers` tablosundadır.
- Okul moderatörlüğü ana rolü değiştirmez; `school_moderators` tablosunda ek yetki olarak tutulur.
- Moderatör aynı zamanda sınıf öğretmeni olabilir. Bu durumda `profiles.role = ogretmen`, `teachers.class_id` dolu ve `school_moderators` kaydı mevcut olmalıdır.
- Bir hesabı düzeltmeden önce Authentication kullanıcı kimliği ile `profiles.id` değerinin aynı olduğunu doğrulayın.

## 5. Kritik olaylarda izlenecek sıra

### Yetkisiz erişim şüphesi

1. İlgili hesabı Supabase Authentication ekranından geçici olarak engelleyin.
2. `admin_audit_log` tablosunda son işlemleri inceleyin.
3. Vercel ve Supabase erişim kayıtlarını kontrol edin.
4. Şüpheli hesabın şifresini ve gerekiyorsa ilgili gizli anahtarları değiştirin.
5. Olayın zamanı, etkilenen hesaplar ve yapılan işlemleri yazılı olarak kaydedin.

### Hatalı canlı yayın

1. Vercel Deployments ekranından son sağlıklı yayını belirleyin.
2. Son sağlıklı yayını yeniden canlıya alın.
3. Sorunlu commit'i GitHub'da işaretleyin; geçmişi silmeyin.
4. Düzeltmeyi ayrı commit olarak hazırlayıp test ettikten sonra yeniden yayınlayın.

### Yanlış kullanıcı silme veya veri değişikliği

1. Yeni veri girişini geçici olarak durdurun.
2. Supabase yedekleri ve işlem kayıtları üzerinden etkiyi belirleyin.
3. Geri yükleme işleminden önce mevcut verinin ayrıca yedeğini alın.
4. Yalnız etkilenen kayıtları geri yükleyin; tüm veritabanını gereksiz yere geri döndürmeyin.

## 6. Düzenli kontroller

- Haftalık: başarısız girişler, engellenen hesaplar ve `admin_audit_log` kayıtları.
- Aylık: GitHub/Vercel/Supabase yetkili listesi ve iki aşamalı doğrulama durumu.
- Aylık: yedeklerin varlığı ve örnek bir geri yükleme denemesi.
- Her yayından sonra: öğrenci, veli, öğretmen, moderatör ve admin girişleri; mobil görünüm; mesaj ve duyuru gönderimi.

## 7. Değişiklik yayınlama kontrol listesi

1. Değişiklik ayrı ve açıklayıcı bir commit içinde olmalı.
2. TypeScript, ESLint ve üretim derlemesi başarılı olmalı.
3. Veritabanı değişikliği varsa numaralı migration dosyası bulunmalı ve canlı Supabase'e uygulanmalı.
4. iPhone 14 Pro Max ölçülerinde temel mobil akış kontrol edilmeli.
5. Kritik işlemlerde okul sınırı ve yetkisiz erişim testi yapılmalı.
6. Yayın sonrası canlı sayfada kısa doğrulama yapılmalı.
