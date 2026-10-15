# SeFu Koç iyileştirme raporu

Tarih: 12 Ekim 2026

## Yönetici özeti

SeFu Koç'un güçlü yanı deneme, konu çalışması, soru çözümü, görev, öğretmen ve veli takibini aynı sistemde toplaması. Ancak ziyaretçi ilk ekranda ürünün kendisine ne sağlayacağını ve nasıl başlayacağını yeterince açık görmüyor. Kayıtlı kullanıcı tarafında ise deneme verisi geniş bir öğrenci kitlesine ulaşırken günlük çalışma ve görev tamamlama çok daha sınırlı. Bu nedenle yalnızca görsel yenileme değil, **başvuru akışı + denemeden çalışmaya geçiş + ölçüm** birlikte ele alınmalı.

İlk karar: Ana sayfanın ilk ekranına kurum için açık bir başvuru yolu koyun; deneme sonucunu öğrencinin o hafta yapacağı tek somut çalışmaya bağlayan pilotu başlatın.

## Kanıt ve sınırlar

| Gözlem | Dayanak | Sınır |
| --- | --- | --- |
| İlk ekranı üç parçalı görsel galeri kaplıyor. Görünür ana düğme “Giriş Yap”; kurum başvurusu ilk ekranda yok. | 12.10.2026 canlı ana sayfa incelemesi; `src/components/AnaSayfa.tsx`, `AnaSayfaSlider.tsx`, `SiteUstNavigasyon.tsx` | Dönüşüm etkisi henüz ölçülmedi. |
| Kurum başvurusu iletişim sayfasında `mailto:` bağlantısına dayanıyor. | `src/app/iletisim/page.tsx` | E-posta uygulamasına geçişteki kayıp ölçülemiyor. |
| 12.09–10.10 döneminde 352 deneme kaydı 225 öğrenciye; 354 konu çalışması 67 öğrenciye; 660 soru çözümü 52 öğrenciye ait. | `work/konu-tarama/kullanim-raporu.md` | Denemelerin çoğu kurumca işlendi; 225 sayısı aktif öğrenci değildir. |
| Son tarihi geçmiş 905 görev atamasından 65'i kayıtlı olarak tamamlandı (%7,2). | Aynı kullanım raporu | Bu, öğrencilerin çalışmadığını kanıtlamaz; görünürlük ve tamamlama akışı incelenmeli. |
| Ortaokul çalışması ve yazılı analizi için dönemde kayıt yok. | Aynı kullanım raporu | Önce pilot kullanım gerekir; başarısızlık sonucu çıkarılamaz. |
| GA4 yalnız açık sayfalarda; yönetici ekranı ziyaret, oturum, kaynak ve sayfa sayısı sunuyor. | `src/components/GoogleAnalytics.tsx`, `src/app/yonetici/google-analytics/page.tsx` | Giriş sonrası öğrenci verisini GA4'e göndermemek doğru; birinci taraf toplu olay ölçümü gerekli. |

Canlı site: [sefukoc.com](https://www.sefukoc.com/) ve [ürün tanıtımı](https://www.sefukoc.com/ogrenci-takip-ve-kocluk). Yönetici GA4 verisi, kullanıcı görüşmeleri ve giriş sonrası canlı ekranlar bu incelemeye dâhil değildi. Bu rapor gerçek dönüşüm oranı veya akademik etki ölçümü değildir.

## Öncelikli işler

| Öncelik | İş | Neden | Ölçüm | Büyüklük |
| --- | --- | --- | --- | --- |
| P0 | İlk ekranda tek cümlelik yarar, gerçek ürün örneği, “Kurum için görüşme iste” ve ikincil “Mevcut hesabımla giriş” gösterin. Galeriyi aşağı alın veya tek görsele indirin. | Yeni ziyaretçi ne olduğunu ve nasıl başlayacağını kaydırmadan anlamalı. | İlk ekran CTA tıklaması; ziyaret → nitelikli başvuru | Orta |
| P0 | `mailto:` yerine kısa kurum formu: kurum/tür, yetkili iletişimi, yaklaşık öğrenci sayısı, gizlilik metni, başarılı gönderim ekranı. | Başvuru e-posta uygulamasına bağımlı kalmamalı. | Form başlangıcı → gönderim; yanıt süresi | Orta |
| P0 | Deneme sonucundan “Bu hafta ne yapacağım?” kartı çıkarın: bir öncelikli konu, makul soru hedefi, son tarih, tek başlatma düğmesi. Öğretmen öneriyi düzeltebilsin. | Kurumun işlediği veri öğrencinin eylemine dönüşmeli. | Denemeyi görme → öneriyi açma → ilk çalışma | Orta-büyük |
| P0 | Görev hunisini denetleyin: görünme, bildirim, açılma, başlatma, tamamlama, öğretmen onayı. | %7,2 kayıtlı tamamlanmanın kök nedeni bilinmiyor. | Aşama bazında kopuş | Önce küçük-orta tanı |
| P1 | Uzun ana sayfa metnini “Kurum ne kazanır?”, “Öğrencinin haftası nasıl işler?”, “Nasıl başlarız?” olarak kısaltın; kişisel verisi temizlenmiş ekran örneği gösterin. | Soyut vaat yerine somut kullanım görünmeli. | CTA ve kısa kullanıcı testinde anlaşılabilirlik | Küçük-orta |
| P1 | Okul, dershane ve ortaokul için ayrı kısa senaryolar sunun. | YKS merkezli tek anlatım ortaokulu dışarıda bırakır. | Kitle bazlı başvuru kalitesi ve aktivasyon | Orta |
| P1 | Açık sitede GA4 dönüşüm olayları, uygulama içinde kişisel veri içermeyen birinci taraf toplu kullanım olayları tanımlayın. | İçerik kaydı ile gerçek davranış ayrılmalı. | Eksiksiz edinim/aktivasyon hunisi | Orta |
| P2 | Mobil okunabilirlik, odak sırası ve 34 px galeri kontrolleri için cihaz/erişilebilirlik testi yapın; dokunma alanını büyütün. | Mobil sürtünme olasılığı var. | Mobil görev başarısı | Küçük-orta |

## Eğitim koçluğu ilkesi

Her veri kaydı öğrenciye **yorum + yapılabilir sonraki adım + geri bildirim** üretmeli. “Boş soru = süre yetmedi” gibi tek nedene dayalı sonuç yerine “Boş bırakma görüldü; süre, konu bilgisi veya strateji nedeni olabilir” gibi ihtiyatlı açıklama kullanın. Öğretmen düzeltmesi görünür olmalı. Amaç daha çok veri girişi istemek değil, girilen verinin planı iyileştirdiğini göstermektir.

Konu hâkimiyeti anlatımında öğrenci beyanı ile hesaplanan ek skoru ayırın. Mevcut ekranda “hâkim olunan konu” yüzdesi öğrenci beyanına dayanırken bileşik skor ek bilgi olarak sunuluyor (`src/lib/konu-hakimiyeti.ts`, `KonuHakimiyetiEkrani.tsx`). Tanıtım metni hangi sayının ne anlama geldiğini açık söylemeli.

## İlk ekran için metin taslağı

> **Deneme sonucunu haftalık çalışma planına dönüştürün.**  
> SeFu Koç; okul ve dershanelerin deneme, konu ve görev verisini tek yerde toplar. Öğrenci ne çalışacağını görür, öğretmen ilerlemeyi izler, veli gelişimi takip eder.  
> **Kurum için görüşme iste** · Mevcut hesabımla giriş

Bu taslak kısa kullanıcı testinden sonra kesinleştirilmeli. Gerçek ekran örneği kişisel bilgiler temizlenerek hazırlanmalı; doğrulanmamış başarı yüzdesi kullanılmamalı.

## 30/60/90 günlük yol haritası

| Dönem | Çıktı | Karar sorusu |
| --- | --- | --- |
| 0–30 gün | Ölçüm tanımları; 5 kurum yetkilisi ve 5 öğrenciyle görev testi; yeni ilk ekran ve başvuru formu; görev hunisi denetimi | Başvuru ve görev kaybının en büyük noktası bulundu mu? |
| 31–60 gün | Denemeden tek haftalık öneriye pilot; Fen Lisesi ve Kariyerim'de öğrenci/öğretmen akış testi; ortaokulda bir sınıf pilotu | Öneri görülüyor, uygulanıyor ve öğretmen tarafından anlamlı bulunuyor mu? |
| 61–90 gün | İşe yarayan akışı yaygınlaştırma; gereksiz veri girişini azaltma; kitleye özel anlatımı pilot sonuçlarına göre güncelleme | 7 günlük aktif çalışma ve görev tamamlama başlangıca göre iyileşti mi? |

## Ölçüm tanımları

**Edinim:** Açık site ziyaretçisi → kurum CTA tıklaması → form başlangıcı → gönderim → nitelikli görüşme → kurum açılışı. Trafik kaynağı ve cihaz kırılımı izlenmeli. Formdaki kişisel veriler GA4 olayına yazılmamalı.

**Aktivasyon:** Kurumca hesabı açılan öğrenci → ilk giriş → ilk denemeyi görüntüleme → ilk öneriyi açma → ilk konu/soru çalışması. 7 ve 28 günlük gruplar izlenmeli; kurum/sınıf büyüklüğüne göre normalize edilmeli. Öğrenci adı, okul numarası ve sınav ayrıntısı üçüncü taraf analitiğe gönderilmemeli.

**Süreklilik:** Haftalık aktif öğrenci, deneme sonrası 7 gün içinde çalışma başlatma, görev görüntüleme/başlatma/tamamlama, öğretmen geri bildirimi. Sayısal hedefler güvenilir başlangıç ölçümünden sonra konmalı; bugünkü içerik kayıtları aktif kullanıcı sayısı yerine geçmez.

## Son karar

İlk yatırım daha fazla özellik değil, **anlaşılır vaat → kolay başvuru → denemeden eyleme geçen koçluk döngüsü → güvenilir ölçüm** zinciri olmalı. Görsel yenileme bu zincirin ilk halkasıdır; düzenli kullanımı tek başına çözmez.
