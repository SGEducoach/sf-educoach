# Maarif müfredat doğrulama taraması (24.10.2026)

Kaynak: MEB Talim ve Terbiye Kurulu program sitesi, `tymm.meb.gov.tr/ogretim-programlari/<ders>-dersi/{11,12,13,14}`
(= 9, 10, 11, 12. sınıf). Karşılaştırılan veri: `src/lib/mufredat-konulari.json` (190 konu).
Matematik ayrıca ve daha ayrıntılı tarandı: `docs/MATEMATIK_MAARIF_MUFREDAT_KARSILASTIRMA.md` (düzeltmeler 0178 ile canlıda).

Bu taramada **veri değişikliği yapılmadı**. Yalnızca "Maarif Edebiyat" tasnifi kodda (gösterim katmanı) eklendi; ayrıntısı 3. bölümde.

## 1. Ders ders sonuç

| Ders | MEB (ünite/tema) | Projedeki durum | Sonuç |
|---|---|---|---|
| Matematik | ayrı rapor | 0178 ile düzeltildi | ✅ |
| Fizik | 9: Fizik Bilimi, Kuvvet-Hareket, Akışkanlar, Enerji · 10: Kuvvet-Hareket, Enerji, Elektrik, Dalgalar · 11: Kuvvet-Hareket, Elektrik-Manyetizma, Optik · 12: Kuvvet-Hareket, Enerji, Dalgalar, Madde ve Doğası | 4/4/4/4 konu; her konu bir MEB ünitesinin altına oturuyor (ör. "Isı, Sıcaklık, Hâl Değişimi" Enerji ünitesi, "Modern Fizik" Madde ve Doğası) | ✅ uyumlu |
| Kimya | 9–12 hepsinde aynı üç tema: Etkileşim, Çeşitlilik, Sürdürülebilirlik | 3/3/3/3, üç temanın sınıfa göre dağılımı | ✅ uyumlu |
| Biyoloji | 9: Yaşam, Organizasyon · 10: Enerji, Ekoloji · 11: Tepki, Homeostazi · 12: Üreme, Gen | 3/2/2/4 | ✅ uyumlu |
| Tarih 9–11 | 9: Geçmişin İnşasında Tarih, Eski Çağ, Orta Çağ · 10: Türkistan'dan Türkiye (1040-1299), Beylikten Devlete (1299-1453), Cihan Devleti (1453-1683) · 11: 1683-1789, 1789-1908, 1908-1918 | 3/3/3 | ✅ uyumlu |
| İnkılap Tarihi (12) | 3 ünite: Modern Türk Devletinin Doğuşu · Türk İnkılabı ve Atatürkçülük · II. Dünya Savaşı'ndan Küreselleşmeye Türkiye | 13 konu, bu üç ünitenin alt kırılımı | ✅ uyumlu (kırılım projeye ait) |
| Felsefe | 10: 9 ünite · 11: 6 ünite (Çevre, Teknoloji, Akıl-İnanç, Edebiyat-Felsefe, Hayatın Anlamı, Hukuk) | 10: 9 · 11: 6 | ✅ birebir |
| Coğrafya | MEB sayfası 9, 10, 11, 12'nin **hepsinde aynı yedi üniteyi** listeliyor (Coğrafyanın Doğası … Bölgeler, Ülkeler ve Küresel Bağlantılar) | 9: 7 · 10: 4 · 11: 5 · 12: 5 konu | ⚠️ sınıf dağılımı bu sayfadan doğrulanamadı; ünite sayfalarına tek tek bakılmalı |
| Din Kültürü | MEB sayfası taramada HTTP 500 verdi (9–12 denendi) | 5/5/5/5 | ❓ doğrulanamadı, sayfa açılınca tekrar denenecek |
| Türk Dili ve Edebiyatı | Tema bazlı, konu listesi yok: 9 (Sözün İnceliği, Anlam Arayışı, Anlamın Yapı Taşları, Dilin Zenginliği) · 10 (Sözün Ezgisi, Kelimelerin Ritmi, Dünden Bugüne, Nesillerin Mirası) · 11 (Bir Diyeceğim Var!, Kültür Yolculuğu, Yaşamın İzinde, Hayatın Aynası) · 12 (Benim Yolculuğum, Toplumun Ahengi, Hayatın Dengesi, Hayalimdeki Yarın) | Maarif'e değil klasik listeye bağlı: Türkçe (TYT) 20 + Edebiyat (AYT) 21 | ✅ kullanıcı kararıyla klasik liste; 16 tema listede yok (bilinçli) |

## 2. Türkçe — klasik TYT, herkese ortak

- Projede `Türkçe` / seviye `TYT` altında 20 klasik ÖSYM konusu var (sözcükte anlam … anlatım bozukluğu).
- `konuOgrenciyeUygunMu`: 9, 10, 11, 12. sınıf ve SAY/EA/SÖZ'ün hepsinde `true`. Test eklendi (`mufredat-konulari.test.ts`), ileride biri kuralı daraltırsa kırılır.
- "Türkçe (Maarif)" taslak dersi (0060) zaten kaldırılmış durumda; testi var.
- Dikkat: "bütün sınıf kademeleri" cümlesini lise 9–12 olarak okudum. Ortaokulun Türkçesi LGS öğrenme çıktısı düzeninde ayrı yürüyor; onu klasik TYT listesine bağlamak yanlış olur.

## 3. 9–10. sınıf branş denemesi: "Maarif Edebiyat" tasnifi (yapıldı)

Canlı veride 9–10. sınıf branş denemesinden gelen **27 farklı Türkçe kazanımı** var (930 satır). İşaret kelimeleriyle ayrıştırıldı:

**Maarif Edebiyat (12):** Destan Dönemi Türk şiiri (2 metin), koşuk, türkü, deneme türü, hikâye-şiir türleri, tür/dönem/zihniyet ölçütleriyle sınıflandırma, şekil ve anlama dair birimler, edebiyatın güzel sanatlarla ilişkisi, güzel sanatları sınıflandırma, söz sanatları, "Metinleri sınıflandırır", şiirin içeriği (tema-konu).

**Klasik TYT Türkçe olarak kalan (15):** isim/sıfat tamlamaları, karma tamlamalar, yazım, noktalama (iki ayrı ifade), söz varlığı/bağlam, açık bilgi, bilginin sunuluşu, neden-sonuç, çıkarım, öznel-nesnel ifade, karakter davranışından çıkarım.

Nasıl çalışıyor:
- Yalnızca **gösterim katmanı**: veritabanındaki başlık hâlâ `Türkçe_Branş_Deneme` (17.10.2026 kararı korundu, migration yok, eski denemeler yeniden yüklenmeden doğru görünür).
- Konu Durumu ve Deneme Konu Analizi ekranlarında edebiyat kazanımları `Maarif Edebiyat (Branş)`, diğerleri `Türkçe (Branş)` başlığı altında.
- Görev verirken ve öğretmen ders yetkisinde `Maarif Edebiyat` → `Edebiyat` sayılır (gerçek ders adı olmadığı için); Türkçe-Edebiyat branşı iki dersi de görüyor.
- İşaret yoksa kazanım eskisi gibi Türkçe'de kalır (yanlış tasnif riski düşük tarafta). Yeni bir yayınevinin yeni kazanım metni yanlış düşerse işaret listesine ekleme yeterli (`src/lib/maarif-edebiyat.ts`).
- Dosyalar: `maarif-edebiyat.ts` (+test), `konu-durumu.ts`, `deneme-konu-analizi.ts`.

## 4. EA (Eşit Ağırlık) için AYT — kaynak bulundu, kararlar uygulandı

Şu an EA öğrencisi (12. sınıf) AYT'de şunları görüyor (`AYT_MUFREDAT_DERSLERI.EA`): Matematik (Maarif 11–12 konuları), Edebiyat (klasik AYT 21 konu), Tarih ve Coğrafya (Maarif 9–12 listeleri).

**Kaynak bulgusu (belirleyici, 24.10.2026):** 2026 YKS kılavuzu adayların "MEB tarafından belirlenen *ÖSYM Tarafından 2026 Yılında Gerçekleştirilecek TYT, AYT ve YDT Sınavlarına Esas Ortak Derslere Ait Kazanım ve Açıklamalar*" belgesinden sorumlu olduğunu söylüyor. Bu belge (`ttkb.meb.gov.tr/meb_iys_dosyalar/2025_11/26164023_2026_yks.pdf`) Maarif kazanımlarıdır: Tarih 9–11, İnkılap 12, Coğrafya 9–12, Matematik, Türk Dili ve Edebiyatı… Yani Tarih, Coğrafya ve Matematik için ayrı bir "klasik ÖSYM AYT listesi" artık yok; projedeki Maarif listeleri zaten sınavın resmî kaynağı.

Kararların uygulanması:
1. **Kaynak (karar 1):** yeni liste eklenmedi, çünkü eklenecek ayrı bir klasik liste yok; Tarih/Coğrafya/Matematik listeleri doğru kaynakla örtüşüyor. Edebiyat'ın klasik 21 konusu senin kararınla duruyor.
2. **Çift görünme (karar 2):** ikinci bir liste olmadığı için gizlenecek bir şey yok; EA öğrencisi Tarih/Coğrafya/Matematik'i tek listede görüyor.
3. **11. sınıf EA/SÖZ (karar 3, uygulandı):** AYT Edebiyat artık 11. sınıftan itibaren açık (`konuOgrenciyeUygunMu`, `seviye "AYT"` eşiği 12'den 11'e). SAY ve 10. sınıf hâlâ görmez; testler güncellendi.

Dikkat edilecek iki not (kodda değişiklik yapılmadı):
- Belgede Matematik'in 11–12. sınıf **"Temel Düzey"** bölümü ayrı (sayı kümeleri, çember, istatistik…). AYT matematiği ileri düzeydir; projedeki Matematik 11–12 listesinin ileri düzey olduğunu ayrıca teyit etmek gerekir.
- Coğrafya-1 sorularında 11–12. sınıfta yalnız 4 saatlik programdaki (belgede kırmızı) kazanımlar sorumluluk dışı; proje bunu ayırt etmiyor.

### 4.1 Matematik 11–12: ÖSYM 2026 belgesi ile proje listesi UYUŞMUYOR (karşılaştırıldı)

ÖSYM 2026 belgesindeki ana (ileri düzey) 11–12. sınıf Matematik programı ile projedeki liste (tymm.meb.gov.tr Maarif sayfalarından alınmış) farklı yapıda:

| | ÖSYM 2026 belgesi (ana program) | Projede (tymm Maarif listesi) |
|---|---|---|
| 11 | Trigonometri (yönlü açılar, trigonometrik fonksiyonlar) · Analitik Geometri (doğru) · Fonksiyonlarda Uygulamalar (2. dereceden fonksiyonlar, dönüşümler) · Denklem ve Eşitsizlik Sistemleri · Çember ve Daire (teğet dahil) · Katı Cisimler · Olasılık (koşullu, deneysel-teorik) | Trigonometrik Fonksiyonlar · Üstel ve Logaritmik · Fonksiyonlarda İşlemler ve Bileşke · Dörtgenler ve Çokgenler · İstatistik (iki nicel değişken) |
| 12 | Üstel ve Logaritmik Fonksiyonlar · Diziler · Trigonometri (toplam-fark, denklemler) · Dönüşümler · Türev (limit, süreklilik, türev uygulamaları) · **İntegral** (belirsiz) · Analitik Geometri (çember) | Diziler · Polinomlar · Limit ve Süreklilik · Türev · Türev Uygulamaları · Çemberde Açı ve Uzunluk · Katı Cisimler · İstatistiksel Problemler |

Çıkarımlar:
- **Projede eksik (ÖSYM 2026 kapsamında):** İntegral, Analitik Geometri (doğru ve çember), Dönüşümler, Denklem ve Eşitsizlik Sistemleri, Olasılık (11. sınıf), 2. dereceden fonksiyonlar. Üstel-logaritma ÖSYM'de 12. sınıfta, projede 11. sınıfta.
- **Projede fazla (ÖSYM 2026 ana programında yok):** Dörtgenler ve Çokgenler, İki nicel değişkenli istatistik, Polinomlar, İstatistiksel Problemler.
- "Toplam-Fark Formülleri" (0178 raporunda "resmî olmayan" denen alt başlık) ÖSYM belgesinde **var** (12.3.1) — bu alt başlık silinmemeli.
- Olası açıklama: projedeki liste yeni Maarif programının (2025-26'dan itibaren kademeli) tymm sayfasından, ÖSYM belgesi ise 2026 sınavının geçiş dönemi kapsamından geliyor. Hangisinin hangi öğrenci grubuna uygulanacağı (2026 mezunu / 2027 mezunu) bir ürün kararıdır; **veri değiştirilmedi**.

## 5. Açık kararlar

1. **Matematik 11–12 (yukarıdaki 4.1):** 12. sınıf/AYT öğrencisi için ÖSYM 2026 belgesindeki ana programa göre mi, tymm Maarif listesine göre mi çalışılsın? İntegral ve Analitik Geometri şu an öğrencide hiç yok. Öneri: 12. sınıf (2026 sınavı) için ÖSYM belgesinin 11–12 listesini ayrı etiketle ("AYT Matematik") ekle; 9–11 mevcut Maarif listesiyle kalsın. Onay verirsen migration/JSON hazırlarım.
2. Din Kültürü ve Coğrafya sınıf dağılımı: MEB program sitesi açılınca ya da aynı belgeden (Coğrafya s.112–123) tekrar doğrulanacak.
3. Eski bekleyenler: Elbistan'ın 55 kurum alt başlığının yeniden dağıtımı, 3 resmî olmayan Matematik alt başlığı (Modüler Aritmetik, Binom Açılımı, Toplam-Fark Formülleri), 9. sınıf listesindeki Hazırlık konuları.
