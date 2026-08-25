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
// DURUM (25.08.2026): gerçek 44 öğrenciye karşı toplu test edildi — 43'ünde
// (tyt/branş_9/branş_10: 44/44, ayt: 8/9) granüler ders toplamı, OKUL
// listesindeki bağımsız toplamla BİREBİR eşleşti. Tek istisna: bir
// öğrencinin AYT'de ardışık birden fazla dersi TAMAMEN boş (0 doğru/0
// yanlış) bırakması — bu durumda altToplamlariIsaretle'nin "hangi
// ardışık satırlar bir alt toplama toplanıyor" tahmini yapısal olarak
// belirsizleşiyor (sıfırların toplamı da sıfır). ÇAĞIRAN TARAF BU YÜZDEN
// HER ZAMAN karne toplamını (altToplamMi=false satırların net toplamı)
// OKUL listesinin bağımsız toplamıyla ÇAPRAZ DOĞRULAMALI — tutmuyorsa bu
// öğrencinin granüler verisini KULLANMAMALI (aggregate'e düş / incelemeye
// at). Henüz canlı deneme-pdf-actions.ts'e BAĞLANMADI — bkz. rapor, Faz P2
// tamamlandı ama "kaydetme yoluna entegrasyon" ayrı bir karar/faz.

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

function altToplamlariIsaretle(satirlar: Omit<KarneDersSonucu, "altToplamMi">[]): KarneDersSonucu[] {
  const sonuc: KarneDersSonucu[] = satirlar.map((s) => ({ ...s, altToplamMi: false }));
  for (let i = 1; i < sonuc.length; i++) {
    for (let k = 2; k <= Math.min(ALT_TOPLAM_MAKS_PENCERE, i); k++) {
      let grupDogru = 0;
      let grupYanlis = 0;
      let pencerdeAltToplamVar = false;
      for (let j = i - k; j < i; j++) {
        if (sonuc[j].altToplamMi) { pencerdeAltToplamVar = true; break; } // iç içe/çift sayım riskine karşı
        grupDogru += sonuc[j].dogru;
        grupYanlis += sonuc[j].yanlis;
      }
      if (pencerdeAltToplamVar) continue;
      if (sonuc[i].dogru === grupDogru && sonuc[i].yanlis === grupYanlis) {
        sonuc[i].altToplamMi = true;
        break; // en küçük eşleşen pencerede dur
      }
    }
  }
  return sonuc;
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

    const sutunBilgisi = karneOzetSutunlariniBul(satirlar);
    if (!sutunBilgisi) return { ...BOS, bulunanSayfa: sayfaNo, hata: "Karne sayfası bulundu ama özet tablo başlığı (Ders/Soru/Doğru/Yanlış/Net) çözümlenemedi." };

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

    if (hamSatirlar.length === 0) return { ...BOS, bulunanSayfa: sayfaNo, hata: "Karne sayfası bulundu ama hiç ders satırı ayrıştırılamadı." };
    const dersSonuclari = altToplamlariIsaretle(hamSatirlar);
    return { basarili: true, bulunanSayfa: sayfaNo, dersSonuclari };
  } catch (e) {
    return { ...BOS, hata: `Karne ayrıştırma hatası: ${e instanceof Error ? e.message : String(e)}` };
  }
}
