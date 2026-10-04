# SeFu Koç Android ve iOS uygulama planı

**Durum:** Android kurulabilir web uygulamasının ilk sürümü kodlandı. Android telefonla kurulum testi ve Play Store paketi henüz tamamlanmadı; iOS uygulaması geliştirilmedi.
**Başlangıç noktası:** 4 Ekim 2026. Sonraki bilgisayar veya AI çalışması bu dosyayı ve güncel kodu birlikte incelemeli.

## Ürün kararı

- `https://www.sefukoc.com` mevcut web sitesi olarak çalışmaya devam eder. Mobil uygulama aynı kullanıcı hesaplarını, rollerini ve Supabase verilerini kullanır.
- Öğrenci, veli, öğretmen, müdür, moderatör ve admin için ikinci bir hesap veya ayrı veri tabanı oluşturulmaz. Mevcut kurum yetkileri mobilde de geçerlidir.
- Uygulamayı açan kullanıcı bir karşılama ekranında **Kullanmaya Başla** düğmesini görür. Düğme, oturumu varsa doğrudan kendi panelini; yoksa mevcut giriş ekranını açar. Kullanıcıya tekrar kayıt yaptırılmaz. Karşılama ekranı sonraki açılışlarda atlanır.
- İnternet bağlantısı yoksa anlaşılır bir çevrimdışı ekranı ve **Tekrar Dene** düğmesi gösterilir. İlk sürümde çevrimdışı veri girişi vaat edilmez.
- Kurum haberleri, çalışma verileri ve bildirimler web ile aynı kaynaktan gelir. Bir cihazda yapılan değişiklik diğerinde aynı hesapla görünür.

## Uygulama biçimi ve dağıtım sırası

1. **İlk sürüm: kurulabilir web uygulaması (PWA).** Mevcut Next.js uygulamasının mobil kullanımını ve kurulum akışını tamamla. Android'de desteklenen tarayıcıda gerçek kurulum istemini göster; iOS'ta Safari'nin ana ekrana ekleme adımlarını açık ve kısa bir ekranda göster. Web adresi her zaman kullanılabilir kalır.
2. **Android mağaza sürümü:** PWA kabul testlerinden sonra, aynı alan adını kullanan Trusted Web Activity paketi değerlendir. Alan adı sahipliğini Digital Asset Links ile doğrula; Play Store hesabı, imzalama ve mağaza politikalarını yayın öncesinde doğrula.
3. **iOS mağaza sürümü:** App Store hedeflenirse ayrıca iOS uygulaması geliştir. Sadece siteyi WebView içinde açan bir kabuk yeterli sayılmamalı; mobil arayüz ve gerçekten yerel değer (örneğin güvenilir yerel bildirim akışı, dosya seçimi ve uygun oturum yönetimi) eklenmeli, App Review koşullarıyla test edilmeli. Sunucuda çalışan Next.js uygulamasını Capacitor `server.url` ile üretime bağlama: Capacitor bu ayarın canlı geliştirme için olduğunu söylüyor.

**Karar noktası:** Kullanıcının “indirilen uygulama” beklentisi mağaza indirimi ise 2 ve 3 gerekir. PWA ana ekrana kurulum sağlar; iOS Safari kurulumunu tek düğmeyle otomatik tamamlayamaz. Ürün metni bunu yanlış vaat etmemeli.

## Kullanıcı akışı

1. Kullanıcı web sitesindeki **Uygulamayı Edin** bağlantısını veya ilerideki mağaza sayfasını açar.
2. Kurulumdan sonraki ilk açılışta logo, kısa değer önerisi ve tek ana eylem: **Kullanmaya Başla**.
3. Oturum açıksa rolüne uygun mevcut panel; oturum yoksa mevcut giriş akışı. Kuruma katılım ve hesap oluşturma kuralları webdekiyle aynıdır.
4. Girişten sonra uygulama sonraki açılışlarda panele gider. Oturum süresi dolarsa giriş ekranına döner; şifre sıfırlama bağlantısı uygulamaya güvenli şekilde geri dönebilir.
5. Bildirim izni ilk açılışta zorlanmaz; kullanıcıya bağlamı açıklandıktan sonra mevcut bildirim ayarlarından istenir.

## Mevcut proje altyapısı

| Yer | Mevcut durum / kontrol |
| --- | --- |
| `public/manifest.json` | Ad, ikon, `start_url: /dashboard`, `display: standalone` tanımlı. Açılış yönlendirmesi ve ikonlar cihazlarda doğrulanmalı. |
| `src/app/layout.tsx` | Manifest ve Apple web app meta bilgileri var. |
| `public/sw.js` | Web push service worker var; çevrimdışı sayfa önbelleği olduğu varsayılmamalı. |
| `src/components/dashboard/BildirimAyarlari.tsx` | Bildirim aboneliği kullanıcı eylemiyle yapılıyor. iOS/Android cihaz testi gerekli. |
| `src/app/api/giris/route.ts` | Mevcut giriş akışı; mobil için ikinci kimlik sistemi açılmamalı. |
| `src/lib/supabase/middleware.ts` | Oturum çerezini yeniliyor; kurulu uygulama ve tarayıcı oturumları ayrı test edilmeli. |
| `src/app/dashboard/page.tsx` | Rol bazlı mevcut panel. Küçük ekran ve dokunma alanları gözden geçirilmeli. |

## Uygulama görevleri

### Android ilk sürümünde tamamlananlar (4 Ekim 2026)

- `src/app/uygulama/page.tsx`: Android kurulum istemi varsa kurulum düğmesi; yoksa Chrome menüsü yönergesi.
- `src/app/uygulama-basla/page.tsx`: İlk açılışta **Kullanmaya Başla**; daha sonraki açılışlarda doğrudan mevcut panele/girişe geçiş.
- `src/components/UygulamaKurulumBaglami.tsx`: Kurulum olayını sayfalar arasında tutma ve service worker kaydı.
- `public/manifest.json`: Başlangıç adresi ve uygulama kapsamı.
- `public/sw.js` ve `public/offline.html`: Ağ kesildiğinde genel çevrimdışı uyarısı; kişisel veriler önbelleğe alınmaz.
- Ana sayfada Android kurulum düğmesi: tarayıcı kurulum isteği hazırsa doğrudan açar; hazır değilse kurulum yönergelerine götürür. Alt menüde de kurulum sayfası bağlantısı var.

**Doğrulama:** TypeScript, ESLint ve üretim derlemesi geçti. Yerel tarayıcıda ilk düğmenin mevcut girişe gittiği ve sonraki açılışta karşılama ekranının atlandığı kontrol edildi. Gerçek Android cihazında kurulum istemi, simge, bildirim ve dosya/PDF davranışı ayrıca test edilmeli.

### A. PWA ve mobil deneyim

- Tüm rollerin giriş, şifre sıfırlama, veri girişi, PDF/görsel açma ve bildirim ekranlarını gerçek Android ve iPhone cihazlarında incele.
- Karşılama ekranını ve **Kullanmaya Başla** eylemini ekle. Kurulmuş uygulamada ilk açılışı ayırt et; daha sonra gereksiz karşılama gösterme. Oturum ve rol yönlendirmesi sunucudaki mevcut kurallardan geçsin.
- Web sitesine **Uygulamayı Edin** girişini ekle. Android'de kurulum istemi mevcutsa sun; yoksa tarayıcıya göre yönerge göster. iOS'ta ana ekrana ekleme yönergesini göster. Zaten kuruluysa yeniden kurulum çağrısı gösterme.
- Manifest simgeleri, maskeleme, başlangıç adresi, kapsam ve tema rengini kontrol et. iOS simgesini ve güvenli alan boşluklarını kontrol et.
- Çevrimdışı ve sunucu bakım durumlarını kullanıcıya açıkça anlat. Gönderilmemiş form verilerini sessizce kaybetme; yeniden deneme davranışını tanımla.
- Bildirim aboneliğini rol, cihaz ve tarayıcıya göre doğrula. İzin reddedilirse uygulama kullanılmaya devam eder.

### B. Android mağaza paketi

- Üretim alan adının PWA ve Trusted Web Activity koşullarını sağladığını denetle.
- Android paket kimliği, uygulama adı, ikon, açılış ekranı ve imzalama anahtarını kurum adına belirle; özel anahtarları Git'e koyma.
- Digital Asset Links doğrulaması, iç test, geri düğmesi, indirme/dosya açma ve bildirim davranışını gerçek cihazda dene.
- Play Store hesabı, gizlilik bağlantısı, veri güvenliği formu, ekran görüntüleri ve sürüm sürecini tamamla.

### C. iOS mağaza paketi (ayrı karar ve çalışma)

- Apple Developer hesabı, paket kimliği, sertifikalar ve TestFlight dağıtımını hazırla; gizli anahtarları Git'e koyma.
- App Review 4.2 için web kopyasından öte mobil değer ve arayüz sunan kapsamı belirle. Bu kapsam netleşmeden mağazaya gönderme.
- Giriş/çıkış, oturum yenileme, şifre sıfırlama, bağlantı açma, kamera/dosya seçimi, PDF, bildirim ve erişilebilirliği iPhone'da test et.
- App Store gizlilik beyanı, hesap silme erişimi, yaş sınıflandırması, ekran görüntüleri ve inceleme hesabı gereksinimlerini yayın öncesi doğrula.

## Kabul ölçütleri

- Web sürümü mevcut adresinde ve aynı hesaplarla çalışır.
- Android ve iOS'ta kurulumdan sonraki ilk açılışta **Kullanmaya Başla** görünür; düğme oturum durumuna göre doğru yere gider.
- Öğrenci konu çalışması veya soru çözümü eklediğinde kayıt web ve mobilde aynı hesapta görünür; yetkisiz kurum verisi görünmez.
- Veli, öğretmen, moderatör ve admin kendi web yetkilerinden fazlasını mobilde kazanmaz.
- Giriş, çıkış, şifre sıfırlama, bildirim tercihi, dosya/PDF ve çevrimdışı mesajları gerçek cihazlarda doğrulanır.
- Mağaza sürümleri için ayrı iç test ve mağaza onayı tamamlanmadan “App Store/Play Store'da yayında” denmez.

## Devam edecek çalışmaya not

Bu bir uygulama **planıdır**; bu dosya kapsamında mobil paket, kurulum düğmesi veya karşılama ekranı kodlanmadı. Önce A bölümünü iş kalemlerine ayırıp mevcut giriş/oturum akışını cihazlarda test edin. Sonra Android ve iOS mağaza sürümü için hesap ve yayın kararlarını netleştirin. Her adımda web sürümünü açık tutun.

## Güncel resmi kaynaklar

- [Chrome: Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity)
- [Apple: App Review Guidelines, 4.2 Minimum Functionality](https://developer.apple.com/app-store/review/guidelines/)
- [Apple: Safari web uygulamasını ana ekrana ekleme](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Capacitor: `server.url` üretim amacıyla kullanılmaz](https://capacitorjs.com/docs/config)
