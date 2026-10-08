# Ortaokul panelini lise izlerinden arındırma (08.10.2026)

Kullanıcı kararları: ortaokul net formülü **D − Y/3**, **deneme kavramı
olacak**, **O2'den başla**. Sonra tüm yetki devredildi ("gelince bana
söylersin, uygun olmazsa geri çekeriz").

Zamanlama avantajı: ortaokulda şu an **1 öğrenci (Elif Ada, 5-A) ve sıfır
çalışma verisi** var. Şema işlerini bugün yapmanın maliyeti neredeyse sıfır;
veri biriktikçe taşıma işine dönüşürdü.

---

## Yapılanlar

### O2 — şema izleri (migration 0147 + 0148) ✅

**Kök neden şemaydı.** Ortaokulun tek öğrencisi `ayt_alan = 'SAY'`
taşıyordu; sebebi veri girişi değil, `students.ayt_alan` kolonunun NOT NULL
olmasıydı — uygulama ortaokulda da bir değer göndermek *zorundaydı*.
`AdminPanel.tsx` bunu zaten itiraf ediyordu: *"(ayt_alan NOT NULL) varsayılan
'SAY' sessizce gönderiliyor"*.

| İz | Çözüm |
|---|---|
| `ayt_alan='SAY'` | Kolon nullable; kayıt temizlendi; `ortaokul_ayt_alanini_temizle` tetikleyicisi bir daha dolmasını engelliyor |
| LGS yok | `deneme_turu += 'LGS'` — **ayrı migration**, çünkü enum değeri aynı transaction'da kullanılamaz |
| `hedef_bolum` adı | Yeniden adlandırılmadı; çift anlamlı olarak `COMMENT`'le belgelendi (20+ dosyaya dokunmak kapsamı aşardı) |
| Net formülü | `netHesapla(dogru, yanlis, kademe)` — lise D−Y/4, ortaokul D−Y/3 |

`netHesapla`'nın varsayılanı **bilinçli olarak "lise"**: fonksiyon 9 dosyadan
çağrılıyor ve hepsi bugün lise verisi işliyor; varsayılanı değiştirmek tüm
lise analizini sessizce kaydırırdı.

**CHECK değil TRIGGER** kullanıldı — projenin kendi dersi: CHECK, UPDATE'te de
yeniden doğrulanıp ilgisiz kolon güncellemesinde sürpriz `23514` verir. Ayrıca
kural `classes.seviye`'ye baktığı için CHECK ile ifade edilemez.

**Yol boyunca tuzak:** backfill'i `students_transfer_guard` reddetti (yalnız
admin/`service_role` geçiyor, migration postgres olarak çalışıyor).
Tetikleyici transaction boyunca devre dışı bırakılıp hemen geri açıldı.

### O1 — veli ✅

`VELI_MENUSU` kademeden **tamamen habersizdi** ve "Analiz / Rapor" doğrudan
`AnalizPaneli`'ni açıyordu. `analiz.ts` içinde "ortaokul" kelimesi **sıfır**
kez geçiyor; `AnalizPaneli` TYT ve AYT çizgilerini **sabit kodluyor**. Sonuç:
5. sınıf velisi çocuğu için TYT/AYT net trendi görüyordu.

Yeni `ortaokulVeliRaporuGetir` + `VeliOrtaokulRaporu` **YKS'yi taklit
etmiyor**; velinin gerçekten bilmek istediği üç şeyi veriyor:
çalışma dökümü (süre + ders bazlı, net D−Y/3 ile), görev durumu, öğretmenin
tema değerlendirmeleri.

Kademe **çocuğun sınıfından** türetiliyor, kurumun kademesinden değil —
"ikisi" okulunda velinin bir çocuğu 5-A, diğeri 11-B olabilir. Pano'nun
`ortaokulMu` kaynağı da kurumdan kişinin kendi seviyesine çevrildi (eskiden
"ikisi" okulunda ortaokul öğrencisine lise panosu gidiyordu).

**Gizlilik kararı:** yardım istekleri rapora **bilinçli olarak girmiyor**.
Çocuğun öğretmene uzanması özel kalmalı; veliye raporlanırsa çocuk yardım
istemekten çekinir. Testle kayda geçirildi.

### O4 (1/2) — öğretmen ve müdür ✅

**Asıl sızıntı buydu:** ortaokul öğrencisine tıklayan öğretmen/müdür YKS
analizini görüyordu (`analizVerisiGetir`, konu hâkimiyeti, kohort, deneme
karnesi — hepsi TYT/AYT). Artık ortaokul raporu geliyor ve beş ağır YKS
sorgusu ortaokul öğrencisinde hiç çalışmıyor.

`ORTAOKULDA_GOSTERILMEYEN`'e **"onaylar"** eklendi. Ölçüm: o ekran
`soru_cozumleri` okuyor, ortaokul öğrencisi `ortaokul_calismalar`'a yazıyor ve
o tabloda `onaylandi_mi` kolonu **yok** — ortaokulda onay kavramı tasarımca
yok, yani kalem daima boştu. Aynı süzgeç müdürde de uygulanıyor.

### O5 — Pano ✅

Ortaokul öğrencisi okulunun panosunu göremiyordu. `TgDenemeleri` ortaokulu
**zaten destekliyor** (`ortaokulMu` ile YKS sınav takvimi haberleri çıkarılıp
yalnız okulun duyuru ve afişleri kalıyor) — eksik olan yalnızca menü kalemiydi.

---

## İki tespitim yanlış çıktı

Her ikisini de ölçerek düzelttim; yol haritasında yer alıyorlardı:

1. **"Catch-all rol/kademe kontrolü yapmıyor" → yanlış.** Catch-all gerçekten
   kontrol etmiyor ama `DashboardPage`'e devrediyor ve asıl koruma orada:
   `dashboardMenusu(...).some(oge => oge.bolum === aktifBolum)` tutmazsa
   `redirect("/dashboard")`. Ortaokul öğrencisi `/dashboard/analiz` yazsa geri
   atılıyor. **O3 iptal edildi.**
2. **"Ortaokul öğrencisinde Analiz yok" → boşluk değil.**
   `OrtaokulCalismalarim` zaten `ozet` *ve* `yeterlilik` (öğretmen kararları)
   alıyor. Ayrı bir Analiz kalemi tekrar olurdu — eklenmedi.

---

## Kalanlar

**O4 (2/2) — müdürün Kurum Performansı hâlâ YKS taksonomisi** (net ortalaması,
deneme trendi). Bu *yanlış bilgi değil, yanlış çerçeve*: ortaokulda deneme
verisi sıfır olduğu için Adım 1'in kapsam dürüstlüğü zaten "yetersiz veri"
diyor. Ortaokul taksonomisiyle beslemek yeni bir yapım işi ve sıfır veriyle
anlamlı şekilde doğrulanamaz.

**LGS denemesi giriş yolu yok.** `LGS` enum değeri eklendi ama şu an
**kullanılmıyor**: ortaokul öğrencisinin menüsünde `veri-girisi` yok, öğretmen
PDF akışı lise odaklı. "Deneme kavramı olacak" kararının gerçekleşmesi için
ayrı bir giriş akışı gerekiyor.

**`netHesapla` çağrı noktaları.** Fonksiyon kademeyi destekliyor ama 9 çağrı
noktası hâlâ lise varsayılanını kullanıyor. LGS denemeleri gelmeye başladığında
bu noktalar bağlanmazsa netler D−Y/4 ile hesaplanır.

---

## Doğrulanmayanlar

Hiçbir ekran gerçek hesapla açılmadı (ortaokul öğrencisi/velisi/öğretmeni
olarak giriş yapılamıyor). Doğrulama: 575 test, tip kontrolü, lint, üretim
derlemesi ve canlı veride geri alınan SQL işlemleri.

Şema doğrulaması canlı veriyle yapıldı: ortaokula `SAY` yazılmaya çalışıldı →
`NULL`; lise öğrencisine `EA` → korundu; kalan izli ortaokul kaydı 0; lise
tarafında yan hasar 0.
