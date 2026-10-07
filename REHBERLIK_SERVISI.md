# Rehberlik Servisi — ayrı bir birim (07.10.2026)

Kullanıcı kararı: *"rehberlik kısmını bir öğretmen değil de müdür gibi ayrı bir
birim olarak tekrar kuralım… rehber öğretmen bir branş öğretmeni değil ve
okuldaki sayılarına göre kademeleri aralarında paylaşabiliyorlar."*
Ek kısıt: *"mevcut halihazırdaki sistemi baştan aşağı değiştirmene gerek yok."*

## Rehber öğretmenin gerçek okul rolü → sisteme karşılığı

| Gerçek rol (MEB rehberlik hizmetleri çerçevesi) | Sistemdeki hâli | 0144 ile |
|---|---|---|
| Branş öğretmeni değil; dersi, ödevi, konu yeterliliği kararı yok | `BRANS_LISTESI`'nde bir branş gibi duruyordu | Okul branş listelerinden **çıktı**; kimlik üyelik tablosundan |
| Müdüre bağlı ayrı bir **servis**; üyeler sayılarına göre kademeleri paylaşır | 0143 düzey paylaşımını doğru modellemişti ama `teachers`'a bağlamıştı | Veri `rehberlik_servisi`'ne taşındı; 5-12 (kademe paylaşımı mümkün) |
| İş birimi öğrenci + veli | Zaten böyleydi (Bireysel Mesaj, Kurum Performansı) | Değişmedi |
| Kapsamı dışındaki öğrenciyi göremez | 0143 yalnız **lise** okullarda sınırlıyordu | Sınır artık **üyelikten** gelir; ortaokul rehberi de sınırlı |
| Yardım isteği doğru rehbere düşer | Tüm rehberlere gidiyordu | Öğrencinin **düzeyinden sorumlu** rehbere gider |

## Neden yeni bir rol (`user_role`) değil

İki yol ölçüldü:

- RLS'te `profiles.role = 'ogretmen'` kullanan politika sayısı: **0**
  (29 politika `is_ogretmen()` / `ogretmen_okulu()` üzerinden geçiyor, bunlar
  `teachers` satırına bakıyor). Yani kimliği tabloya almak RLS'i hiç etkilemiyor.
- Uygulamada `role === "ogretmen"` karşılaştırması: **96** yer. Yeni bir rol
  bunların hepsini sessizce `false`'a çevirirdi — derleyici yakalamaz.
- Postgres'te enum değeri **silinemez**: tek yönlü kapı.

Bu yüzden `school_moderators` ile birebir aynı desende bir **üyelik tablosu**
seçildi: dar, geri alınabilir ve "ayrı birim" isteğini harfiyen karşılıyor
(gerçekten üyeleri olan bir servis). Kullanıcı bu seçeneği onayladı.

## Kapsam

**İçinde:** `schools.tur = 'okul'` kurumları (grup olmayan).

**Dışında, bilinçli olarak:** dershane rehberliği (`src/lib/dershane-rehber.ts`)
ve Grup Koçluk koçu (`src/lib/grup-koc-auth.ts`, `grup-koc-bildirim.ts`,
`grup-koc-hatirlatma.ts`, `yonetici/grup-actions.ts`). Bunlar farklı bir iş;
kimliklerini hâlâ `teachers.brans = 'Rehber Öğretmen'` üzerinden alıyor ve
`BRANS_LISTESI` o seçeneği **dershane için** koruyor (dershane rehberi kendi
kaydını onunla yapıyor). Tek kontrol noktası: `rehberlikBirimiMi(brans, okulRehberi)`.

## Veri modeli

```
rehberlik_servisi
  profile_id      uuid  PK  -> profiles(id)   (bir kişi tek serviste)
  school_id       uuid      -> schools(id)
  sinif_duzeyleri text[]    check <@ {5..12}   boş = hiçbir öğrenciyi görmez
  unvan           text      'Rehber Öğretmen'
```

RLS: kurum üyeleri okur (`kurum_uyesi_mi`), **yazma politikası yok** — atama
yalnız sunucudan (servis anahtarı) yapılır, yetki
`src/app/moderator/rehber-sinif-actions.ts` içinde doğrulanır (admin veya kurum
moderatörü). 0143'te `teachers` üzerinde ayrı bir koruma tetikleyicisi
gerekiyordu çünkü öğretmen kendi satırını güncelleyebiliyordu; burada öyle bir
politika olmadığı için tetikleyiciye gerek yok.

`teachers.rehber_sinif_duzeyleri` **terk edildi** (kolon ve 0143 tetikleyicisi
geriye dönük güvenlik için duruyor, ayrı bir temizlikte düşürülecek). Tek kaynak
`rehberlik_servisi.sinif_duzeyleri`.

## 0143 ile ilişki

0143'ün RESTRICTIVE politikaları kolonu değil **fonksiyonları** çağırıyor, bu
yüzden politikalara hiç dokunulmadı — yalnız üç fonksiyonun gövdesi değişti
(`rehber_ogrenciyi_gorebilir`, `rehber_profili_gorebilir`,
`rehber_denemesini_gorebilir`). Kalıp aynen korundu:

> "rehber değilsen serbest geç (`not exists`), rehberse kapsamınla sınırla"

Kademe (lise/ikisi) koşulu kalktı: kapsamı artık üyelik belirliyor.
Ek olarak `okul_rehberi_mi(uuid default null)` yardımcısı eklendi.

## Doğrulama (geri alınan işlemle, canlı veride)

| Durum | Gördüğü öğrenci |
|---|---|
| Rehber, 9-12 atanmış | 190 |
| Rehber, yalnız `9`'a daraltılmış | 20 = okulun 9. sınıf mevcudu |
| Aynı okulun branş öğretmeni | 190 (etkilenmedi) |

## Yeni rehber nasıl atanır

Branş seçeneği kalktığı için tek yol **Rehberlik Servisi** kutusu
(moderatör panelinde ve yönetici > okullar): "Servise öğretmen ekle" ile üye
eklenir, düzeyleri işaretlenir, "Servisten çıkar" ile yetki alınır. Kutu artık
ortaokul okullarında da görünüyor (0143'te yalnız lise/ikisi idi).

## Yapılmayanlar (gerçek rolde var, sistemde hâlâ yok)

Bunlar bilinçli olarak bu işin dışında bırakıldı, ayrıca karar gerekiyor:

- **Görüşme kaydı** (gizli) — rehberin asıl iş ürünü; şu an hiç yok.
- **Risk/takip listesi** (devamsızlık, düşen net, veli talebi).
- **Yıllık çerçeve plan / faaliyet raporu**, RAM yönlendirme kaydı.
- Rehber menüsündeki "Öğretmenler ve Programlar" **bırakıldı**: gerçekte de
  rehber ders programına bakar (öğrenciyi kritik dersten çekmeden görüşme saati
  ayarlamak için).
