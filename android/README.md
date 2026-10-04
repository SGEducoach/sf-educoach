# SeFu Koç Android APK

Bu klasör, `https://www.sefukoc.com/manifest.json` üzerinden Bubblewrap 1.25.0 ile oluşturulan Trusted Web Activity kaynak projesidir. Paket kimliği `com.sefukoc.app`, başlangıç adresi `/uygulama-basla`, ilk sürüm kodu `1`.

4 Ekim 2026'da oluşturulan imzalı test APK'sı `public/indir/sefukoc-android-v1.apk` konumundadır. İndirme sayfası `/android` adresindedir. APK üretildi ve `apksigner verify` ile v1/v2/v3 imzası doğrulandı; Mi Pad 7 üzerinde kurulum ve kullanım henüz test edilmedi.

## İmza ve alan adı

- İmza sertifikası SHA-256: `59:16:CD:07:06:00:46:B8:6D:5E:85:1C:AB:5F:AB:65:E5:1A:E4:F3:59:D8:4D:23:E8:87:FC:62:59:EF:6B:E8`.
- Alan adı doğrulaması: `public/.well-known/assetlinks.json`. Bu dosya canlıya çıktığında aynı alan adından APK kurulumu tam ekran TWA açılmasını sağlar.
- İmzalama anahtarı Git dışında, Windows kullanıcı profilindeki `.bubblewrap/keys/sefukoc.keystore` dosyasındadır. Parolası aynı klasörde `.dpapi` uzantılı dosyada Windows CurrentUser şifrelemesiyle saklanır. Bu şifreli dosya yalnızca aynı Windows kullanıcısı tarafından çözülebilir; başka bilgisayara doğrudan taşınamaz. Anahtar ve parola güvenli biçimde ayrıca yedeklenmeden bu bilgisayardaki dosyalar silinmemelidir.
- Depodaki `twa-manifest.json` yerel anahtar yolunu içermez. Yeni bir bilgisayarda Bubblewrap `build --signingKeyPath=<özel anahtar yolu>` kullanılmalı; aynı anahtar ve parola gerekir. Yeni anahtarla aynı paket kimliği altında güncelleme kurulamaz.

## Sonraki sürüm

1. `twa-manifest.json` ve `app/build.gradle` içindeki sürüm kodunu artır. Bubblewrap `update` kullanılıyorsa oluşan Gradle değişikliklerini denetle.
2. JDK 17 x64, Android SDK ve Bubblewrap ile imzalı APK üret. Anahtarı, parolayı ve derleme ara çıktılarını Git'e ekleme.
3. Yeni APK'nın paket kimliğini, sürümünü ve SHA-256 imzasını doğrula. `assetlinks.json` parmak izi aynı kalmalı.
4. Yeni APK'yı sürüm adına sahip yeni bir `public/indir/` dosyası olarak yayımla; `/android` sayfasını yeni dosyaya yönlendir. Eski dosyayı kullananlara güncelleme kurulabileceğini Mi Pad 7'de test et.

Google Play kullanılmadığı için kullanıcı Android'in mağaza dışı uygulama kurulum iznini vermelidir. 2027'de genişlemesi planlanan Android geliştirici doğrulaması, dağıtım büyütülmeden önce ayrıca kontrol edilmelidir.
