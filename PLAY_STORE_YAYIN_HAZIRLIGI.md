# SeFu Koç Google Play yayın hazırlığı

**Durum (4 Ekim 2026):** Kişisel geliştirici hesabı açıldı. Play Console'da uygulama henüz oluşturulmadı. Bu belge mağaza formunu doldururken ve Android paketini üretirken kullanılacak; yayınlanmış uygulama anlamına gelmez.

## İlk Play Console kaydı

1. **Tüm uygulamalar > Uygulama oluştur**: ad `SeFu Koç`, tür `Uygulama`, fiyat `Ücretsiz`, dil `Türkçe`.
2. Ekrandaki geliştirici beyanlarını yalnızca gerçek kullanım ve hesap durumuna uygun biçimde tamamla.
3. Uygulama oluşturulunca panelin istediği içerik, politika ve test görevlerini kaydet. Kişisel yeni hesaplarda üretim yayını için en az 12 test kullanıcısının 14 gün kesintisiz katıldığı kapalı test ve ardından üretim erişimi başvurusu gerekir.

## Mağaza metni taslağı

**Ad:** SeFu Koç

**Kısa açıklama:** Öğrenci çalışma planı, deneme takibi ve kurum koçluğu bir arada.

**Tam açıklama:**

SeFu Koç, öğrencilerin çalışma sürecini ve kurumlarının rehberlik çalışmalarını aynı ortamda buluşturur. Öğrenciler çalışma programlarını, konu çalışmalarını ve deneme sonuçlarını takip edebilir. Öğretmenler, veliler ve kurum yetkilileri kendi hesaplarına tanımlanan bilgilere erişir.

Mevcut SeFu Koç hesabınızla giriş yapın ve web sürümündeki verilerinize ulaşın. Kuruma bağlı öğrenci hesabı için kurumunuzun yönlendirmesini izleyin.

Bu metin, yükleme öncesinde gerçek cihaz testi ve Play Console içerik beyanlarıyla karşılaştırılmalıdır. Doğrulanmamış bildirim veya çevrimdışı çalışma vaadi eklenmemelidir.

## Android paket kararı

- Önerilen paket kimliği: `com.sefukoc.app`. **İlk yüklemeden önce marka/alan adı sahibi ve Play Console kaydıyla kesinleştir.** Sonradan değiştirmek yeni uygulama gerektirir.
- Kaynak: `https://www.sefukoc.com/manifest.json`; başlangıç: `/uygulama-basla`.
- Paket yöntemi: Bubblewrap ile Trusted Web Activity; imzalı Android App Bundle (`.aab`) üret.
- Anahtar/parola, APK ve AAB Git'e eklenmez. Üretim imzalama anahtarı kaybolmayacak güvenli bir yerde saklanır.
- Play App Signing sertifikasının SHA-256 izi alındıktan sonra `/.well-known/assetlinks.json` oluşturulur. Bu dosya olmadan tam ekran güvenilir web etkinliği doğrulanmaz.

## Yükleme öncesi açık işler

- Android paketleme ortamı: JDK, Android SDK ve Bubblewrap. Bu bilgisayarda 4 Ekim kontrolünde kurulu değillerdi.
- Play Console uygulama kaydı, paket kimliği ve imzalama anahtarı.
- Gizlilik politikası ve hesap/veri silme için kamuya açık, doğru bağlantılar. Depoda şu anda bunlara ayrılmış açık sayfa saptanmadı; kurumun gerçek veri işleme süreci doğrulanmadan metin uydurulmasın.
- Veri güvenliği, hedef kitle, reklam ve içerik derecelendirme beyanları; uygulamanın gerçek davranışına göre doldurulmalı.
- Play Console ölçülerine uygun simge, özellik görseli ve gerçek Android ekran görüntüleri.
- Mi Pad 7'de giriş, oturum, çalışma verisi, dosya/PDF, geri düğmesi ve bağlantı davranışı; ardından iç ve kapalı test.

Kaynaklar: [Chrome TWA hızlı başlangıç](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start), [Play Console uygulama oluşturma](https://support.google.com/googleplay/android-developer/answer/9859152), [kişisel hesap test koşulları](https://support.google.com/googleplay/android-developer/answer/14151465).
