# SMS Modülü (28.10.2026)

Kurumlar **kendi SMS paketlerini** SeFu Koç'a bağlar; SeFu paket satmaz. Mesajlar kurumun sağlayıcı hesabından düşer.

## Kim ne yapar

| Kim | Yetki |
| --- | --- |
| Admin | **Kurum Yetkileri → SMS modülü** anahtarıyla kurumda modülü açar/kapatır. **Varsayılan kapalıdır** (diğer modüllerin aksine eksik anahtar = kapalı). Hazır paket uygulamak kurumun SMS durumunu sıfırlamaz. |
| Kurum yöneticisi (moderatör) | Moderatör paneli → **İletişim → SMS ayarları**: sağlayıcıyı listeden seçer, hesap bilgilerini girer. Müdür de aynı ekrana SMS sayfasındaki **Bağlantı Ayarları** sekmesinden girer. Admin de bir kurumun moderatör panelini görüntüleyerek yapabilir. |
| Müdür | SMS gönderir; kurumun tamamı; tüm geçmişi görür. |
| Müdür yardımcısı | SMS gönderir; yalnız sorumlu olduğu sınıf düzeyleri (İdare panelinde menüde). |
| Rehber öğretmen | SMS gönderir; okul rehberi servis üyeliğindeki sınıf düzeyleriyle, dershane rehberi kurumun tamamıyla sınırlı. |

Başlık (gönderici adı) **sağlayıcıdan otomatik çekilir ve yazılamaz**. Hesapta birden fazla onaylı başlık varsa yalnız o listeden varsayılan seçilir. Kullanıcılar yalnız **içerik** yazar. Şablon kaydedebilir, ileri tarihli gönderebilir (sağlayıcı destekliyorsa), geçmişi görebilir.

## Alıcılar

Veliler: `students.veli_telefon`. Sınıf seçilir, istenirse öğrenciler tek tek çıkarılır; aynı numara (kardeşler) tek SMS sayılır, geçerli numarası olmayanlar atlanır ve sayısı gösterilir. Mezun öğrenciler modülü rehberliğe eklendiğinde `alici_turu = 'mezun'` (migration 0183'te ayrıldı) ile bağlanacak.

## Sağlayıcılar

| Sağlayıcı | Başlık çekme | Bakiye | Zamanlama | Doğrulama durumu |
| --- | --- | --- | --- | --- |
| Verimor | `GET /v2/headers` | `GET /v2/balance` | `send_at` | Resmi kılavuzdan (github.com/verimor/SMS-API) doğrulandı; **gerçek hesapla denenmedi** |
| Netgsm | `GET /sms/rest/v2/msgheader` | yok | `startdate` | **Belgeye erişilemedi**; yayımlanmış istemci kitaplıklarına göre yazıldı. Gerçek hesapla denenmeli |
| İleti Merkezi | `POST /v1/get-sender/json` | `POST /v1/get-balance/json` | yok | **Belgeye erişilemedi**; MCP/SDK belgelerine göre yazıldı. Gerçek hesapla denenmeli |

Yeni sağlayıcı eklemek: `sms-saglayici-bilgi.ts` (alanlar, yetenekler), `sms-saglayicilar.ts` (`dogrula` + `gonder`), migration'daki `saglayici` check kısıtı.

Dikkat: Verimor/Netgsm panelinde **izinli IP** tanımlıysa Vercel çıkış adresleri sabit olmadığından istekler reddedilir; kurum IP kısıtını kaldırmalıdır (ekranda uyarı vardır).

## Kurulum

1. `SMS_KIMLIK_ANAHTARI` (64 hex, `.env.local.example`) Vercel'e **gizli** olarak eklenir. Kaybolursa kurumlar bilgilerini yeniden girer.
2. Migration `0183_sms_modulu.sql` uygulanır (3 tablo, hepsi RLS açık, yalnız `service_role`).
3. Admin → Kurumları Yönet → kurum → Kurum Yetkileri → **SMS modülü** açılır.

## Güvenlik ve veri

- Kimlik bilgileri AES-256-GCM ile şifreli (ayrı anahtar, AAD'li); istemciye hiç dönmez, hata mesajlarında/günlükte yer almaz.
- Telefon numaraları istemciye gitmez (yalnız "geçerli mi") ve geçmişe yazılmaz; geçmişte öğrenci kimliği/sayı/içerik/başlık vardır.
- Sunucu her istekte rolü, kurumu, modül anahtarını ve sınıf kapsamını DB'den yeniden çözer; istemciden gelen sınıf/öğrenci kimlikleri kapsamla kesiştirilir.
- Sınırlar: tek gönderimde en çok 1000 alıcı, kişi başına saatte 20 gönderim, aynı içeriğin 60 sn içinde tekrarı reddedilir, içerik ≤ 600 karakter.
- Yalnız bilgilendirme amaçlıdır; ticari/reklam (İYS) gönderimi için tasarlanmadı.

## Sınırlar

- Zamanlanan mesaj sağlayıcıda bekler; **SeFu'dan iptal edilemez** (sağlayıcı panelinden). Teslim raporu çekilmez (yalnız kabul durumu).
- Kısmi başarısızlıkta ("kısmen") gönderilmeyen numaralar için otomatik yeniden deneme yoktur.
- Kişiselleştirme ({öğrenci adı} vb.) yoktur; herkese aynı içerik gider.
