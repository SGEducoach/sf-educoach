// Analiz Motoru / Deneme Net Dağıtımı — Faz P0.
//
// Yayınevi kaynaklı "OKUL ... NET LİSTESİ" (toplu öğrenci listesi) sayfalarını
// DETERMİNİSTİK olarak ayrıştırır — Claude Vision'a HİÇ gitmeden. Rapor
// (25.08.2026, "Deneme Net Dağıtımı") bulgularına dayanıyor:
//   - pdfjs-dist, pdftotext/pypdf'in aksine Türkçe özel karakterleri (İŞĞÖÜÇ)
//     DOĞRU okuyor (test edildi) — isim okumak için Vision'a gerek yok.
//   - Sayısal sütunlar (D/Y/N, sıra, puan) zaten font sorunundan etkilenmiyordu.
//   - Bazı PDF'lerde bitişik sütunlar (örn. "12-XX 39") pdfjs-dist'te TEK
//     bir metin item'ı olarak geliyor — ama aralarında yine de boşluk
//     karakteri var, bu yüzden satırı TEK bir metin dizisine indirip
//     TAMAMEN boşluğa göre tokenize etmek (x-koordinatına göre sütun sınırı
//     çizmek yerine) çalıştığı doğrulandı — rapordaki "PORTAKA9L-D" bulgusu
//     pdftotext'e özgüydü, pdfjs-dist + boşluk-tabanlı ayrıştırma bu sorunu
//     yaşamıyor (gerçek 5 örnek PDF'e karşı test edildi).
//   - AYT'de bir öğrenci sadece kendi alanının (SÖZ/SAY/EA) testini
//     çözmüşse, hiç girmediği ders(ler)in D/Y/N üçlüsü satırdan TAMAMEN
//     ATLANIYOR (0 basılmıyor) — bu yüzden ayrıştırıcı eksik ders
//     bloklarını toplam D/Y ile çapraz doğrulayarak tolere ediyor.
//
// Sadece "OKUL ... NET LİSTESİ" bölümlerini (genelde ilk birkaç sayfa) okur
// — sınıf bazlı tekrar listelerini ve karne sayfalarını atlar.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

function metinItemMi(it: unknown): it is TextItem {
  return typeof it === "object" && it !== null && "transform" in it && "str" in it;
}

export interface AyristirilmisDersSonucu {
  ders: string;
  dogru: number;
  yanlis: number;
  net: number;
}

export interface AyristirilmisOgrenciSatiri {
  sira: number;
  ogrenciNo: number;
  // pdfjs-dist ile okunduğu HAM hali — Türkçe karakterler doğru, ama yine de
  // eşleştirme öncesi adNormalize ile normalize edilmeli (bkz. deneme-pdf-actions.ts).
  isimHam: string;
  sinif: string;
  dersSonuclari: AyristirilmisDersSonucu[];
  toplam: { dogru: number; yanlis: number; net: number };
  puan: number;
}

export interface OkulListesiAyristirmaSonucu {
  basarili: boolean;
  hata?: string;
  sinavAdi: string | null;
  dersEtiketleri: string[];
  ogrenciler: AyristirilmisOgrenciSatiri[];
}

interface KonumluMetin {
  str: string;
  x: number;
  y: number;
}

// Bilinen "ders başlığı" satırları → gerçek ders etiketleri. Yeni bir
// yayınevi/şablon geldiğinde buraya bir satır eklenir (Faz P5) — eşleşme
// bulunamazsa jenerik "Ders N" etiketiyle devam edilir (parse ÇÖKMEZ,
// sadece etiketler daha az anlamlı olur).
const DERS_BASLIGI_ESLESTIRME: { desen: RegExp; dersler: string[] }[] = [
  { desen: /TYT\s*T[üu]rk[çc]e\s+TYT\s*Sosyal\s+TYT\s*Matematik\s+TYT\s*Fen/i, dersler: ["TYT Türkçe", "TYT Sosyal", "TYT Matematik", "TYT Fen"] },
  { desen: /Edebiyat-Sosyal-1\s+Sosyal-2\s+Matematik\s+Fen\s*Bilimleri/i, dersler: ["Edebiyat-Sosyal-1", "Sosyal-2", "Matematik", "Fen Bilimleri"] },
];

const SINIF_DESENI = /^(?:\d{1,2}|Mezun)-[A-ZÇĞİÖŞÜX]{1,4}$/;
const OKUL_BASLIK_DESENI = /OKUL\s+.*NET\s+L[İI]STES[İI]/i;
const SINIF_BASLIK_DESENI = /\S+\s+SINIFI\s+.*NET\s+L[İI]STES[İI]/i;
const DYN_ETIKET_DESENI = /^(?:D\s+Y\s+N\s+){2,}/;

function sayiParcala(token: string): number | null {
  if (!/^-?\d+(?:,\d+)?$/.test(token)) return null;
  const n = Number(token.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Aynı y-koordinatındaki (küçük tolerans içinde) metin item'larını tek bir
// "satır" olarak grupluyor — PDF sayfa koordinatları y'si yukarı doğru
// arttığından satırlar azalan y sırasına göre sıralanıyor.
function satirlaraGrupla(itemlar: KonumluMetin[]): KonumluMetin[][] {
  const YAKINLIK = 1.5;
  const gruplar: { y: number; itemlar: KonumluMetin[] }[] = [];
  for (const it of itemlar) {
    if (!it.str.trim()) continue;
    let grup = gruplar.find((g) => Math.abs(g.y - it.y) <= YAKINLIK);
    if (!grup) { grup = { y: it.y, itemlar: [] }; gruplar.push(grup); }
    grup.itemlar.push(it);
  }
  gruplar.sort((a, b) => b.y - a.y);
  for (const g of gruplar) g.itemlar.sort((a, b) => a.x - b.x);
  return gruplar.map((g) => g.itemlar);
}

function satirMetni(satir: KonumluMetin[]): string {
  return satir.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
}

interface Grammer {
  dersSayisi: number;
  // Her puan bloğu için (Puan hariç) rank/sıra sütunu sayısı — TYT'de tek
  // blok + 5 sıra (Sn/Okul/İlçe/İl/Genel), AYT'de 3 blok (SÖZ/SAY/EA) +
  // her biri 3 sıra (Sn/Okul/Genel).
  puanBloklari: number[]; // her eleman: o bloktaki sıra sütunu sayısı
}

// D/Y/N etiket satırından ("D Y N D Y N D Y N D Y N Puan Sn Okul İlçe İl
// Genel" gibi) satır GRAMERİNİ türetir — hardcoded sütun sayısı yerine
// başlıktan okunuyor, böylece TYT/BRANŞ ve AYT gibi farklı şablonlara
// otomatik uyum sağlıyor.
function gramerCikar(dynSatirMetni: string): Grammer | null {
  const tokenlar = dynSatirMetni.split(" ");
  let i = 0;
  let tripletSayisi = 0;
  while (i + 2 < tokenlar.length && tokenlar[i] === "D" && tokenlar[i + 1] === "Y" && tokenlar[i + 2] === "N") {
    tripletSayisi++;
    i += 3;
  }
  if (tripletSayisi < 2) return null; // en az 1 ders + 1 toplam grubu beklenir
  const dersSayisi = tripletSayisi - 1; // son triplet "Toplam" grubuna ait

  const kalan = tokenlar.slice(i);
  const puanIndeksleri: number[] = [];
  kalan.forEach((t, idx) => { if (t === "Puan") puanIndeksleri.push(idx); });
  if (puanIndeksleri.length === 0) return null;

  const puanBloklari: number[] = [];
  for (let b = 0; b < puanIndeksleri.length; b++) {
    const baslangic = puanIndeksleri[b] + 1;
    const bitis = b + 1 < puanIndeksleri.length ? puanIndeksleri[b + 1] : kalan.length;
    puanBloklari.push(bitis - baslangic);
  }
  return { dersSayisi, puanBloklari };
}

function dersEtiketleriCikar(dersBasligiMetni: string, dersSayisi: number): string[] {
  for (const { desen, dersler } of DERS_BASLIGI_ESLESTIRME) {
    if (desen.test(dersBasligiMetni) && dersler.length === dersSayisi) return dersler;
  }
  return Array.from({ length: dersSayisi }, (_, i) => `Ders ${i + 1}`);
}

// Bir öğrenci veri satırını (tüm item'ları TEK bir string'e indirgeyip
// boşluğa göre tokenize ederek — bkz. dosya başı notu) gramere göre ayrıştırır.
function satiriAyristir(tokenlar: string[], grammer: Grammer, dersEtiketleri: string[]): AyristirilmisOgrenciSatiri | null {
  if (tokenlar.length < 2) return null;
  const sira = sayiParcala(tokenlar[0]);
  const ogrenciNo = sayiParcala(tokenlar[1]);
  if (sira === null || ogrenciNo === null || !Number.isInteger(sira) || !Number.isInteger(ogrenciNo)) return null;

  // İsim: 2. token'dan başlayıp SINIF_DESENI'ne uyan ilk token'a kadar.
  let sinifIdx = -1;
  for (let i = 2; i < tokenlar.length; i++) {
    if (SINIF_DESENI.test(tokenlar[i])) { sinifIdx = i; break; }
  }
  if (sinifIdx === -1 || sinifIdx === 2) return null; // isim boş olamaz
  const isimHam = tokenlar.slice(2, sinifIdx).join(" ");
  const sinif = tokenlar[sinifIdx];

  const kalanTokenlar = tokenlar.slice(sinifIdx + 1);
  const puanBlokToplamUzunluk = grammer.puanBloklari.reduce((t, s) => t + 1 + s, 0);
  const beklenenTamSayisi = grammer.dersSayisi * 3 + 3 + puanBlokToplamUzunluk;
  const fark = beklenenTamSayisi - kalanTokenlar.length;
  // Bir öğrenci bir derste hiç soru çözmemişse (0 doğru, 0 yanlış) yayınevi
  // o dersin D/Y/N üçlüsünü satırdan TAMAMEN ATIYOR (sıfır basmak yerine) —
  // gerçek veride doğrulandı (bkz. branş_9.pdf, "ERDEM OKUR" satırı, TYT
  // Sosyal eksik). Bu yüzden 1-2 ders bloğu eksik olan satırlar da deneniyor;
  // hangi bloğun eksik olduğu toplam D/Y ile ÇAPRAZ DOĞRULANARAK bulunuyor —
  // yanlış bir kombinasyon toplamı tutturamaz, güvenli şekilde elenir.
  if (fark < 0 || fark % 3 !== 0) return null;
  const eksikBlokSayisi = fark / 3;
  // AYT'de bir öğrenci sadece kendi alanının testini çözüp diğerlerini hiç
  // görmeyebiliyor (bkz. gerçek veri — SÖZ alanı bir öğrencide Matematik VE
  // Fen Bilimleri ikisi birden eksik) — bu yüzden üst sınır sadece "en az 1
  // ders kalsın" (tüm dersler eksikse zaten ayrıştırılacak veri yok).
  if (eksikBlokSayisi >= grammer.dersSayisi) return null;

  const tumDersIndeksleri = Array.from({ length: grammer.dersSayisi }, (_, i) => i);
  const denenecekEksikKumeleri = eksikBlokSayisi === 0 ? [[] as number[]] : kombinasyonlar(tumDersIndeksleri, eksikBlokSayisi);

  const sayilar = kalanTokenlar.map(sayiParcala);
  if (sayilar.some((n) => n === null)) return null;
  const s = sayilar as number[];

  for (const eksikKume of denenecekEksikKumeleri) {
    const mevcutDersIndeksleri = tumDersIndeksleri.filter((i) => !eksikKume.includes(i));

    let idx = 0;
    const dersSonuclariGecici: (AyristirilmisDersSonucu & { dersIdx: number })[] = [];
    for (const dersIdx of mevcutDersIndeksleri) {
      dersSonuclariGecici.push({ dersIdx, ders: dersEtiketleri[dersIdx] ?? `Ders ${dersIdx + 1}`, dogru: s[idx], yanlis: s[idx + 1], net: s[idx + 2] });
      idx += 3;
    }
    for (const dersIdx of eksikKume) {
      dersSonuclariGecici.push({ dersIdx, ders: dersEtiketleri[dersIdx] ?? `Ders ${dersIdx + 1}`, dogru: 0, yanlis: 0, net: 0 });
    }

    const toplam = { dogru: s[idx], yanlis: s[idx + 1], net: s[idx + 2] };
    idx += 3;

    if (eksikBlokSayisi > 0) {
      const dogruToplam = dersSonuclariGecici.reduce((t, d) => t + d.dogru, 0);
      const yanlisToplam = dersSonuclariGecici.reduce((t, d) => t + d.yanlis, 0);
      if (dogruToplam !== toplam.dogru || yanlisToplam !== toplam.yanlis) continue; // bu kombinasyon tutmadı, sıradakini dene
    }

    let puan = s[idx];
    for (let b = 0; b < grammer.puanBloklari.length; b++) {
      if (b === 0) puan = s[idx];
      idx += 1 + grammer.puanBloklari[b];
    }

    const dersSonuclari = dersSonuclariGecici
      .sort((a, b) => a.dersIdx - b.dersIdx)
      .map((d): AyristirilmisDersSonucu => ({ ders: d.ders, dogru: d.dogru, yanlis: d.yanlis, net: d.net }));
    return { sira, ogrenciNo, isimHam, sinif, dersSonuclari, toplam, puan };
  }
  return null;
}

// k elemanlı tüm alt kümeleri (indeks kombinasyonları) üretir — eksik ders
// bloğu ihtimallerini denemek için (dersSayisi küçük, ≤2 eksikle sınırlı,
// maliyet ihmal edilebilir).
function kombinasyonlar(dizi: number[], k: number): number[][] {
  if (k === 0) return [[]];
  if (dizi.length < k) return [];
  const [ilk, ...geri] = dizi;
  const iceren = kombinasyonlar(geri, k - 1).map((c) => [ilk, ...c]);
  const icermeyen = kombinasyonlar(geri, k);
  return [...iceren, ...icermeyen];
}

export async function okulListesiniAyristir(pdfBuffer: Buffer, maxSayfa = 10): Promise<OkulListesiAyristirmaSonucu> {
  const BOS: OkulListesiAyristirmaSonucu = { basarili: false, sinavAdi: null, dersEtiketleri: [], ogrenciler: [] };
  try {
    // KOPYALA, view değil — getDocument() ArrayBuffer'ı detach edebiliyor,
    // aynı Buffer'ı birden fazla çağrıda (OKUL listesi + karne) güvenle
    // kullanabilmek için her çağrı kendi kopyasını almalı.
    const dogruBoyut = Uint8Array.from(pdfBuffer);
    const dogument = await getDocument({ data: dogruBoyut, standardFontDataUrl: undefined, disableFontFace: true }).promise;

    let grammer: Grammer | null = null;
    let dersEtiketleri: string[] = [];
    let sinavAdi: string | null = null;
    const ogrenciler: AyristirilmisOgrenciSatiri[] = [];
    let okulBasligiHicBulunduMu = false;
    let okulBasligiBulundu = false;

    for (let sayfaNo = 1; sayfaNo <= Math.min(maxSayfa, dogument.numPages); sayfaNo++) {
      const sayfa = await dogument.getPage(sayfaNo);
      const icerik = await sayfa.getTextContent();
      const itemlar: KonumluMetin[] = icerik.items
        .filter(metinItemMi)
        .map((it) => ({ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }));
      const satirlar = satirlaraGrupla(itemlar);

      for (let sIdx = 0; sIdx < satirlar.length; sIdx++) {
        const metin = satirMetni(satirlar[sIdx]);
        if (!metin) continue;

        if (OKUL_BASLIK_DESENI.test(metin)) { okulBasligiBulundu = true; okulBasligiHicBulunduMu = true; continue; }
        if (!okulBasligiBulundu) continue;

        // AYT'de "OKUL ... NET LİSTESİ" tek bir bölüm değil — alan başına
        // (SÖZ/SAY/EA) AYRI bir liste var (bkz. rapor güncellemesi). Sınıf
        // bazlı tekrar listesine gelince SADECE o anki bölümü kapatıyoruz;
        // döngü bir sonraki "OKUL ... NET LİSTESİ" başlığını (varsa) aramaya
        // devam ediyor. Aynı öğrenci birden fazla alan listesinde çıkabilir
        // (aşağıda Ö.No+sınıf ile dedup ediliyor).
        if (SINIF_BASLIK_DESENI.test(metin)) { okulBasligiBulundu = false; continue; }

        if (!sinavAdi) {
          // "SINAV ADI" başlık satırından bir sonraki, kurum satırı — ORİJİNAL TYT TG 2 gibi.
          const m = /(?:ORİJİNAL|ORIJINAL|MAARİF|MAARIF)[^\d]*/i.exec(metin);
          if (m) sinavAdi = m[0].trim();
        }

        if (!grammer && DYN_ETIKET_DESENI.test(metin)) {
          grammer = gramerCikar(metin);
          // Ders adları satırı, D/Y/N etiket satırının İKİ üstünde (araya
          // "Sıra Ö.No İsim Sınıf" satırı giriyor) — bkz. örnek çıktı:
          // [4] "TYT Türkçe ..." / [5] "Sıra Ö.No İsim Sınıf" / [6] "D Y N D Y N ...".
          if (grammer && sIdx > 1) {
            dersEtiketleri = dersEtiketleriCikar(satirMetni(satirlar[sIdx - 2]), grammer.dersSayisi);
          }
          continue;
        }

        if (!grammer) continue; // gramer bulunmadan veri satırı ayrıştırılamaz

        const tokenlar = metin.split(" ");
        const satirSonuc = satiriAyristir(tokenlar, grammer, dersEtiketleri);
        if (satirSonuc) ogrenciler.push(satirSonuc);
      }
    }

    if (!okulBasligiHicBulunduMu) return { ...BOS, hata: "\"OKUL ... NET LİSTESİ\" başlığı bulunamadı — bilinmeyen format." };
    if (!grammer) return { ...BOS, hata: "Sütun yapısı (D/Y/N etiket satırı) çözümlenemedi." };
    if (ogrenciler.length === 0) return { ...BOS, hata: "Başlık bulundu ama hiç öğrenci satırı ayrıştırılamadı." };

    // AYT'de aynı öğrenci birden fazla alan listesinde (SÖZ/SAY/EA) tekrar
    // edebilir — ders D/Y/N'leri hepsinde AYNI olmalı (puan türünden
    // bağımsız gerçek bir sonuç), bu yüzden Ö.No+sınıf ile dedup ediliyor,
    // İLK görülen kayıt tutuluyor.
    const gorulenAnahtarlar = new Set<string>();
    const tekilOgrenciler = ogrenciler.filter((o) => {
      const anahtar = `${o.ogrenciNo}|${o.sinif}|${o.isimHam}`;
      if (gorulenAnahtarlar.has(anahtar)) return false;
      gorulenAnahtarlar.add(anahtar);
      return true;
    });

    return { basarili: true, sinavAdi, dersEtiketleri, ogrenciler: tekilOgrenciler };
  } catch (e) {
    return { ...BOS, hata: `PDF ayrıştırma hatası: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ============ Faz P2: karne (kişisel sonuç belgesi) özet tablosu ============
//
// OKUL listesi (Faz P0) sadece BİRLEŞİK ders sütunları verir (TYT Sosyal,
// TYT Fen — bkz. rapor, Bulgu 1). Her öğrencinin kendi "karne" sayfası
// ("SONUÇ BELGESİ" / kişisel "DERSLERE GÖRE ANALİZ") ise AYNI verinin 9
// AYRI dersle (TYT_DERSLERI ile örtüşen) kırılımını veriyor — rapor,
// Bulgu 6. Karne sayfası genelde İKİ SÜTUNLU: solda bu özet tablo, sağda
// çok daha ayrıntılı konu-kazanım dökümü (Faz P4'ün konusu, burada
// OKUNMUYOR). İki sütun aynı y-koordinatlarını paylaştığından, sütun
// sınırı SABİT bir x değeri değil — özet tablonun KENDİ başlık satırından
// (Ders/Soru/Doğru/Yanlış/Net) dinamik olarak türetiliyor (LİMİT şablonu
// içinde bile TYT ve BRANŞ karnelerinin x düzeni FARKLI çıktı — gerçek
// veriyle doğrulandı).
//
// DURUM (25.08.2026): TYT/BRANŞ için gerçek 235 öğrenciye (tyt.pdf 68,
// branş_9.pdf 95, branş_10.pdf 72) karşı toplu test edildi —
// karneyiTytDerslerineEslestir'in ürettiği granüler ders toplamı, OKUL
// listesindeki BAĞIMSIZ toplamla 233/233 bulunan karnede BİREBİR eşleşti
// (branş_10'da 2 öğrencinin karne sayfası bulunamadı — veri kaybı değil,
// bu öğrenciler için sadece granüler veri üretilmiyor). AYT'nin karne
// taksonomisi ("Felsefe" vs "Felsefe Grubu" vs "Felsefe (Seçmeli)" —
// hangisi gerçek AYT_DERSLERI.SOZ'a karşılık geliyor) netleştirilemediği
// için AYT bu eşleştirmeye BİLİNÇLİ OLARAK DAHİL EDİLMEDİ (bkz.
// karneyiTytDerslerineEslestir'in kendi notu) — AYT için mevcut (Claude'un
// ürettiği birleşik 4 ders) yol aynen kullanılmaya devam ediyor.
// ÇAĞIRAN TARAF HER ZAMAN karne toplamını OKUL listesinin bağımsız
// toplamıyla ÇAPRAZ DOĞRULAMALI — tutmuyorsa granüler veriyi
// KULLANMAMALI (aggregate'e düş). deneme-pdf-actions.ts'e (TYT/BRANŞ için)
// BAĞLANDI — bkz. rapor, Faz P2.

export interface KarneDersSonucu {
  ders: string;
  soru: number;
  dogru: number;
  yanlis: number;
  net: number;
  // Bu satır, hemen ÜSTÜNDEKİ ardışık satırların ARA TOPLAMI mı? (örn.
  // TYT'de "TYT Sosyal", AYT'de "Sosyal-2"/"Matematik"/"Fen Bilimleri").
  // İSME göre DEĞİL, YAPISAL olarak tespit ediliyor (bkz. altToplamlariIsaretle)
  // — TYT/BRANŞ ve AYT'nin alt toplam isimlendirmesi FARKLI olduğu gerçek
  // veriyle doğrulandı (AYT'de "TYT " ön eki hiç yok), isim deseni
  // güvenilir değil. TYT_DERSLERI'ne yazarken bu satırlar ATLANMALI.
  altToplamMi: boolean;
}

export interface KarneAyristirmaSonucu {
  basarili: boolean;
  hata?: string;
  bulunanSayfa: number | null;
  // Ara toplam satırları DA DAHİL (altToplamMi ile işaretli) — çağıran
  // taraf TYT_DERSLERI'ne yazarken bunları filtrelemeli.
  dersSonuclari: KarneDersSonucu[];
}

const KARNE_OZET_HEADER_DESENI = /^Ders(\s*\/\s*Test)?$/;

// Bir satırın, kendinden ÖNCEKİ ardışık satırların (son ara toplamdan bu
// yana) doğru+yanlış TOPLAMINA birebir eşit olup olmadığına bakarak ara
// toplamları YAPISAL olarak işaretler. İsim bazlı bir liste yerine bu
// yöntem seçildi çünkü gerçek veride TYT/BRANŞ "TYT Sosyal" derken AYT
// "Sosyal-2"/"Matematik"/"Fen Bilimleri" kullanıyor — tek bir isim deseni
// ikisini de güvenilir yakalayamıyor.
// DİKKAT: satırların HER ZAMAN bir alt toplamla "kapanması" gerekmiyor —
// örn. TYT karnesinde "Türkçe" tek başına bir grup ama ONU kapatan ayrı
// bir "TYT Türkçe" alt toplam satırı YOK, oysa hemen ardından gelen
// "Tarih-1..Felsefe (Seçmeli)" 5 satırı "TYT Sosyal" ile kapanıyor. Bu
// yüzden GLOBAL bir "son kapanıştan bu yana" sayacı YANLIŞ — o yaklaşım
// Türkçe'yi de yanlışlıkla Sosyal grubuna dahil ediyordu (gerçek veriyle
// bulundu). Bunun yerine her satır İÇİN, hemen ÖNCESİNDEKİ artan
// boyuttaki pencereleri (k=2,3,...) DENEYİP en küçük eşleşen k'yı kabul
// ediyoruz — global durum yok, sadece yerel pencere karşılaştırması.
// k=1'DEN BAŞLAMIYOR: küçük derslerin (örn. 5 sorulu Tarih-1/Coğrafya-1/
// Felsefe/Din K.) doğru/yanlış sayıları RASTLANTISAL olarak birbirine eşit
// çıkabiliyor (gerçek veride yakalandı — "Coğrafya-1" bir üstündeki
// "Tarih-1" ile aynı D/Y'ye sahip olunca yanlışlıkla alt toplam
// sanılıyordu). Gerçek bir alt toplam HER ZAMAN ≥2 satırı topluyor
// (Sosyal:5, Matematik:2, Fen:3 vb.) — k=1'i tamamen dışlamak bu riski
// pratikte sıfırlıyor.
const ALT_TOPLAM_MAKS_PENCERE = 8;

// "(Seçmeli)" satırları (örn. "Felsefe (Seçmeli)") GRUPLAMA HESABINA HİÇ
// KATILMIYOR — gerçek veriyle bulundu: TYT Sosyal'in soru/D/Y toplamı bu
// satırı SAYMIYOR (görüntüleniyor ama alt toplamın bir parçası değil).
// Pencere hesabına dahil edilirse aradaki bu "gösterge" satır ardışıklığı
// bozup gerçek grubu (örn. Tarih-1+Coğrafya-1+Felsefe+Din K.) TYT Sosyal
// ile eşleştirmeyi engelliyor. Bu yüzden önce bu satırlar ÇIKARILIP
// pencere hesabı SADECE gerçek/gruplanan satırlar üzerinden yapılıyor,
// sonra orijinal sırayla (altToplamMi=false olarak) geri ekleniyor.
const SECMELI_DESENI = /\(Seçmeli\)$/;

function altToplamlariIsaretle(satirlar: Omit<KarneDersSonucu, "altToplamMi">[]): KarneDersSonucu[] {
  const secmeliIndeksleri = new Set<number>();
  satirlar.forEach((s, i) => { if (SECMELI_DESENI.test(s.ders)) secmeliIndeksleri.add(i); });
  const gruplanan = satirlar.filter((_, i) => !secmeliIndeksleri.has(i)).map((s) => ({ ...s, altToplamMi: false }));

  for (let i = 1; i < gruplanan.length; i++) {
    for (let k = 2; k <= Math.min(ALT_TOPLAM_MAKS_PENCERE, i); k++) {
      let grupDogru = 0;
      let grupYanlis = 0;
      let pencerdeAltToplamVar = false;
      for (let j = i - k; j < i; j++) {
        if (gruplanan[j].altToplamMi) { pencerdeAltToplamVar = true; break; } // iç içe/çift sayım riskine karşı
        grupDogru += gruplanan[j].dogru;
        grupYanlis += gruplanan[j].yanlis;
      }
      if (pencerdeAltToplamVar) continue;
      if (gruplanan[i].dogru === grupDogru && gruplanan[i].yanlis === grupYanlis) {
        gruplanan[i].altToplamMi = true;
        break; // en küçük eşleşen pencerede dur
      }
    }
  }

  let gIdx = 0;
  return satirlar.map((s, i) => (secmeliIndeksleri.has(i) ? { ...s, altToplamMi: false } : gruplanan[gIdx++]));
}

interface KonumluSatirGrubu { y: number; itemlar: KonumluMetin[]; }

function konumluSatirlaraGrupla(itemlar: KonumluMetin[]): KonumluSatirGrubu[] {
  const YAKINLIK = 1.5;
  const gruplar: KonumluSatirGrubu[] = [];
  for (const it of itemlar) {
    if (!it.str.trim()) continue;
    let grup = gruplar.find((g) => Math.abs(g.y - it.y) <= YAKINLIK);
    if (!grup) { grup = { y: it.y, itemlar: [] }; gruplar.push(grup); }
    grup.itemlar.push(it);
  }
  gruplar.sort((a, b) => b.y - a.y);
  for (const g of gruplar) g.itemlar.sort((a, b) => a.x - b.x);
  return gruplar;
}

// Belirtilen sayfa aralığında, hem HAM isim hem öğrenci no'nun AYNI
// satırda göründüğü BİR KARNE ÖZETİ TABLOSUYLA birlikte bulunduğu bir
// sayfa arar. BİLİNÇLİ OLARAK bir başlık metni ("SONUÇ BELGESİ" vb.)
// aranmıyor — gerçek veriyle doğrulandı: TYT karnesi bunu kullanıyor,
// BRANŞ karnesi ("9.SINIF MAARİF SÜREÇ DEĞERLENDİRME" — OKUL listesiyle
// AYNI başlık) kullanmıyor. Bunun yerine "Ders/Soru/Doğru/Yanlış/Net"
// özet tablosu başlığının AYNI SAYFADA olması şartı aranıyor — bu hem
// karne sayfasını doğru tanımlıyor hem de OKUL LİSTESİ sayfasıyla
// (orada da isim+no birlikte geçer ama bu özet tablosu YOK) karışmasını
// engelliyor.
async function karneSayfasiniBul(
  dogument: Awaited<ReturnType<typeof getDocument>["promise"]>,
  hedefIsim: string, hedefOgrenciNo: number, ilkSayfa: number, sonSayfa: number,
): Promise<number | null> {
  const hedefIsimTrim = hedefIsim.trim();
  const hedefNoStr = String(hedefOgrenciNo);
  for (let p = ilkSayfa; p <= Math.min(sonSayfa, dogument.numPages); p++) {
    const sayfa = await dogument.getPage(p);
    const icerik = await sayfa.getTextContent();
    const itemlar: KonumluMetin[] = icerik.items.filter(metinItemMi)
      .map((it) => ({ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }));
    if (!itemlar.some((it) => KARNE_OZET_HEADER_DESENI.test(it.str.trim()) && it.x < 60)) continue;

    const satirlar = konumluSatirlaraGrupla(itemlar);
    const isimSatiri = satirlar.find((s) => s.itemlar.some((it) => it.str.trim() === hedefIsimTrim));
    if (isimSatiri && isimSatiri.itemlar.some((it) => it.str.trim() === hedefNoStr)) {
      return p;
    }
  }
  return null;
}

// Karne sayfasındaki özet tablonun HEADER satırını (Ders/Soru/Doğru/
// Yanlış/Net) bulup her sütunun x konumunu döndürür — sonraki satırlarda
// her sayısal değer EN YAKIN sütuna atanır (sabit x eşiği yerine, bkz.
// dosya başı notu: TYT/BRANŞ karnelerinde bu x'ler FARKLI).
function karneOzetSutunlariniBul(satirlar: KonumluSatirGrubu[]): { headerY: number; sutunlar: { ad: string; x: number }[] } | null {
  for (const satir of satirlar) {
    const dersItem = satir.itemlar.find((it) => KARNE_OZET_HEADER_DESENI.test(it.str.trim()) && it.x < 60);
    if (!dersItem) continue;
    const soruItem = satir.itemlar.find((it) => it.str.trim() === "Soru");
    const dogruItem = satir.itemlar.find((it) => it.str.trim() === "Doğru");
    const yanlisItem = satir.itemlar.find((it) => it.str.trim() === "Yanlış");
    const netItem = satir.itemlar.find((it) => it.str.trim() === "Net");
    if (!soruItem || !dogruItem || !yanlisItem || !netItem) continue;
    return {
      headerY: satir.y,
      sutunlar: [
        { ad: "soru", x: soruItem.x },
        { ad: "dogru", x: dogruItem.x },
        { ad: "yanlis", x: yanlisItem.x },
        { ad: "net", x: netItem.x },
      ],
    };
  }
  return null;
}

// pdfjs-dist'te virgüllü ondalıkların bazen "5" gibi tam sayı, bazen
// "18,75" gibi virgüllü geldiği görüldü (gerçek veriyle) — ikisi de kabul.
function karneSayisiParcala(token: string): number | null {
  if (!/^-?\d+(?:,\d+)?$/.test(token.trim())) return null;
  const n = Number(token.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Verilen satır grubundan (bir karne sayfasının item'ları) özet tabloyu
// ayrıştırır — hem tekil arama (karneOzetiniAyristir) hem toplu indeksleme
// (tumKarneleriIndeksle) BU ORTAK fonksiyonu kullanıyor, mantık TEK yerde.
function satirlardanOzetCikar(satirlar: KonumluSatirGrubu[]): KarneDersSonucu[] | null {
  const sutunBilgisi = karneOzetSutunlariniBul(satirlar);
  if (!sutunBilgisi) return null;

  const netX = sutunBilgisi.sutunlar.find((s) => s.ad === "net")!.x;
  // TYT karnesinde Net değeri ile hemen sonraki Başarı% değeri arasında
  // SADECE ~30 birimlik boşluk var (gerçek veriyle doğrulandı) — geniş
  // bir marj Başarı%'yi yanlışlıkla 5. "sayısal" sütun olarak içeri
  // sızdırıp satırı reddettiriyordu (tam 4 sütun bekleniyor). Dar bir
  // marj (15) hem bu riski gideriyor hem BRANŞ karnesinin çok daha
  // geniş (~64 birim) boşluğunda sorun çıkarmıyor.
  const kesmeX = netX + 15;

  const hamSatirlar: Omit<KarneDersSonucu, "altToplamMi">[] = [];
  for (const satir of satirlar) {
    if (satir.y >= sutunBilgisi.headerY) continue; // header'ın üstü/aynısı — atla
    const dersItemlari = satir.itemlar.filter((it) => it.x < sutunBilgisi.sutunlar[0].x - 15);
    const sayisalItemlari = satir.itemlar.filter((it) => it.x >= sutunBilgisi.sutunlar[0].x - 15 && it.x <= kesmeX);
    if (dersItemlari.length === 0 || sayisalItemlari.length !== 4) continue; // tam 4 sayısal sütun bekleniyor

    const degerler: Record<string, number> = {};
    let hepsiSayi = true;
    for (const it of sayisalItemlari) {
      const enYakinSutun = sutunBilgisi.sutunlar.reduce((a, b) => (Math.abs(b.x - it.x) < Math.abs(a.x - it.x) ? b : a));
      const deger = karneSayisiParcala(it.str);
      if (deger === null) { hepsiSayi = false; break; }
      degerler[enYakinSutun.ad] = deger;
    }
    if (!hepsiSayi || degerler.soru === undefined || degerler.dogru === undefined || degerler.yanlis === undefined || degerler.net === undefined) continue;

    const ders = dersItemlari.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
    if (!ders || /^(Toplam|Katılımlar)/i.test(ders)) continue;

    hamSatirlar.push({ ders, soru: degerler.soru, dogru: degerler.dogru, yanlis: degerler.yanlis, net: degerler.net });
  }

  if (hamSatirlar.length === 0) return null;
  return altToplamlariIsaretle(hamSatirlar);
}

export async function karneOzetiniAyristir(
  pdfBuffer: Buffer, hedefIsim: string, hedefOgrenciNo: number,
  aramaBaslangicSayfa = 1, aramaBitisSayfa = 400,
): Promise<KarneAyristirmaSonucu> {
  const BOS: KarneAyristirmaSonucu = { basarili: false, bulunanSayfa: null, dersSonuclari: [] };
  try {
    // KOPYALA, view değil — getDocument() ArrayBuffer'ı detach edebiliyor,
    // aynı Buffer'ı birden fazla çağrıda (OKUL listesi + karne) güvenle
    // kullanabilmek için her çağrı kendi kopyasını almalı.
    const dogruBoyut = Uint8Array.from(pdfBuffer);
    const dogument = await getDocument({ data: dogruBoyut, standardFontDataUrl: undefined, disableFontFace: true }).promise;

    const sayfaNo = await karneSayfasiniBul(dogument, hedefIsim, hedefOgrenciNo, aramaBaslangicSayfa, aramaBitisSayfa);
    if (sayfaNo === null) return { ...BOS, hata: `"${hedefIsim}" (Ö.No ${hedefOgrenciNo}) için karne sayfası bulunamadı.` };

    const sayfa = await dogument.getPage(sayfaNo);
    const icerik = await sayfa.getTextContent();
    const itemlar: KonumluMetin[] = icerik.items.filter(metinItemMi)
      .map((it) => ({ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }));
    const satirlar = konumluSatirlaraGrupla(itemlar);

    const dersSonuclari = satirlardanOzetCikar(satirlar);
    if (!dersSonuclari) return { ...BOS, bulunanSayfa: sayfaNo, hata: "Karne sayfası bulundu ama özet tablo çözümlenemedi." };
    return { basarili: true, bulunanSayfa: sayfaNo, dersSonuclari };
  } catch (e) {
    return { ...BOS, hata: `Karne ayrıştırma hatası: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export interface KarneIndeksGirisi {
  isimHam: string;
  ogrenciNo: number;
  sayfaNo: number;
  dersSonuclari: KarneDersSonucu[];
}

// karneOzetiniAyristir'in aksine HER öğrenci için baştan sona ayrı bir
// sayfa taraması yapmıyor — PDF'i TEK GEÇİŞTE okuyup her karne sayfasında
// hangi hedefin (P0'ın OKUL listesinden gelen isim+no listesi) karşılığı
// olduğunu kontrol ediyor. Büyük öğrenci sayılarında (95+ gibi) O(sayfa)
// karmaşıklığı — O(öğrenci×sayfa) yerine — çok daha hızlı.
export async function tumKarneleriIndeksle(
  pdfBuffer: Buffer,
  hedefler: { isimHam: string; ogrenciNo: number }[],
  ilkSayfa = 1, sonSayfa = 500,
): Promise<Map<string, KarneIndeksGirisi>> {
  const sonuc = new Map<string, KarneIndeksGirisi>();
  const hedefMap = new Map<string, { isimHam: string; ogrenciNo: number }>();
  for (const h of hedefler) hedefMap.set(h.isimHam.trim(), h);
  if (hedefMap.size === 0) return sonuc;

  try {
    const dogruBoyut = Uint8Array.from(pdfBuffer);
    const dogument = await getDocument({ data: dogruBoyut, standardFontDataUrl: undefined, disableFontFace: true }).promise;

    for (let p = ilkSayfa; p <= Math.min(sonSayfa, dogument.numPages) && hedefMap.size > 0; p++) {
      const sayfa = await dogument.getPage(p);
      const icerik = await sayfa.getTextContent();
      const itemlar: KonumluMetin[] = icerik.items.filter(metinItemMi)
        .map((it) => ({ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }));
      if (!itemlar.some((it) => KARNE_OZET_HEADER_DESENI.test(it.str.trim()) && it.x < 60)) continue;

      const satirlar = konumluSatirlaraGrupla(itemlar);
      let eslesenHedef: { isimHam: string; ogrenciNo: number } | null = null;
      for (const satir of satirlar) {
        const isimBulundu = satir.itemlar.find((it) => hedefMap.has(it.str.trim()));
        if (!isimBulundu) continue;
        const aday = hedefMap.get(isimBulundu.str.trim())!;
        if (satir.itemlar.some((it) => it.str.trim() === String(aday.ogrenciNo))) { eslesenHedef = aday; break; }
      }
      if (!eslesenHedef) continue;

      const dersSonuclari = satirlardanOzetCikar(satirlar);
      if (!dersSonuclari) continue;

      sonuc.set(`${eslesenHedef.isimHam}|${eslesenHedef.ogrenciNo}`, {
        isimHam: eslesenHedef.isimHam, ogrenciNo: eslesenHedef.ogrenciNo, dersSonuclari, sayfaNo: p,
      });
      hedefMap.delete(eslesenHedef.isimHam);
    }
  } catch {
    // Sessizce ne bulunduysa onunla dön — kısmi sonuç, hiç sonuçtan iyidir
    // (çağıran taraf zaten her öğrenci için ayrı ayrı çapraz doğruluyor).
  }
  return sonuc;
}

// ============ Karne ders adlarını TYT_DERSLERI'ne eşleştirme ============
//
// BİLİNÇLİ OLARAK SADECE TYT/BRANŞ için — gerçek veriyle 44/44 doğrulandı,
// eşleştirme kuralları net. AYT'nin karne ders taksonomisi ("Felsefe" vs
// "Felsefe Grubu" vs "Felsefe (Seçmeli)" — hangisi AYT_DERSLERI.SOZ'daki
// "Felsefe Grubu"na karşılık geliyor, hangisi hariç tutulmalı) TEK bir
// örnek öğrenciyle (ve o öğrencide bu alanların hepsi sıfır olduğu için)
// netleştirilemedi — bu yüzden AYT için granüler yazma YAPILMIYOR, mevcut
// (Claude'un ürettiği birleşik 4 ders) yol aynen kullanılıyor.
const KARNE_DERS_TYT_ESLESTIRME: Record<string, string> = {
  "Türkçe": "Türkçe",
  "Tarih-1": "Tarih",
  "Coğrafya-1": "Coğrafya",
  "Felsefe": "Felsefe",
  "Din Kül. ve Ahl. Bil.": "Din Kültürü",
  "Matematik-1": "Matematik",
  "Geometri": "Matematik",
  "Fizik": "Fizik",
  "Kimya": "Kimya",
  "Biyoloji": "Biyoloji",
};

export interface GranulerDersSonucu { ders: string; dogru: number; yanlis: number; }

// Karnenin GRANÜLER (alt toplam olmayan) satırlarını TYT_DERSLERI adlarına
// eşleştirip aynı adı paylaşanları (Matematik-1 + Geometri → "Matematik")
// TOPLAR. Eşleşmeyen/beklenmeyen bir ders adıyla karşılaşırsa (yeni bir
// şablon varyasyonu, "Felsefe (Seçmeli)" gibi bilinçli hariç tutulanlar
// DIŞINDA) — GÜVENLİ TARAFTA KALIP null döner, çağıran taraf o zaman
// granüler veriyi KULLANMAMALI (aggregate'e düşmeli). Sessizce eksik/
// yanlış veri üretmektense hiç üretmemek tercih edildi.
// TYT/BRANŞ şablonunda alt toplam satırları HER ZAMAN bu üç isimden
// birini taşıyor (gerçek veride tutarlı) — yapısal tespit (altToplamMi),
// küçük (5 sorulu) derslerin D/Y toplamları RASTLANTISAL olarak birbirini
// tutunca (örn. Tarih-1+Coğrafya-1 == Felsefe'nin kendi D/Y'si, gerçek
// veride yakalandı) yanılabiliyor — bu yüzden BU ÖZEL/BİLİNEN şablon için
// isme göre de doğrudan (yapısal tespitten BAĞIMSIZ) hariç tutuluyor.
const BILINEN_ALT_TOPLAM_ISIMLERI = new Set(["TYT Sosyal", "TYT Matematik", "TYT Fen"]);

export function karneyiTytDerslerineEslestir(dersSonuclari: KarneDersSonucu[]): GranulerDersSonucu[] | null {
  const toplamlar = new Map<string, { dogru: number; yanlis: number }>();
  for (const satir of dersSonuclari) {
    // DİKKAT: satir.altToplamMi (yapısal/genel tespit) BİLEREK burada
    // KULLANILMIYOR — küçük (5 sorulu) dersler arasında rastlantısal D/Y
    // eşitlikleri (örn. Tarih-1+Coğrafya-1 == Felsefe'nin kendi D/Y'si,
    // gerçek veride yakalandı) yapısal tespiti yanıltıp GERÇEK bir dersi
    // yanlışlıkla alt toplam sanabiliyor. Bunun yerine bu İYİ BİLİNEN
    // şablon için SADECE isim beyaz/kara listesi kullanılıyor — 235
    // gerçek öğrenciye karşı doğrulanmış, kapalı bir isim kümesi.
    if (BILINEN_ALT_TOPLAM_ISIMLERI.has(satir.ders)) continue;
    if (/\(Seçmeli\)$/.test(satir.ders)) continue; // bilinçli hariç — bkz. Bulgu (TYT Sosyal'e dahil değil
    const hedefDers = KARNE_DERS_TYT_ESLESTIRME[satir.ders];
    if (!hedefDers) return null; // bilinmeyen ders adı — güvenli tarafta kal
    const mevcut = toplamlar.get(hedefDers) ?? { dogru: 0, yanlis: 0 };
    mevcut.dogru += satir.dogru;
    mevcut.yanlis += satir.yanlis;
    toplamlar.set(hedefDers, mevcut);
  }
  if (toplamlar.size === 0) return null;
  return [...toplamlar.entries()].map(([ders, v]) => ({ ders, dogru: v.dogru, yanlis: v.yanlis }));
}

// ============ Faz P4: karnenin kazanım (konu bazlı) dökümü ============
//
// Her ders/alt-ders için MÜFREDAT KAZANIMI bazında bir S(oru)/D(oğru)/
// Y(anlış)/B(aşarı)% dökümü. Örnek satır: "Metne Sözcük Yerleştirme 1 1 0
// 100". Ders/alt-ders başlıkları "<ad> S D Y B%" deseniyle geliyor (örn.
// "Tarih-1 S D Y B%") — bir sonraki başlığa kadar olan satırlar o derse
// ait kazanımlar.
//
// GERÇEK VERİYLE İKİ FARKLI FİZİKSEL SAYFA YAPISI bulundu:
//  - TYT: özet tablo (sol) + kazanım dökümü (sağ, TEK sütun) AYNI SAYFADA
//    (tyt.pdf sayfa 72, MİCHAEL J ACKSON). karneOzetSutunlariniBul bu
//    sayfada başarıyla özet tabloyu bulur — kazanım sağ sütunu Net
//    sütunundan +50 birim sonra başlar (bkz. satirlardanOzetCikar'daki
//    +15 marjıyla aynı felsefe, sadece daha geniş).
//  - BRANŞ: özet tablo TAMAMEN AYRI bir sayfada (karneSayfasiniBul'un
//    bulduğu sayfa) — kazanım dökümü BAŞKA bir sayfada, YAN YANA İKİ
//    SÜTUN halinde (örn. sol=Türkçe/Tarih-1/Coğrafya-1/Din Kül., sağ=
//    Matematik-1/Fizik/Kimya/Biyoloji — branş_9.pdf sayfa 62, ASYA
//    GÜLERYÜZ). Bu sayfada karneOzetSutunlariniBul BAŞARISIZ olur (özet
//    tablo yok) — bu, TYT-tipi tek-sütun mantığından BRANŞ-tipi
//    çok-sütunlu mantığa geçiş sinyali olarak kullanılıyor.
export interface KazanimSatiri {
  ders: string; // örn. "Türkçe", "Tarih-1", "Matematik-1", "Fizik" — karnenin kendi alt-ders adı
  kazanimMetni: string;
  soru: number;
  dogru: number;
  yanlis: number;
}

const KAZANIM_DERS_BASLIK_DESENI = /^(.+?)\s+S\s+D\s+Y\s+B%$/;

// Bir satırın (boşluk hariç) item'larından oluşan tek bir "bölüm" (segment)
// — TYT'de her satırın tamamı tek segment, BRANŞ'ta iki (sol/sağ) segmente
// bölünür — bkz. cokSutunluKazanimlariCikar.
interface KazanimSegmenti { itemlar: KonumluMetin[]; }

// Segment listesinden (her biri BİR satırın BİR sütununa ait item'ları)
// kazanımları çıkarır — ders başlığı ("<ad> S D Y B%") görülünce
// mevcutDers güncellenir, sonraki satırlar (sondan 4 tam sayı ile biten)
// o derse kazanım olarak eklenir. Segment listesi TEK bir sütuna ait
// olmalı — çok sütunlu sayfalarda her sütun için AYRI çağrılır (her
// sütunun kendi ders bağlamı var, karışmamalı).
function segmentlerdenKazanimlariCikar(segmentler: KazanimSegmenti[]): KazanimSatiri[] {
  const kazanimlar: KazanimSatiri[] = [];
  let mevcutDers: string | null = null;
  for (const seg of segmentler) {
    if (seg.itemlar.length === 0) continue;
    const metin = seg.itemlar.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
    if (!metin) continue;

    const baslikEslesme = KAZANIM_DERS_BASLIK_DESENI.exec(metin);
    if (baslikEslesme) { mevcutDers = baslikEslesme[1].trim(); continue; }
    if (!mevcutDers) continue; // henüz bir ders başlığı görülmedi (üst bilgi satırları vb.)

    const tokenlar = metin.split(" ");
    if (tokenlar.length < 5) continue; // en az 1 metin token'ı + 4 sayı
    const son4 = tokenlar.slice(-4);
    if (!son4.every((t) => /^-?\d+$/.test(t))) continue; // S/D/Y/B% hepsi tam sayı olmalı
    const [soru, dogru, yanlis] = son4.slice(0, 3).map(Number);
    const kazanimMetni = tokenlar.slice(0, -4).join(" ").trim();
    if (!kazanimMetni) continue;

    kazanimlar.push({ ders: mevcutDers, kazanimMetni, soru, dogru, yanlis });
  }
  return kazanimlar;
}

// TYT-tipi: özet tablo + kazanım AYNI sayfada, kazanım TEK sağ sütunda —
// eşikX'in SAĞINDAKİ item'lar kazanıma ait (özet tablo solda kalır).
function tekSutunluKazanimlariCikar(satirlar: KonumluSatirGrubu[], esikX: number): KazanimSatiri[] {
  const segmentler: KazanimSegmenti[] = satirlar.map((s) => ({ itemlar: s.itemlar.filter((it) => it.x >= esikX) }));
  return segmentlerdenKazanimlariCikar(segmentler);
}

// Bir satırın item'ları (boşluk hariç) içinde ardışık "S","D","Y","B%"
// dörtlüsünü arar — ders adını, dörtlünün HEMEN ÖNCESİNDEN GERİYE DOĞRU
// yürüyerek kurar. BRANŞ'ın kazanım sayfasında bir satırda İKİ blok (yan
// yana, sol+sağ ders) olabilir; TYT tipi kazanım satırlarında (tek
// sütun) en fazla bir blok olur.
// adBaslangicX: ders adının başladığı x (sütunun SOL sınırına yakın).
// numarikBitisX: "B%" item'ının x'i — bu bloğun S/D/Y/B% sayı grubunun
// (dolayısıyla sütunun asıl içeriğinin) en SAĞ ucu — sütun sınırını bunun
// üzerinden çizmek gerekiyor, ad başlangıcı üzerinden DEĞİL (bkz.
// cokSutunluKazanimlariCikar'daki not).
//
// GERİYE DOĞRU YÜRÜME (blok başlangıcından itibaren TÜM önceki item'ları
// almak YERİNE) BİLİNÇLİ: gerçek veride bir satırda SOL sütun bir ders
// başlığı TAŞIMAZKEN (ör. bir kazanım gövde satırı) SAĞ sütun kendi
// başlığını taşıyabiliyor ("Metinlerden hareketle çıkarımlar yapar. 1 1
// 0 100 Fizik S D Y B%") — bu durumda SOL'daki alakasız metin+sayılar
// SAĞ'ın ders adına yanlışlıkla karışıp adBaslangicX'i SOL sütunun
// x'ine düşürüyor, bu da kümeleme sınırını bozuyordu (gerçek veride
// yakalandı, branş_9.pdf). Ders adı gerçek veride HER ZAMAN S'ye yakın
// (~215-240 birim) olduğundan, hem bir MESAFE ÜST SINIRI hem de SAYISAL
// bir token'da (asla gerçek ders adının parçası olmaz) durma kuralı
// ile bu karışma engelleniyor. Ayrıca ÖNCEKİ blok bulunmuşsa ondan
// GERİ gitmiyor (bitişik iki başlığın birbirine karışmasını önler).
const MAKS_BASLIK_GENISLIGI = 260;
const SAYISAL_TOKEN_DESENI = /^-?\d+(?:,\d+)?%?$/;

function satirdakiBaslikBloklariniBul(
  itemlarBosluksuz: KonumluMetin[],
): { dersAdi: string; adBaslangicX: number; numarikBitisX: number }[] {
  const bloklar: { dersAdi: string; adBaslangicX: number; numarikBitisX: number }[] = [];
  let blokBaslangic = 0;
  for (let i = 0; i <= itemlarBosluksuz.length - 4; i++) {
    if (
      itemlarBosluksuz[i].str.trim() === "S" && itemlarBosluksuz[i + 1].str.trim() === "D" &&
      itemlarBosluksuz[i + 2].str.trim() === "Y" && itemlarBosluksuz[i + 3].str.trim() === "B%"
    ) {
      const sX = itemlarBosluksuz[i].x;
      let baslangicIdx = i;
      for (let j = i - 1; j >= blokBaslangic; j--) {
        if (sX - itemlarBosluksuz[j].x > MAKS_BASLIK_GENISLIGI) break;
        if (SAYISAL_TOKEN_DESENI.test(itemlarBosluksuz[j].str.trim())) break;
        baslangicIdx = j;
      }
      const adItemlari = itemlarBosluksuz.slice(baslangicIdx, i);
      if (adItemlari.length > 0) {
        bloklar.push({
          dersAdi: adItemlari.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim(),
          adBaslangicX: adItemlari[0].x,
          numarikBitisX: itemlarBosluksuz[i + 3].x,
        });
      }
      blokBaslangic = i + 4;
      i += 3; // dörtlüyü atla
    }
  }
  return bloklar;
}

// Başlık ADI x'lerini kümelemek için eşik — sol sütunun ders adları
// (~x=26..75) ile sağ sütunun ders adları (~x=303..326) arasında geniş
// bir boşluk var; bu, kaç sütun olduğunu (1 mi 2 mi) tespit etmeye yeter
// (kesin sütun SINIRINI çizmek için AYRICA aşağıdaki numarikBitisX
// kullanılıyor — bkz. cokSutunluKazanimlariCikar).
const SUTUN_KUMELEME_ESIGI = 80;

// Sütun sınırı marjı — bir sütunun kendi S/D/Y/B% sayı bloğunun sağ ucu
// (numarikBitisX, örn. "100" gibi 3 haneli bir değerle biraz taşabilir)
// ile bir sonraki sütunun ders adı başlangıcı arasına küçük bir pay
// bırakır (netX+15 marjıyla aynı felsefe, bkz. satirlardanOzetCikar).
const SUTUN_SINIRI_MARJI = 10;

// BRANŞ-tipi: özet tablo bu sayfada YOK, kazanım dökümü YAN YANA (genelde
// 2) sütun halinde. Sütun sınırlarını sayfanın KENDİ başlık satırlarından
// (header-driven, sabit x DEĞİL) türetir. DİKKAT: sınır, ders ADI
// başlangıçlarının ortanoktası DEĞİL — bu, sol sütunun kendi S/D/Y/B%
// sayı değerlerini (ad'dan ~230 birim SAĞDA) yanlışlıkla sağ sütuna
// kaydırır (gerçek veride yakalandı). Bunun yerine: her sütun kümesinin
// EN SAĞ numarik ucu (numarikBitisX) ile BİR SONRAKİ kümenin EN SOL ad
// başlangıcı arasına sınır çizilir.
function cokSutunluKazanimlariCikar(satirlar: KonumluSatirGrubu[]): KazanimSatiri[] | null {
  const tumBloklar: { adBaslangicX: number; numarikBitisX: number }[] = [];
  for (const satir of satirlar) {
    const bosluksuz = satir.itemlar.filter((it) => it.str.trim() !== "");
    tumBloklar.push(...satirdakiBaslikBloklariniBul(bosluksuz));
  }
  if (tumBloklar.length === 0) return null; // bu sayfada hiç kazanım başlığı yok — kazanım sayfası değil

  // Ad başlangıç x'lerine göre kümele (kaç sütun var, tespit için).
  const siraliBloklar = [...tumBloklar].sort((a, b) => a.adBaslangicX - b.adBaslangicX);
  const kumeler: { adMin: number; bMax: number }[] = [];
  for (const b of siraliBloklar) {
    const sonKume = kumeler[kumeler.length - 1];
    if (sonKume && b.adBaslangicX - sonKume.adMin <= SUTUN_KUMELEME_ESIGI) {
      sonKume.bMax = Math.max(sonKume.bMax, b.numarikBitisX);
    } else {
      kumeler.push({ adMin: b.adBaslangicX, bMax: b.numarikBitisX });
    }
  }

  if (kumeler.length === 1) {
    // Tek sütun (bu şablonda beklenmiyor ama zarifçe düş) — tüm satırı tek segment say.
    return segmentlerdenKazanimlariCikar(satirlar.map((s) => ({ itemlar: s.itemlar.filter((it) => it.str.trim() !== "") })));
  }

  // Ardışık kümeler arası sınır: SOLDAKİ kümenin sayı bloğu sonu ile
  // SAĞDAKİ kümenin ad başlangıcı arasında (ikisi de aşılmayacak şekilde).
  const esikler = kumeler.slice(1).map((k, i) => Math.min(kumeler[i].bMax + SUTUN_SINIRI_MARJI, k.adMin - 1));
  const tumKazanimlar: KazanimSatiri[] = [];
  for (let sutunNo = 0; sutunNo < kumeler.length; sutunNo++) {
    const solSinir = sutunNo === 0 ? -Infinity : esikler[sutunNo - 1];
    const sagSinir = sutunNo === kumeler.length - 1 ? Infinity : esikler[sutunNo];
    const segmentler: KazanimSegmenti[] = satirlar.map((s) => ({
      itemlar: s.itemlar.filter((it) => it.str.trim() !== "" && it.x >= solSinir && it.x < sagSinir),
    }));
    tumKazanimlar.push(...segmentlerdenKazanimlariCikar(segmentler));
  }
  return tumKazanimlar.length > 0 ? tumKazanimlar : null;
}

// Bir dizi x değeri içinde EN ÇOK TEKRAR EDEN değeri (±3 birim toleransla
// yakın değerleri aynı sayarak) bulur — TYT'nin kazanım başlıklarının
// x'i sayfa boyunca sabit (örn. 309) tekrar ederken, TEK bir satırdaki
// arızi bir eşleşme (bkz. aşağıdaki not) TEK seferlik bir aykırı değer
// üretir; modu almak bu aykırı değeri otomatik eler.
function enSikTekrarEdenX(degerler: number[]): number | null {
  if (degerler.length === 0) return null;
  const sayaç = new Map<number, number>();
  for (const x of degerler) {
    let anahtar = x;
    for (const k of sayaç.keys()) { if (Math.abs(k - x) <= 3) { anahtar = k; break; } }
    sayaç.set(anahtar, (sayaç.get(anahtar) ?? 0) + 1);
  }
  let enSikX = degerler[0];
  let enYuksekSayi = 0;
  for (const [x, sayi] of sayaç) { if (sayi > enYuksekSayi) { enYuksekSayi = sayi; enSikX = x; } }
  return enSikX;
}

function satirlardanKazanimlariCikar(satirlar: KonumluSatirGrubu[]): KazanimSatiri[] | null {
  const sutunBilgisi = karneOzetSutunlariniBul(satirlar);
  if (sutunBilgisi) {
    // TYT-tipi: özet tablo + kazanım dökümü AYNI sayfada, kazanım TEK
    // sağ sütunda. Eşiği önceliklice kazanım başlıklarının KENDİ (en sık
    // tekrar eden) x'inden türet — netX+50 marjı bazen yetersiz kalıyor:
    // gerçek veride "Öğrenci/Numara/Sınıf" öğrenci-bilgi etiketleri,
    // kazanımın İLK başlık satırıyla (örn. "Türkçe S D Y B%") AYNI y'de
    // denk gelip "Sınıf" (netX+50'nin biraz sağında) yanlışlıkla
    // kazanıma dahil oluyordu — bu SADECE o satırda oluşan tek seferlik
    // bir sapma, modu almak otomatik düzeltiyor. Başlık hiç bulunamazsa
    // (beklenmeyen bir sayfa şekli) netX+50'ye düş.
    const netX = sutunBilgisi.sutunlar.find((s) => s.ad === "net")!.x;
    const tumBloklar: { adBaslangicX: number }[] = [];
    for (const satir of satirlar) {
      const bosluksuz = satir.itemlar.filter((it) => it.str.trim() !== "");
      tumBloklar.push(...satirdakiBaslikBloklariniBul(bosluksuz));
    }
    const enSikAdX = enSikTekrarEdenX(tumBloklar.map((b) => b.adBaslangicX));
    const sagBaslangicX = enSikAdX !== null ? enSikAdX - 5 : netX + 50;
    const kazanimlar = tekSutunluKazanimlariCikar(satirlar, sagBaslangicX);
    return kazanimlar.length > 0 ? kazanimlar : null;
  }
  // Bu sayfada özet tablo yok — BRANŞ-tipi ayrı kazanım sayfası olabilir.
  return cokSutunluKazanimlariCikar(satirlar);
}

export interface KarneKazanimSonucu {
  basarili: boolean;
  hata?: string;
  bulunanSayfa: number | null;
  kazanimlar: KazanimSatiri[];
}

// Belirtilen sayfa aralığında, hem HAM isim hem öğrenci no'nun AYNI
// satırda göründüğü, ARADA en az bir "<ad> S D Y B%" kazanım başlığı
// bulunan bir sayfa arar. TYT'de bu, karneSayfasiniBul'un bulduğu
// SAME özet sayfasıyla çakışır (kazanım orada da var); BRANŞ'ta ise
// özet sayfasından FARKLI, ayrı bir sayfadır — bu yüzden karneSayfasiniBul
// yerine BAĞIMSIZ bir arama gerekiyor (bkz. dosya başı P4 notu).
async function kazanimSayfasiniBul(
  dogument: Awaited<ReturnType<typeof getDocument>["promise"]>,
  hedefIsim: string, hedefOgrenciNo: number, ilkSayfa: number, sonSayfa: number,
): Promise<number | null> {
  const hedefIsimTrim = hedefIsim.trim();
  const hedefNoStr = String(hedefOgrenciNo);
  for (let p = ilkSayfa; p <= Math.min(sonSayfa, dogument.numPages); p++) {
    const sayfa = await dogument.getPage(p);
    const icerik = await sayfa.getTextContent();
    const itemlar: KonumluMetin[] = icerik.items.filter(metinItemMi)
      .map((it) => ({ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }));
    if (!itemlar.some((it) => KAZANIM_DERS_BASLIK_DESENI.test(it.str.trim()))) {
      // Tam eşleşme item bazında nadiren olur (başlık genelde birden fazla
      // item'a bölünmüş) — asıl kontrolü satır bazında aşağıda yapıyoruz,
      // burada sadece EN UCUZ ön-eleme: "B%" hiç yoksa bu sayfa kesin değil.
      if (!itemlar.some((it) => it.str.trim() === "B%")) continue;
    }

    const satirlar = konumluSatirlaraGrupla(itemlar);
    const isimSatiri = satirlar.find((s) => s.itemlar.some((it) => it.str.trim() === hedefIsimTrim));
    if (!isimSatiri || !isimSatiri.itemlar.some((it) => it.str.trim() === hedefNoStr)) continue;

    const enAzBirBaslikVar = satirlar.some((s) => {
      const bosluksuz = s.itemlar.filter((it) => it.str.trim() !== "");
      return satirdakiBaslikBloklariniBul(bosluksuz).length > 0;
    });
    if (enAzBirBaslikVar) return p;
  }
  return null;
}

// Tek öğrenci için kazanım dökümünü bulur. Önce karneSayfasiniBul'un
// bulduğu (özet) sayfayı dener (TYT-tipi kombine sayfa için yeterli ve
// hızlı); orada kazanım bulunamazsa (BRANŞ-tipi, ayrı sayfa) BAĞIMSIZ bir
// kazanım-sayfası araması yapar.
export async function karneKazanimlariniAyristir(
  pdfBuffer: Buffer, hedefIsim: string, hedefOgrenciNo: number,
  aramaBaslangicSayfa = 1, aramaBitisSayfa = 400,
): Promise<KarneKazanimSonucu> {
  const BOS: KarneKazanimSonucu = { basarili: false, bulunanSayfa: null, kazanimlar: [] };
  try {
    const dogruBoyut = Uint8Array.from(pdfBuffer);
    const dogument = await getDocument({ data: dogruBoyut, standardFontDataUrl: undefined, disableFontFace: true }).promise;

    const ozetSayfaNo = await karneSayfasiniBul(dogument, hedefIsim, hedefOgrenciNo, aramaBaslangicSayfa, aramaBitisSayfa);
    if (ozetSayfaNo === null) return { ...BOS, hata: `"${hedefIsim}" (Ö.No ${hedefOgrenciNo}) için karne sayfası bulunamadı.` };

    const ozetSayfasindanCikar = async (sayfaNo: number): Promise<KazanimSatiri[] | null> => {
      const sayfa = await dogument.getPage(sayfaNo);
      const icerik = await sayfa.getTextContent();
      const itemlar: KonumluMetin[] = icerik.items.filter(metinItemMi)
        .map((it) => ({ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }));
      const satirlar = konumluSatirlaraGrupla(itemlar);
      return satirlardanKazanimlariCikar(satirlar);
    };

    const tytTipiSonuc = await ozetSayfasindanCikar(ozetSayfaNo);
    if (tytTipiSonuc) return { basarili: true, bulunanSayfa: ozetSayfaNo, kazanimlar: tytTipiSonuc };

    // Bu sayfada kazanım yoktu (BRANŞ-tipi olabilir) — bağımsız ara.
    const kazanimSayfaNo = await kazanimSayfasiniBul(dogument, hedefIsim, hedefOgrenciNo, aramaBaslangicSayfa, aramaBitisSayfa);
    if (kazanimSayfaNo === null) {
      return { ...BOS, bulunanSayfa: ozetSayfaNo, hata: "Karne sayfası bulundu ama kazanım dökümü çözümlenemedi (ayrı bir kazanım sayfası da bulunamadı)." };
    }
    const bransTipiSonuc = await ozetSayfasindanCikar(kazanimSayfaNo);
    if (!bransTipiSonuc) return { ...BOS, bulunanSayfa: kazanimSayfaNo, hata: "Kazanım sayfası bulundu ama dökümü çözümlenemedi." };
    return { basarili: true, bulunanSayfa: kazanimSayfaNo, kazanimlar: bransTipiSonuc };
  } catch (e) {
    return { ...BOS, hata: `Kazanım ayrıştırma hatası: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export interface KarneKazanimIndeksGirisi {
  isimHam: string;
  ogrenciNo: number;
  sayfaNo: number;
  kazanimlar: KazanimSatiri[];
}

// tumKarneleriIndeksle ile AYNI O(sayfa) TEK-GEÇİŞ deseni — ayrı bir sweep
// olarak (özet sweep'iyle BİRLEŞTİRİLMİYOR): TYT'de kazanım özet sayfasıyla
// AYNI sayfada olduğu için oradan zaten yakalanır; BRANŞ'ta ayrı bir sayfada
// olduğu için (bkz. dosya başı P4 notu) özet sayfası bulunur bulunmaz
// hedefi silen tumKarneleriIndeksle'ye eklemek yerine BAĞIMSIZ bir tarama
// daha güvenli. Ucuz ön-eleme: kazanım başlıkları HER ZAMAN "B%" içerir —
// özet-only sayfalar (BRANŞ'ın "Başarı %" sütunu iki ayrı kelime/karakterdir,
// "B%" tek token olarak hiç geçmez) bu adımda ELENIR.
export async function tumKarneKazanimlariniIndeksle(
  pdfBuffer: Buffer,
  hedefler: { isimHam: string; ogrenciNo: number }[],
  ilkSayfa = 1, sonSayfa = 500,
): Promise<Map<string, KarneKazanimIndeksGirisi>> {
  const sonuc = new Map<string, KarneKazanimIndeksGirisi>();
  const hedefMap = new Map<string, { isimHam: string; ogrenciNo: number }>();
  for (const h of hedefler) hedefMap.set(h.isimHam.trim(), h);
  if (hedefMap.size === 0) return sonuc;

  try {
    const dogruBoyut = Uint8Array.from(pdfBuffer);
    const dogument = await getDocument({ data: dogruBoyut, standardFontDataUrl: undefined, disableFontFace: true }).promise;

    for (let p = ilkSayfa; p <= Math.min(sonSayfa, dogument.numPages) && hedefMap.size > 0; p++) {
      const sayfa = await dogument.getPage(p);
      const icerik = await sayfa.getTextContent();
      const itemlar: KonumluMetin[] = icerik.items.filter(metinItemMi)
        .map((it) => ({ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }));
      if (!itemlar.some((it) => it.str.trim() === "B%")) continue;

      const satirlar = konumluSatirlaraGrupla(itemlar);
      let eslesenHedef: { isimHam: string; ogrenciNo: number } | null = null;
      for (const satir of satirlar) {
        const isimBulundu = satir.itemlar.find((it) => hedefMap.has(it.str.trim()));
        if (!isimBulundu) continue;
        const aday = hedefMap.get(isimBulundu.str.trim())!;
        if (satir.itemlar.some((it) => it.str.trim() === String(aday.ogrenciNo))) { eslesenHedef = aday; break; }
      }
      if (!eslesenHedef) continue;

      const kazanimlar = satirlardanKazanimlariCikar(satirlar);
      if (!kazanimlar) continue;

      sonuc.set(`${eslesenHedef.isimHam}|${eslesenHedef.ogrenciNo}`, {
        isimHam: eslesenHedef.isimHam, ogrenciNo: eslesenHedef.ogrenciNo, kazanimlar, sayfaNo: p,
      });
      hedefMap.delete(eslesenHedef.isimHam);
    }
  } catch {
    // Sessizce ne bulunduysa onunla dön — kısmi sonuç, hiç sonuçtan iyidir.
  }
  return sonuc;
}
