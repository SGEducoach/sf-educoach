# KVKK Metin Taslağı: Mezun Hesabı, Veli Davet Bağlantısı ve Moderatör Erişimi

**Durum:** TASLAK. Kurum onayı ve hukuki inceleme bekliyor. Onaylanmadan siteye konmaz.
**Hazırlayan:** Claude Code (SeFu Koç Müstakil PC), 13 Kasım 2026
**Kapsam:** 13.11.2026'da canlıya alınan üç özelliğin aydınlatma metinlerine eklenmesi:
1. Mezun hesabı (migration 0188)
2. Öğrencinin velisini davet bağlantısıyla eklemesi (migration 0187)
3. Kurum moderatörünün öğrenci ve veli iletişim bilgisine erişimi

---

## 0. Karar Verilmesi Gereken Noktalar

Metni yayına almadan önce kurumun ya da hukuk danışmanının yanıtlaması gerekenler:

1. **Veri sorumlusu kim?** Mevcut metinler "SeFu Koç olarak … bilgilendirmek isteriz" diye başlıyor; yani platform kendini veri sorumlusu gibi tanıtıyor. Okul kullanımında öğrenci verisinin veri sorumlusu genellikle **okul**, SeFu Koç ise okul adına veriyi işleyen **veri işleyen** konumundadır. Bu ayrım netleşmeli ve metinlerin giriş cümlesi buna göre düzeltilmeli. Aşağıdaki taslakta `[VERİ SORUMLUSU]` yer tutucusu kullanıldı.
2. **Mezun verisinin saklama süresi:** Mezun Takip kaydı ve mezun hesabı ne kadar saklanacak? Taslakta `[X] yıl` yer tutucusu var. Mezun silme talebinde kayıt hemen silinmeli.
3. **Hukuki sebep:** Mevcut veli metni "açık rıza" diliyle yazılmış, öğrenci metni ise madde 5/2-c ve 5/2-f'ye dayanıyor. Aynı veri için iki farklı dayanak tutarsız; birinde karar kılınmalı. Mezunlara iletişim (duyuru/SMS) için açık rıza gerekip gerekmediği ayrıca değerlendirilmeli; taslakta açık rıza kutusu öneri olarak yer alıyor.
4. **Okul PDF'iyle eklenen hesapsız mezunlar:** Rehberlik servisi eski mezunları PDF ile ekleyebiliyor. Bu kişiler siteye hiç girmediği için metni görmüyor. Aydınlatma yükümlülüğünü okulun kendi kanallarıyla (ör. ilk SMS'te kısa bilgilendirme + bağlantı) yerine getirmesi gerekir.

---

## 1. Öğrenci Aydınlatma Metnine Eklenecek Bölümler

Mevcut öğrenci metninin (`OGRENCI_KVKK_METNI`, sürüm `v1-2026-08-26`) "Veri aktarımı" paragrafından sonra eklenir. Metin değişince sürüm yükseltilmeli (öneri: `v2-2026-11`).

> **Kurum yetkililerinin erişimi:** Okulunuzun/dershanenizin yetkilendirdiği kurum moderatörü, hesap işlemleri (giriş sorunları, sınıf değişikliği, hesap açma-kapama) için adınızı, okul numaranızı, sınıfınızı, e-posta adresinizi, hesap durumunuzu ve bağlı velinizin adını görebilir. Telefon numaraları bu ekranda gizlenmiş olarak gösterilir; tam numara yalnız gerektiğinde açılır ve her açılış kayıt altına alınır. Moderatör akademik ve rehberlik verilerinizi bu ekranda görmez.
>
> **Velinizi davet etmeniz:** Panelinizdeki "Velimi Davet Et" bölümünden velinize tek kullanımlık, 7 gün geçerli bir bağlantı gönderebilirsiniz. Veliniz bu bağlantıyla hesap açtığında hesabınıza bağlanır ve akademik verilerinizi (deneme sonuçları, çalışma kayıtları, ödevler, raporlar) görebilir. Bağlantıyı yalnız kendi velinizle paylaşın; başkasının eline geçtiğini düşünüyorsanız aynı bölümden iptal edin.
>
> **Mezun olduğunuzda:** 12. sınıfı bitirdiğinizde okulunuz hesabınızı "mezun hesabı"na çevirebilir. Hesabınız silinmez: aynı okul numarası ve şifreyle giriş yapmaya, eski deneme sonuçlarınızı görmeye devam edersiniz. Adınız, okul numaranız, mezuniyet yılınız ve (varsa) e-posta ve telefonunuz okulunuzun mezun kayıtlarına aktarılır. Mezun hesabının nasıl işlediği "Mezun Aydınlatma Metni"nde açıklanır.

---

## 2. Veli Aydınlatma Metni (Yeni Sürüm Önerisi)

Mevcut veli metni (`VELI_KVKK_METNI`, sürüm `v1-2026-08-05`) yalnız öğrencinin verisini anlatıyor. Davet bağlantısıyla açılan hesapta velinin kendi adı ve telefonu da işleniyor. Önerilen yeni metin (sürüm önerisi: `v2-2026-11`):

> [VERİ SORUMLUSU] olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, sizin ve velisi/vasisi olduğunuz öğrencinin kişisel verilerinin işlenmesi hakkında sizi bilgilendirmek isteriz.
>
> **Sizinle ilgili işlenen veriler:** adınız-soyadınız, cep telefonu numaranız, hesabınızın güvenliği için gereken oturum bilgileri ve hangi öğrenciye bağlı olduğunuz.
>
> **Öğrenciyle ilgili işlenen veriler:** öğrencinin adı-soyadı, okul/sınıf bilgisi, iletişim bilgileri ve akademik performans verileri (deneme sonuçları, çalışma kayıtları, soru çözüm istatistikleri, ödevler, motivasyon durumu).
>
> **Hesabınız nasıl açılır:** Hesabınız ya öğrencinin size gönderdiği tek kullanımlık davet bağlantısıyla ya da sınıf öğretmeninin onayladığı kod talebiyle açılır. Davet bağlantısında öğrencinin yalnız ilk adı ve soyadının baş harfi gösterilir.
>
> **İşleme amacı:** öğrencinin akademik gelişimini size raporlamak; okul duyurularını, ödev ve deneme bilgilendirmelerini size iletmek; hesabınızın güvenliğini sağlamak.
>
> **Hukuki sebep:** [KARAR: KVKK madde 5/2-c ve 5/2-f / açık rıza — bkz. Bölüm 0, madde 3].
>
> **Kimler görür:** Adınız ve telefonunuz; öğrencinin okul/dershane yönetimi, sınıf öğretmeni, rehberlik servisi ve kurumun yetkilendirdiği moderatör tarafından iletişim amacıyla görülebilir. Moderatör ekranında telefon numaranız gizlenmiş gösterilir; tam numara yalnız gerektiğinde açılır ve her açılış kayıt altına alınır. Veriler, Platform'un altyapı sağlayıcıları (barındırma, veritabanı, e-posta ve SMS hizmetleri) dışında üçüncü kişilerle paylaşılmaz, satılmaz ve reklam için kullanılmaz.
>
> **Saklama süresi:** Hesabınız aktif olduğu sürece saklanır. Hesabın kapatılmasını istediğinizde ya da öğrencinin okulla ilişiği kesildiğinde makul süre içinde silinir.
>
> **Haklarınız:** KVKK madde 11 kapsamında verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme, işlenme amacını öğrenme gibi haklara sahipsiniz. Talepleriniz için [İLETİŞİM ADRESİ] adresine yazabilirsiniz.
>
> **Onay:** Yukarıdaki bilgilendirmeyi okudum.
> [KARAR: açık rıza seçilirse eklenecek cümle → "Velisi/vasisi olduğum öğrencinin ve kendi kişisel verilerimin belirtilen kapsamda işlenmesine açık rızamla onay veriyorum."]

---

## 3. Mezun Aydınlatma Metni (Yeni)

Mezun hesabının panelinde (Mezun Profilim) gösterilir. Mezunun ilk girişinde bir kez onaylatılması önerilir (sürüm önerisi: `v1-2026-11`).

> [VERİ SORUMLUSU] olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, mezun olarak kişisel verilerinizin işlenmesi hakkında sizi bilgilendirmek isteriz.
>
> **İşlenen veriler:** adınız-soyadınız, okul numaranız, mezuniyet yılınız; kendi girdiğiniz ya da okulunuzun kayıtlarında bulunan e-posta adresiniz, cep telefonunuz, il/ilçeniz, üniversite/bölüm ve meslek bilginiz; öğrenciyken oluşan deneme sonuçlarınız.
>
> **İşleme amacı:** okulunuzun mezunlarıyla iletişimini sürdürmesi (mezun buluşmaları, duyurular, öğrencilere rehberlik için mezun deneyimlerinden yararlanma); size eski deneme sonuçlarınıza erişim imkânı sunulması.
>
> **Kimler görür:** Mezun bilgilerinizi yalnız okulunuzun rehberlik servisi ve müdürü görür. Kurum moderatörü hesap işlemleri için adınızı, okul numaranızı ve gizlenmiş telefonunuzu görebilir. Öğretmenler ve öğrenciler mezun bilgilerinizi görmez. Veriler, Platform'un altyapı sağlayıcıları (barındırma, veritabanı, e-posta ve SMS hizmetleri) dışında üçüncü kişilerle paylaşılmaz.
>
> **İletişim (SMS/duyuru):** Okulunuz size kayıtlı telefonunuzdan SMS ile ulaşabilir. Telefonunuzu Mezun Profilim'den silerek ya da okulunuza bildirerek bu iletişimi istediğiniz zaman durdurabilirsiniz.
>
> **Saklama süresi:** Mezun hesabınız ve mezun kaydınız mezuniyetinizden itibaren [X] yıl ya da siz silinmesini isteyene kadar saklanır. Silme talebinizde hesabınız ve mezun kaydınız makul süre içinde silinir.
>
> **Haklarınız:** KVKK madde 11 kapsamında verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme, işlenme amacını öğrenme gibi haklara sahipsiniz. İletişim, il/ilçe, üniversite ve meslek bilginizi Mezun Profilim'den kendiniz güncelleyebilirsiniz. Diğer talepleriniz için [İLETİŞİM ADRESİ] adresine yazabilirsiniz.
>
> **Onay:** Yukarıdaki bilgilendirmeyi okudum.
> [Öneri: "Okulumun bana mezun duyurularıyla ilgili SMS ve e-posta göndermesine onay veriyorum." (isteğe bağlı, işaretlenmeden de hesap kullanılabilir)]

---

## 4. Gizlilik Sayfasına (`/gizlilik`) Eklenecek Bölümler

"Kimlerle paylaşıyoruz" bölümünden sonra eklenir. Son güncelleme tarihi yenilenmeli.

**Kurum yetkilileri (moderatör)**
> Kurumun yetkilendirdiği moderatör, hesap işlemleri için öğrencinin adını, okul numarasını, sınıfını, e-posta adresini, hesap durumunu ve bağlı velilerin adını görebilir. Telefon numaraları gizlenmiş gösterilir; tam numara yalnız gerektiğinde açılır ve her açılış kayıt altına alınır. Moderatör, akademik ve rehberlik verilerini bu ekranda görmez.

**Veli davet bağlantısı**
> Öğrenci, velisine tek kullanımlık ve 7 gün geçerli bir davet bağlantısı gönderebilir. Bağlantı tahmin edilemeyecek şekilde üretilir ve sistemde yalnız şifrelenmiş özeti saklanır. Bağlantıyla hesap açan velinin adı ve telefonu işlenir, veli öğrenciye bağlanır. Davet sayfasında öğrencinin yalnız ilk adı ve soyadının baş harfi gösterilir.

**Mezunlar**
> 12. sınıfı bitiren öğrencinin hesabı okul tarafından mezun hesabına çevrilebilir; hesap silinmez. Mezun, kendi iletişim, il/ilçe, üniversite ve meslek bilgisini güncelleyebilir ve eski deneme sonuçlarını görebilir. Mezun bilgilerini yalnız okulun rehberlik servisi ve müdürü görür. Mezun kayıtları mezuniyetten itibaren [X] yıl ya da kişi silinmesini isteyene kadar saklanır.

**Saklama süresi (mevcut paragrafa ek cümle)**
> Mezun hesapları ve mezun kayıtları için ayrı saklama süresi uygulanır (bkz. "Mezunlar").

---

## 5. Onaydan Sonra Yapılacak Teknik İşler

Kurum onayladığında Claude Code tarafından uygulanır:

- [ ] `src/app/signup/SignupForm.tsx` → `OGRENCI_KVKK_METNI` ve sürümü güncellenir.
- [ ] `src/lib/veli-kvkk.ts` → `VELI_KVKK_METNI` güncellenir; `src/app/api/veli/davet/route.ts` ve `src/app/api/veli/tamamla/route.ts` içindeki `KVKK_ONAY_VERSIYON` yükseltilir.
- [ ] Mezun metni için `src/lib/mezun-kvkk.ts` eklenir; `MezunPaneli`nde gösterilir; ilk girişte onay istenecekse `profiles.kvkk_onay_*` alanlarına yazılır.
- [ ] `src/app/gizlilik/page.tsx` → yeni bölümler ve son güncelleme tarihi.
- [ ] Mevcut kullanıcılardan yeni sürüm için yeniden onay istenip istenmeyeceğine karar verilir; istenecekse girişte gösterilen bir onay kapısı eklenir.
