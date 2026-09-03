# Yönetici panelinde Google Analytics

Yönetici menüsünde **Google Analytics**: `/yonetici/google-analytics`.
7, 28 ve 90 günlük ziyaretçi, oturum, görüntüleme ve etkileşim raporları.
Rapor dün biter; tarihler GA4 mülkünün saat dilimine göredir.

Bu site için paylaşılan ölçüm kimliği: `G-6WSB8R2Q9P`.
GA4 mülk kimliği: `552121301` (`GA4_PROPERTY_ID`).
Ölçüm kimliği tek başına rapor okuma yetkisi sağlamaz ve `GA4_PROPERTY_ID` yerine yazılmaz.

## Bağlantı

1. `GA4_PROPERTY_ID` değerini **552121301** olarak ayarlayın. Yerel `.env.local` dosyasında bu değer hazırdır; canlı sunucuda ayrıca ayarlanmalıdır.
2. Google Cloud projesinde **Google Analytics Data API** etkin olsun.
3. Hizmet hesabının e-posta adresine ilgili GA4 mülkünde **Görüntüleyici** erişimi verin.
4. Vercel projesinin sunucu ortam değişkenlerine şunları ekleyin:
   - `GA4_PROPERTY_ID`: sayısal mülk kimliği.
   - `GA4_CLIENT_EMAIL`: hizmet hesabı e-postası.
   - `GA4_PRIVATE_KEY`: hizmet hesabının özel anahtarı. Gerçek satır sonları veya `\n` kabul edilir.
5. Ortam değişikliklerinden sonra uygulamayı yeniden yayımlayın.

Anahtarları kaynak koduna, sohbet mesajına veya `NEXT_PUBLIC_` değişkenine koymayın.
Yerel geliştirmede yalnızca Git dışında tutulan `.env.local` dosyasını kullanın.

Bu özellik mevcut GA4 raporlarını **okur**; siteye yeni izleme kodu veya çerez
eklemez. Mülkte veri toplanmıyorsa Google etiketi ve uygun ziyaretçi izin akışı
ayrıca kurulmalıdır. Bağlantı kurulmadığında sayılar yerine kurulum durumu gösterilir.

API hatası durumunda kullanıcıya güvenli bir hata mesajı gösterilir; token veya
Google'ın ham hata yanıtı gönderilmez. Veriler yalnızca admin doğrulamasından sonra
istenir. Aktif kullanıcı toplamı günlük değerler toplanarak hesaplanmaz; GA4'ün
dönemin tamamı için verdiği toplam kullanılır.

Kaynak: [Google Analytics Data API resmî başlangıç kılavuzu](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart).
