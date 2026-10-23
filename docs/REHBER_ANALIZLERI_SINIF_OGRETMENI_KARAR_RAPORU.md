# Rehberlik servisinin analizleri — sınıf öğretmenleri hangilerini görsün?

**Durum:** Karar raporu (23.10.2026). Kod, veritabanı ya da canlı sistemde **hiçbir değişiklik yapılmadı**.
**Dayanak:** Kaynak kodu (`dashboard-navigation.ts`, `rehber-*.ts`, `REHBERLIK_SERVISI.md`) ve canlı veritabanından yalnız sayılar (toplu, isimsiz). Ekranda rehber/sınıf öğretmeni hesabıyla deneme **yapılmadı**.
**Amaç:** Hangi rehberlik analizinin sınıf öğretmenine açılacağına birlikte karar vermek. Aşağıdaki "Karar" sütunları boş bırakıldı.

---

## 1. Kısa öneri

| | Öneri |
| --- | --- |
| **Aç** | "Sınıfım" bayraklı öğrenci listesi (rehberin "Kapsamım" listesinin sınıf öğretmeni uyarlaması) |
| **Koşullu aç** | Takip Bildirimleri (iki kararla: durum paylaşımı ve bildirim yükü) |
| **Zaten açık** | Sınıf Analizi, Konu Durumu, öğrenci profili analizi |
| **Açma** | Görüşme kayıtları (gizli), Kurum Performansı, Program Desteği, Öğretmenler ve Programlar |

Gerekçe tek cümlede: sınıf öğretmeni zaten kendi sınıfının öğrencilerini ve analizlerini görüyor; rehberin araçlarından **o veriyi "kimi önce açayım" diye sıralayanlar** doğal uzantı, **rehberin mahremiyet gerektiren ya da kurum geneline bakan araçları** değil.

---

## 2. Rehberlik servisinin bugünkü analiz araçları

Rehber, `rehberlik_servisi` tablosunda üye olan öğretmendir; atandığı sınıf düzeylerinin (örn. 9-12) öğrencilerini görür (`REHBERLIK_SERVISI.md`).

| # | Araç (menü adı) | Ne gösterir | Veri kaynağı / kapsam | Bugün kim görür |
| --- | --- | --- | --- | --- |
| 1 | **Kapsamım** | Düzeylerindeki tüm öğrenciler tek tabloda: son hareket, son deneme neti, net yönü, açık görev, gerekçeli bayraklar | `rehber-kapsam-listesi.ts`, `rehber-bayrak.ts`; kapsam = rehberin `sinif_duzeyleri` | Yalnız servis üyesi rehber |
| 2 | **Takip Bildirimleri** | Ani net düşüşü/yükselişi, ders bazında düşüş, uzun sessizlik, biriken görev; "Görüldü / Ele alındı" | `rehber-takip.ts` (olay kuralları), `rehber-takip-verisi.ts`; günlük cron + sayfa açılışı; tablo yalnız servis anahtarıyla erişilir | Okul rehberi, dershane rehberi, grup koçu |
| 3 | **Kurum Performansı** | Kurum / düzey / sınıf bazlı haftalık net ve soru grafikleri (kapsam uyarılı) | `dershane-ana-sayfa.ts` | Müdür, rehber |
| 4 | **Sınıf Analizi** | Deneme sonuçları, çalışma kaydı girenler, görev tamamlama, kayıt girişi azalanlar, kullanıma başlamayanlar, hesabı olmayanlar | `sinif-analizi-verisi.ts` | Rehber, müdür, **sınıf öğretmeni (kendi sınıfı)**, ders verdiği sınıflar |
| 5 | **Görüşme kayıtları** (gizli) | Bireysel/veli görüşmesi, yönlendirme notları | `rehberlik_gorusmeleri` (0145); gizlilik **RLS'te** zorlanıyor | Yalnız servis üyesi, kendi kapsamında. Öğrenci, veli, branş öğretmeni ve **müdür dahi göremez** |
| 6 | **Program Desteği** | Rehber, öğrenciyle Oto Program sihirbazını birlikte geçer; rehber hazırladığı programın akıbetini görür | 0146 | Servis üyesi rehber |
| 7 | **Öğretmenler ve Programlar** | Ders programı ve nöbet; görüşme saatini kritik dersten kaçırmadan ayarlamak için | ders programı tabloları | Rehber (ve müdür) |
| 8 | **Öğrenci profili analizi** | Tek öğrencinin ayrıntılı analizi (net trendi, hız/doğruluk, konu hakimiyeti, "Öğretmen Görünümü" kartı) | `analiz.ts` | Rehber, müdür, sınıf öğretmeni (kendi sınıfı) |

## 3. Sınıf öğretmeni bugün ne görüyor?

Menü (`OGRETMEN_MENUSU`): Sınıflarım · **Sınıf Analizi** · Ödev Ver · Bekleyen Onaylar · **Konu Durumu** · Duyurular · Veli Talepleri · Pano · Okul İşlemleri. Sınıf öğretmeni (`teachers.class_id` dolu) Konu Durumu'nda kendi sınıfının **bütün derslerini** görür.

Canlı sayılar (23.10.2026): okul/lise kurumunda **10**, okul/ortaokul kurumunda **5**, dershanede **1** sınıf öğretmeni; **4** rehberlik servisi üyesi.

Önemli iki bulgu:
- **Veri zaten okunabilir durumda.** `0114` politikaları (`*_select_ayni_kurum`) öğretmene kurum içi öğrenci/deneme/çalışma verisini okutuyor; kısıtlama arayüzde ve sunucu işlemlerinde. Yani sınıf öğretmenine yeni bir araç açmak, **veritabanında yeni bir veri sızıntısı oluşturmuyor**; sorun yalnız doğru kapsamı (kendi sınıfı) kodda uygulamak.
- **Tutarsızlık:** Rehber tasarımında "tek risk puanı bilinçli olarak yok" kararı var (07.10.2026), ama öğrenci profilindeki "Öğretmen Görünümü" kartı **tüm öğretmenlere ve müdüre** Düşük/Orta/Yüksek "erken uyarı riski" gösteriyor. Sınıf öğretmeni bunu bugün zaten görüyor. Bu kararla çelişiyor mu, ayrı konuşulmalı (Soru 4).

---

## 4. Araç araç karar tablosu

### A. "Sınıfım" bayraklı liste (Kapsamım'ın sınıf uyarlaması) — **ÖNERİ: AÇ**

- **Ne olur:** Sınıf öğretmeni, kendi sınıfının öğrencilerini tek tabloda görür: son hareket, son deneme neti, yön, açık görev ve gerekçeli bayraklar (hesap açılmamış, hiç veri yok, 14 gün sessiz, net düşüşü, görev birikmiş).
- **Neden uygun:** Sınıf Analizi zaten aktiflik, görev ve sessizlik listelerini veriyor; bayraklar aynı veriyi **gerekçeli ve sıralı** sunar (puan yok, gerekçe var). Mahremiyet yeni bir boyut taşımıyor.
- **Kapsam kuralı:** Yalnız `teachers.class_id` sınıfı. Branş öğretmeni kapsam dışı (ders verdiği sınıflar için ayrıca karar gerekir — Soru 1).
- **Risk:** Düşük. Eşikler (14 gün, 5 net, %70 görev) rehber için 190 öğrenciye göre seçildi; 25-30 kişilik sınıfta bayrak sayısı farklı davranabilir, ilk haftalarda gözlenmeli.
- **İş büyüklüğü:** Küçük-orta. `rehberKapsamListesiGetir` şu an `seviyeler` alıyor; bir `sinifId` kolu eklenir, menüye "Sınıfım" kalemi, `page.tsx`'te yetki dalı. Migration gerekmez.
- **Karar:** ☐ Aç ☐ Açma ☐ Sonra

### B. Takip Bildirimleri — **ÖNERİ: KOŞULLU AÇ**

- **Ne olur:** Sınıf öğretmeni, kendi sınıfındaki öğrenciler için 5 tür olay görür; "Görüldü/Ele alındı" ile kapatır.
- **Neden koşullu:**
  1. **Durum ve not paylaşımı.** Bildirim kaydı **öğrenci + olay** başına tek (`unique (student_id, anahtar)`, migration 0171: "kurumun rehberleri ortak görür, biri kapatınca herkes için kapanır"). Rehber ile sınıf öğretmeni aynı öğrenciyi görürse biri "ele alındı" dediğinde ötekinde de kapanır. **Ayrıca kayıtta rehberin yazdığı `not_metni` (en çok 1000 karakter) de var; ortak kullanılırsa rehberin notu sınıf öğretmenine açılır** — bu, görüşme kayıtlarının gizliliğiyle aynı kaygıyı taşır. İki seçenek: ortak kayıt (basit, ama not sızar ve rehber görmeden kapanabilir) ya da sınıf öğretmeni için ayrı durum/not alanı (yeni tablo/kolon, migration, kullanıcı onayı gerekir).
  2. **Yük.** Canlıda şu an 119 bildirim var ve **hepsi "yeni"**; hiçbiri işlenmemiş (40 net düşüşü, 29 net yükselişi, 26 ders düşüşü, 23 sessizlik, 1 görev). Rehberler bu listeyi kullanıyor mu belirsiz. Önce rehberde kullanım görülmeden 15 sınıf öğretmenine yaymak sinyali gürültüye çevirebilir.
  3. **"Ani net yükselişi"** öğretmene bildirim olarak gerçekten gerekli mi (Soru 3).
- **Kapsam kuralı:** `takipKapsamiGetir`'e "sınıf öğretmeni" kolu (okul + kendi sınıfı); tarama (`takipBildirimleriniUret`) sınıf filtresiyle çalışır.
- **İş büyüklüğü:** Orta. Ortak durum seçilirse migration yok; kişiye ayrı durum seçilirse yeni tablo/kolon (0176+, kullanıcı onayı gerekir).
- **Karar:** ☐ Aç (ortak durum) ☐ Aç (kişiye ayrı durum) ☐ Önce rehberde kullanıma bak ☐ Açma

### C. Sınıf Analizi, Konu Durumu, öğrenci profili analizi — **ZATEN AÇIK**

Sınıf öğretmeni bunları kendi sınıfı için görüyor. Değişiklik gerekmez. (Bu oturumda Sınıf Analizi'ndeki kart adları ölçüm diline çevrildi ve deneme türü seçici eklendi.)

### D. Kurum Performansı — **ÖNERİ: AÇMA**

Kurum/düzey bazlı karşılaştırma müdür ve rehber içindir; 25-30 kişilik tek sınıfta haftalık net ortalaması çoğu zaman kapsam eşiğinin (%30) altında kalıp "ölçülmemiş" gösterir. Sınıf öğretmeni için sınıfın haftalık eğilimi isteniyorsa Sınıf Analizi'ne eklenecek ayrı bir iş olarak ele alınmalı.
- **Karar:** ☐ Açma ☐ Sınıf eğilim grafiği ayrı iş olsun

### E. Görüşme kayıtları (gizli) — **ÖNERİ: KESİNLİKLE AÇMA**

Gizlilik kararı RLS'te (0145) bilinçli olarak dar: öğrenci, veli, branş öğretmeni ve müdür dahi göremez; "geniş başlayıp sızdırmak geri alınamaz" gerekçesi dosyada yazılı. Sınıf öğretmenine açmak bu kararı tersine çevirir.
Yararlı alternatif (yeni özellik, karar gerekir): rehberin **kendi isteğiyle** sınıf öğretmenine kısa bir "öneri / dikkat edilecek nokta" notu iletmesi; görüşme içeriği paylaşılmaz.
- **Karar:** ☐ Açma ☐ Rehberden öğretmene not iletme özelliği tasarlansın

### F. Program Desteği — **ÖNERİ: ŞİMDİLİK AÇMA**

Rehberin yetkisi 0146 ile RLS'te tanımlı (rehberin öğrenciyle yazması). Sınıf öğretmeni zaten ödev verebiliyor; Oto Program ise öğrencinin kendi planı. Rehberin "kısıtlama yerine geri bildirim" dengesi (programın akıbeti) sınıf öğretmeni için ayrıca tasarlanmadı. Açılacaksa yeni RLS migration'ı gerekir.
- **Karar:** ☐ Açma ☐ Sonra değerlendir

### G. Öğretmenler ve Programlar — **ÖNERİ: AÇMA**

Rehberin görüşme saati ayarlama ihtiyacı için. Sınıf öğretmeni için gerekçe yok.

---

## 5. Açık sorular

1. **Branş öğretmeni** (sınıfı olmayan, ders veren): A'daki "Sınıfım" listesi yalnız sınıf öğretmenine mi, yoksa ders verdiği sınıflara da mı? (Sınıf Analizi'nde ders verdiği sınıflar zaten görünüyor.)
2. **İlkokul sınıf öğretmeni** (1-4): ortaokul kurumunda ayrı "Sınıfım" panosu ve Gelişim Raporu var; analiz bayrakları ona anlamsız (öğrenciler sisteme girmiyor). A'dan hariç tutulsun mu?
3. **Bildirim türleri:** Sınıf öğretmenine hangileri gitsin? (Öneri: net düşüşü, ders düşüşü, sessizlik; "net yükselişi" ve "biriken görev" rehbere kalsın.)
4. **Risk düzeyi kartı:** Öğrenci profilindeki Düşük/Orta/Yüksek "erken uyarı riski", rehber tasarımındaki "puan yok, gerekçe var" ilkesiyle uyumlu mu? Sınıf öğretmeni ve müdür bunu bugün görüyor.
5. **Dil ve ton:** Öğretmene gösterilen bayraklarda kırmızı/damgalayıcı dil yok; sınıf öğretmeninin sınıf içinde öğrenciye "bayrak" yansıtma riski için kısa bir kullanım notu gerekli mi?

## 6. Uygulama planı (kararlara göre)

| Adım | İçerik | Gerekenler |
| --- | --- | --- |
| 1 | A: "Sınıfım" listesi | Karar A ve Soru 1-2; migration yok; test: yalnız kendi sınıfı, başka sınıf/branş öğretmeni göremez |
| 2 | B: Takip Bildirimleri sınıf kolu | Karar B ve Soru 3; durum paylaşımı seçimine göre migration; test: kapsam, durum kapatma, tekrar üretim |
| 3 | Kullanım ölçümü | 2 hafta sonra: kaç öğretmen açtı, kaç bildirim işlendi (bu raporun "119 hepsi yeni" bulgusu karşılaştırma tabanı) |

**Kapsam güvenliği ilkesi (tüm adımlar için):** Rehber ve takip ekranları servis anahtarıyla çalıştığı için yetki **sunucuda**, okuma öncesi doğrulanır; kapsam `teachers.class_id`'den alınır, istemciden gelen sınıf kimliğine güvenilmez. Her adımda başka sınıfın öğrencisi/başka okul için reddedildiği testle kanıtlanır.

## 7. Doğrulanamayanlar

- Sınıf öğretmeni hesabıyla ekranda menü ve kapsam kontrolü yapılmadı.
- Rehberlerin Takip Bildirimleri'ni gerçekten açıp açmadığı bilinmiyor (yalnız 0 işlenmiş kayıt görülüyor).
- Eşiklerin (14 gün / 5 net / %70 görev) 25-30 kişilik sınıfta bayrak üretim sayısı ölçülmedi.
