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

## 4. EA (Eşit Ağırlık) için AYT — durum ve onay bekleyen taslak

Şu an EA öğrencisi (12. sınıf) AYT'de şunları görüyor (`AYT_MUFREDAT_DERSLERI.EA`): Matematik (Maarif 11–12 konuları), Edebiyat (klasik AYT 21 konu), Tarih ve Coğrafya (Maarif 9–12 listeleri).

Eksik/karar bekleyen noktalar:
1. **Tarih ve Coğrafya için klasik ÖSYM AYT listesi yok** (Edebiyat'ta var). Mevcut Maarif listeleri sınav dilinden farklı ("Tarih-1/Tarih-2", "Coğrafya-1/Coğrafya-2" ÖSYM kılavuzu başlıklarıyla ilerliyor). Klasik listeyi **ÖSYM AYT kılavuzundan** alıp `seviye: "AYT"` olarak eklemek gerekir; ben kılavuz metnini doğrulayamadığım için konu adlarını uydurmadım. Kılavuz PDF'ini (ya da yayınevinin AYT içindekiler sayfasını) verirsen eklerim.
2. **Aynı konunun iki yerde görünmesi riski:** klasik AYT listesi eklenince EA 12. sınıf öğrencisi hem "Osmanlı Dünya Gücü (Maarif)" hem klasik karşılığını görür. Seçenekler: (a) EA'da yalnız klasik AYT, Maarif 9–12 gizli; (b) ikisi yan yana. Önerim (a), ama TYT konuları Maarif sınıf konularından geldiği için Tarih/Coğrafya'nın TYT'si Maarif'te kalmalı.
3. **11. sınıf EA** şu an AYT Edebiyat görmüyor (`seviye "AYT"` yalnız 12. sınıfa açık; testte bilinçli). Okullarda EA sınıfı 11'de başladığı için 11'e açılması mantıklı; ama bu kural değişir, onayın gerekir.
4. **Matematik (EA)**: SAY ile aynı Maarif 11–12 listesini kullanıyor. EA'nın AYT matematiği SAY'dan dar (limit/türev/integral ağırlığı farklı); klasik EA listesi için yine ÖSYM kılavuzu gerekir.

## 5. Açık kararlar (senden)

1. Tarih/Coğrafya/Matematik klasik AYT listeleri için kaynak (ÖSYM kılavuzu) ve "yalnız klasik mi, yan yana mı" kararı.
2. 11. sınıf EA'ya AYT Edebiyat açılsın mı?
3. Din Kültürü ve Coğrafya sınıf dağılımı: MEB sitesi açılınca ünite sayfalarından tekrar doğrulanacak (otomatik, onay gerekmez).
4. Eski bekleyenler: Elbistan'ın 55 kurum alt başlığının yeniden dağıtımı, 3 resmî olmayan Matematik alt başlığı (Modüler Aritmetik, Binom Açılımı, Toplam-Fark Formülleri), 9. sınıf listesindeki Hazırlık konuları.
