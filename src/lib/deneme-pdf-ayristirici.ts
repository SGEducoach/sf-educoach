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
    const dogruBoyut = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
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
