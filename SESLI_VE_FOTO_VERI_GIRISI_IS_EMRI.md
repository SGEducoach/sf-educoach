# İş Emri — Sesli Komutla ve Fotoğrafla Veri Girişi

**Tarih:** 02.10.2026
**Yapım yöneticisi:** Claude (bu dosyayı yazan)
**Uygulayan:** sesli giriş çalışmasını başlatan AI
**Durum:** sesli giriş ilk sürümü yazılmış, denetlendi; aşağıdaki düzeltmeler ve
karar maddeleri bağlayıcıdır.

Bu dosya bir öneri listesi değil, iş emridir. Maddeler **harfiyen** uygulanır.
Bir maddeye katılmıyorsan uygulamadan önce yapım yöneticisine sor; kendi
kararınla sapma.

---

## 0. Önce şunu oku

Projenin kuralları `AGENTS.md` ve `CLAUDE.md`'de. Ayrıca bu depoda yerleşik
olan ve **ihlal edilmemesi gereken** alışkanlıklar:

1. **`git add -A` / `git add .` YASAK.** Dosyaları tek tek ekle. Depoda başka
   oturumların commit edilmemiş işi olabiliyor; onları kendi commit'ine
   katma.
2. **Kişisel veri commit edilmez.** Öğrenci/öğretmen adı, numara, e-posta
   içeren çıktı dosyası depoya girmez. İş çıktıları `output/` altına yazılır
   ve o klasör `.gitignore`'da.
3. **Saf mantık ile sunucu kodu ayrı dosyada.** `import "server-only"` içeren
   bir modül vitest'te yüklenemez. Ayrıştırma/doğrulama saf fonksiyon olarak
   ayrı dosyada durur, test edilir.
4. **Veritabanı kısıtı ile istemci doğrulaması AYNI değeri kullanır.** Ayrışırsa
   kullanıcı ham Postgres hatası görür. (Örnek: soru çözümünde süre ≤ 2 dk ×
   toplam soru — BOŞ sorular dahil, bkz. migration 0125.)
5. **Sessiz varsayılan yok.** Anlaşılmayan girdi için uydurma değer üretme;
   açık bir hata mesajı ver. Mesajlar Türkçe, suçlayıcı olmayan dilde.
6. **Türkçe adlandırma.** Fonksiyon/değişken/tablo adları Türkçe, mevcut
   dosyalardaki üslupla.
7. **Testler gerçek girdiyle yazılır.** "Çalışıyor" demek için senaryoyu
   çalıştır; çıktısını gör. Aşağıdaki BUG-1 tam olarak bu yüzden gözden
   kaçmış.
8. **Deploy etme, migration uygulama.** Veritabanı değişikliği gerekiyorsa
   migration dosyasını yaz ama **uygulamadan** yapım yöneticisine haber ver.

---

## 1. Denetim sonucu: iyi olan ve korunacaklar

Sesli girişin ilk sürümü sağlam bir temel. Aşağıdakiler **bilinçli doğru
kararlar**, bozma:

- **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) seçimi.
  Tarayıcıda çalışır: **API maliyeti yok, sunucu yükü yok.** Ücretli bir ses
  servisine geçme.
- **Yazarak girme alternatifi** var (tarayıcı desteklemiyorsa / mikrofon izni
  yoksa). Erişilebilirlik açısından şart, kaldırma.
- **Mikrofon izni ve hata durumları** ayrı ayrı ele alınmış (`not-allowed`,
  `no-speech`). Koru.
- **Form OTOMATİK GÖNDERİLMİYOR**; ayrıştırılan değerler forma yazılıyor,
  gönderme kararı öğrencide. **Bu kural değişmez** (bkz. §4).
- **Süre ≤ 2 dk × toplam soru** kuralı veritabanı kısıtıyla uyumlu yazılmış.
- Ayrıştırıcı **saf fonksiyon**, ayrı dosyada, testi var.
- `toLocaleLowerCase("tr-TR")` kullanılmış — Türkçe'de `I/ı` dönüşümü için şart.

---

## 2. Denetim sonucu: DÜZELTİLECEK HATALAR

Aşağıdaki çıktılar `src/lib/sesli-soru-girisi.ts` gerçek girdilerle
çalıştırılarak alındı.

### BUG-1 (KRİTİK — sessiz veri bozulması)

Etiket önce söylendiğinde **her alan bir öncekinin sayısını çalıyor**:

| Girdi | Beklenen | Çıkan |
|---|---|---|
| `Matematik doğru 20 yanlış 5 boş 2 süre 40` | 20D / 5Y / 2B | **20D / 20Y / 5B** |

**Sebep:** `alanOku` iki deseni sırayla deniyor ve "sayı-sonra-etiket"
(`once`) desenini ÖNCE kabul ediyor. `"dogru 20 yanlis 5"` metninde
`(\d{1,3})\s*yanlis` deseni **"20 yanlis"** ile eşleşiyor; yani doğru
cevabının sayısı yanlışa yazılıyor.

**Neden gözden kaçtı:** `sesli-soru-girisi.test.ts` içindeki
"etiket önce söylenince de okur" testi yalnız `.veri?.ders` alanını kontrol
ediyor. Sayılara bakmadığı için hata yeşil testin arkasında kaldı.

**Yapılacak:**
- `alanOku`'yu tek geçişte, etiket konumuna göre çalışacak şekilde yeniden
  yaz. Doğru yaklaşım: metni belirteçlere (token) ayır, her sayı için
  **kendisine en yakın etiketi** bul; bir sayıyı iki alana birden yazma, bir
  alanı iki kez doldurma.
- Her alan **tam bir kez** eşleşmeli. Aynı etiket iki kez geçiyorsa
  (`20 doğru 30 doğru`) girdiyi **reddet** — tahmin etme.
- Testi gerçek sayılarla yaz: `toEqual` ile tüm alanları karşılaştır,
  `.veri?.ders` ile yetinme. Hem "sayı önce" hem "etiket önce" hem karışık
  sıralama için ayrı senaryo.

### BUG-2 (sessiz yanlış değer)

| Girdi | Beklenen | Çıkan |
|---|---|---|
| `Matematik 20 doğru 5 yanlış 2 boş 40,5 dakika` | ret | **süre 5 dk** |

**Sebep:** `normalize` virgülü boşluğa çeviriyor → `"40 5 dakika"`; süre
deseni sondaki parçayı (`5 dakika`) yakalıyor.

**Yapılacak:** ondalıklı sayı **reddedilir** (süre tam dakikadır). Virgül/nokta
ile bitişik rakam grubu görülürse hata mesajı ver. Aynı tuzak doğru/yanlış/boş
için de geçerli, hepsini kapat.

### BUG-3 (yanlış ders seçimi)

| Girdi | Çıkan |
|---|---|
| `Tarih bir 10 doğru 2 yanlış 1 boş 20 dakika` | ders = **Tarih** |

AYT'de ders adları `Tarih-1`, `Tarih-2`, `Felsefe Grubu` biçiminde. Öğrenci
"tarih bir" diyor, ayrıştırıcı sessizce **`Tarih`** seçiyor. O ad öğrencinin
ders listesinde olmayabilir; form `<select>`'inde karşılığı bulunmayan bir
değer set edilir ve alan boş görünür.

**Yapılacak:**
- Sözlü biçimleri gerçek ders adlarına eşle: `"tarih bir" → "Tarih-1"`,
  `"tarih iki" → "Tarih-2"`, `"felsefe grubu" → "Felsefe Grubu"`. Eşleme
  tablosu tek yerde, testli.
- **Eşleşen ad öğrencinin `dersler` listesinde yoksa REDDET**: "Bu ders senin
  listende yok" benzeri açık mesaj. Sessizce başka bir derse düşme.

---

## 3. Denetim sonucu: KARAR VERİLMİŞ eksikler

Bunlar hata değil, eksik. Kararı ben verdim; tartışmaya açık değil.

**K-1. "Boş" söylenmezse 0 kabul edilir.**
Şu an `Matematik 20 doğru 5 yanlış 40 dakika` reddediliyor. Gerçek sunucu
eylemi (`soruCozumuEkle`) `bos ?? 0` yapıyor; öğrencinin her seferinde "sıfır
boş" demesi gereksiz. **Ama** forma yazılan 0 ekranda görünür olacak —
öğrenci neyin kaydedileceğini görmeden göndermesin.

**K-2. Yazıyla sayılar desteklenecek (0-100).**
`yirmi doğru beş yanlış` şu an reddediliyor. Türkçe ses tanıma bazı
durumlarda sayıyı yazıyla döndürüyor. Saf bir "yazıyla sayı → rakam"
çeviricisi yaz (`bir, iki … on, yirmi, otuz … yüz`, birleşik: `yirmi beş`).
Sınır 0-100 yeterli; üstünü reddet.

**K-3. Doğal konuşma kalıbı desteklenecek (sınırlı).**
`matematikten 20 doğru 5 yanlış 2 boş yaptım 40 dakikada` şu an reddediliyor
(çünkü ders adı kelime sınırına oturmuyor). Türkçe ekler yüzünden bu çok
yaygın olacak. **Çözüm:** ders adı eşleşmesinde sondaki yapım/çekim eklerine
izin ver (`matematikten`, `matematiği`, `türkçeden`). Kelimenin BAŞI tam
eşleşmeli; ortasında geçen eşleşmeyi kabul etme (`gramatematik` olmaz).
Ek listesi sabit ve testli olsun, "her şeyi kabul et" yapma.

**K-4. Yayınevi sesle DOLDURULMAZ.**
`soruCozumuEkle` yayınevini **zorunlu** istiyor; sesli komut onu doldurmuyor.
Bu doğru: yayınevi adları serbest metin ve ses tanıma onları güvenilir
çıkarmaz. Sesli giriş sonrası ekranda **"Yayınevini seçmen gerekiyor"**
uyarısı göster, formu gönderilemez bırak. Yayınevini sesten çıkarmaya
çalışma.

**K-5. Kapsam yalnız SORU ÇÖZÜMÜ.**
Konu çalışması ve deneme girişine sesli komut **eklenmeyecek** (deneme 9-11
ders × 3 sayı; sesle güvenilir değil). Mevcut kapsamı genişletme.

**K-6. Ortaokul paneline sesli giriş EKLENMEYECEK.**
Ortaokul öğrencisinin ekranı `OgrenciVeriGirisi` değil, `OrtaokulCalismalarim`
(Maarif/LGS). Ayrı bir karar verilene kadar oraya dokunma.

---

## 4. Değiştirilemez güvenlik kuralı

**Sesli komut ya da fotoğraf, HİÇBİR koşulda veriyi kendiliğinden
kaydetmez.** Her ikisi de yalnızca formu doldurur; kaydetme eylemini
öğrenci yapar. Gerekçe: ses tanıma ve OCR hata payı taşır, yanlış kaydedilen
çalışma verisi analiz motorunu ve öğretmenin kararını bozar.

Bu kural ürün kararıdır; "kullanıcı deneyimi daha akıcı olur" gerekçesiyle
esnetilemez.

---

## 5. Fotoğrafla veri girişi — maliyet ve yük kararı

Soru: "Veri Defteri'nin fotoğrafını yükletip verilere işleme **maliyetsiz**,
sonrasında da **siteye ağır yük getirmeden** yapılabilir mi?"

**Cevap: tam otomatik el yazısı okuma maliyetsiz olarak yapılamaz. Aşamalı
ve dürüst bir yol var.**

Değerlendirilen seçenekler:

| Yol | API maliyeti | Sunucu yükü | El yazısı doğruluğu |
|---|---|---|---|
| Claude/GPT görsel API | **Var** (fotoğraf başına) | Yok | Yüksek |
| Sunucuda Tesseract OCR | Yok | **Ağır** (CPU, serverless'ta zehir) | Düşük |
| **Tarayıcıda tesseract.js** | **Yok** | **Yok** (öğrencinin cihazı) | Düşük–orta |

Tesseract el yazısında zayıftır; matbu metin ve **kutulara ayrılmış rakamlar**
için kabul edilebilir.

### Kararlaştırılan aşamalar

**Aşama 1 — fotoğraf yalnızca YARDIMCI (maliyet 0, yük 0).**
Öğrenci defter sayfasının fotoğrafını çeker; uygulama onu formun yanında
gösterir, öğrenci bakarak doldurur. OCR yok. Fotoğraf **sunucuya
yüklenmez**, yalnız tarayıcıda (`URL.createObjectURL`) gösterilir —
depolama maliyeti ve KVKK yükü de sıfır. Bu aşama tek başına bile işe yarar:
telefonu elinde tutup deftere bakmak zorunda kalmıyor.

**Aşama 2 — tarayıcıda rakam okuma (maliyet 0, yük öğrencinin cihazında).**
`tesseract.js` ile **yalnızca kutulu rakam alanları** okunur, sonuç forma
**öneri** olarak yazılır ve her sayı öğrenci onayı ister. Koşullar:
- wasm/model dosyası **tembel yüklenir** (sadece bu özellik açıldığında) ve
  tarayıcı önbelleğine alınır. Ana paket boyutu artmayacak.
- Düşük güvenli okuma **boş bırakılır**, tahmin yazılmaz.
- Eski/zayıf telefonda özellik kendini kapatır (süre aşımı), form normal
  çalışmaya devam eder.

**Aşama 3 — ücretli görsel API.** Yalnızca kullanıcı maliyeti kabul ederse ve
**öğrenci başına değil, öğretmen/yönetici tetiklemeli toplu iş** olarak.
Bu aşamaya **izin alınmadan geçilmez**.

### Aşama 2'nin önkoşulu — basılı defterin yeniden tasarımı

Veri Defteri PDF'i bizim tasarımımız (`output/pdf/veri-defteri/`). OCR
başarısı büyük ölçüde kâğıdın tasarımına bağlı. Aşama 2'ye geçmeden önce
defterin şu hâle getirilmesi gerekir:
- **rakam başına bir kutu** (bitişik el yazısı yerine ayrık karakter),
- sayfa köşelerinde **hizalama işaretleri** (perspektif düzeltmesi için),
- ders satırlarının **sabit konumda** olması.

Basılı materyal kuralı: **dolu koyu zemin ve gradyan kullanılmaz**
(fotokopiye dayanıklılık). Bu kural geçerli.

**Aşama 2'ye defter yeniden tasarlanmadan başlamayın.** Önce Aşama 1'i
bitirin.

---

## 6. İş sırası

Sırayı değiştirme. Her adım bitince dur ve raporla.

1. **BUG-1'i düzelt.** Tek geçişli, etiket konumuna dayalı ayrıştırma. Testi
   tüm alanları `toEqual` ile karşılaştıracak şekilde yeniden yaz; mevcut
   "etiket önce" testi hatayı maskeliyordu, onu da düzelt.
2. **BUG-2 ve BUG-3'ü düzelt** (ondalık ret, AYT ders adı eşlemesi + listede
   yoksa ret).
3. **K-1, K-2, K-3'ü uygula** (boş=0, yazıyla sayı, ek toleransı).
4. **K-4'ü uygula** (yayınevi uyarısı).
5. **Fotoğraf Aşama 1'i yap.** Sunucuya yükleme YOK.
6. Dur. Aşama 2 için defter yeniden tasarımı kararını bekle.

---

## 7. Her adımda yapılacak doğrulama

Aşağıdakiler yapılmadan "bitti" denmez:

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
node node_modules/eslint/bin/eslint.js
node node_modules/next/dist/bin/next build --webpack
```

(Bu makinede Node tam yolla çağrılır: `"/c/Program Files/nodejs/node.exe"`.)

Ayrıca **ayrıştırıcıyı gerçek girdilerle çalıştır** ve çıktısını rapora
koy. En az şu senaryolar geçmeli:

| Girdi | Beklenen |
|---|---|
| `Matematik 20 doğru 5 yanlış 2 boş 40 dakika` | 20/5/2, 40 dk |
| `Matematik doğru 20 yanlış 5 boş 2 süre 40` | 20/5/2, 40 dk |
| `matematikten 20 doğru 5 yanlış 2 boş yaptım 40 dakikada` | 20/5/2, 40 dk |
| `Matematik yirmi doğru beş yanlış iki boş kırk dakika` | 20/5/2, 40 dk |
| `Matematik 20 doğru 5 yanlış 40 dakika` | 20/5/**0**, 40 dk |
| `Tarih bir 10 doğru 2 yanlış 1 boş 20 dakika` | `Tarih-1` (listede varsa), yoksa RET |
| `Matematik 20 doğru 5 yanlış 2 boş 40,5 dakika` | **RET** |
| `Matematik 20 doğru 30 doğru 5 yanlış 2 boş 40 dakika` | **RET** |
| `Türkçe 1 doğru 0 yanlış 0 boş 10 dakika` | **RET** (süre sınırı) |
| `20 doğru 5 yanlış 2 boş 40 dakika` | **RET** (ders yok) |

---

## 8. Raporlama

Her adım sonunda şunları yaz:
1. Ne değişti (dosya listesi).
2. Hangi senaryolar çalıştırıldı, **gerçek çıktıları** ne.
3. Doğrulama komutlarının sonucu (test sayısı dahil).
4. **Göremediğin / doğrulayamadığın ne var** — açıkça yaz. Gerçek hesapla
   ekranda denenmediyse "denenmedi" de.
5. Bir maddeyi uygulamadıysan **neden** uygulamadığını yaz; sessizce atlama.

Commit mesajında ne yaptığını VE neden öyle yaptığını yaz; bu depoda commit
mesajları kararların kaydı olarak kullanılıyor.
