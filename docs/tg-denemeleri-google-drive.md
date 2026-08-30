# TG Denemeleri - Google Drive bağlantısı

## Google tarafı

1. Google Cloud projesinde **Google Drive API** etkinleştirilir.
2. Bir servis hesabı oluşturulur ve JSON anahtarı indirilir.
3. Google Drive'da `TG_Denemeleri` adlı klasör oluşturulur.
4. Klasör, servis hesabının `client_email` adresiyle **Görüntüleyen** olarak paylaşılır.

Klasörü herkese açık yapmak veya servis hesabına düzenleme yetkisi vermek gerekmez.

## Vercel ortam değerleri

- `GOOGLE_DRIVE_TG_FOLDER_ID`: Drive klasör bağlantısındaki klasör kimliği
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`: JSON dosyasındaki `client_email`
- `GOOGLE_DRIVE_PRIVATE_KEY`: JSON dosyasındaki `private_key`

Özel anahtar kaynak koda veya GitHub'a eklenmez; yalnızca Vercel ortam değerlerinde tutulur.

## Afiş dosyası adı

```text
YYYY-AA-GG__YYYY-AA-GG__afis-basligi.jpg
```

Örnek:

```text
2026-10-09__2026-10-12__mikro-orijinal-tyt-denemesi.jpg
```

İlk tarih başlangıç, ikinci tarih bitiş tarihidir. Desteklenen biçimler JPEG, PNG, WebP, GIF ve AVIF; azami dosya boyutu 15 MB'dir. Kurala uymayan dosyalar yanlış tarih göstermemesi için siteye alınmaz.

Drive listesi beş dakika önbellekte tutulur. Yeni afiş, yüklemeden sonra en geç yaklaşık beş dakika içinde TG Denemeleri sayfasında görünür.
