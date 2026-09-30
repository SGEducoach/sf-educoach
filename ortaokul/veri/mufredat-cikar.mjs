// MEB 2024 Maarif Modeli ortaokul öğretim programı PDF'lerinden tema/ünite ve
// öğrenme çıktısı taslağı üretir. Çıktı: ders-sınıf başına bir JSON.
//
// Kullanım:  node mufredat-cikar.mjs <metin-klasoru> <cikti-klasoru>
// Metin klasöründe pdf-tam-metin.mjs ile üretilmiş .txt dosyaları beklenir.
//
// ÖNEMLİ: çıktı TASLAKTIR. PDF metni satır sonlarında tireyle bölünüyor ve
// tablo hücre başlıkları ("ÖĞRENME ÇIKTILARI", "VE SÜREÇ BİLEŞENLERİ")
// cümlelerin ortasına giriyor; her ders için insan doğrulaması şart.

import fs from "node:fs";
import path from "node:path";

const DERSLER = [
  { dosya: "mat.txt", ders: "Matematik", kod: "MAT", siniflar: [5, 6, 7, 8] },
  { dosya: "fen.txt", ders: "Fen Bilimleri", kod: "FB", siniflar: [5, 6, 7, 8] },
  { dosya: "sos.txt", ders: "Sosyal Bilgiler", kod: "SB", siniflar: [5, 6, 7] },
  { dosya: "din.txt", ders: "Din Kültürü ve Ahlak Bilgisi", kod: "DKAB", siniflar: [5, 6, 7, 8] },
  { dosya: "ink.txt", ders: "T.C. İnkılap Tarihi ve Atatürkçülük", kod: "İTA", siniflar: [8] },
];

// Türkçe beceri temelli: T.<beceri>.<sınıf>.<sıra>.
const TURKCE_BECERILER = { O: "Okuma", D: "Dinleme/İzleme", Y: "Yazma", K: "Konuşma" };

const HUCRE_BASLIGI = /^(ÖĞRENME ÇIKTILARI|VE SÜREÇ BİLEŞENLERİ)\s*/;
const SADECE_BASLIK = /^(ÖĞRENME ÇIKTILARI|VE SÜREÇ BİLEŞENLERİ)$/;

// Bir kod satırından başlayıp cümle bitene kadar devam satırlarını toplar.
function govdeTopla(satirlar, i, ilk, kodDeseni) {
  const parcalar = [ilk.trim()];
  for (let j = i + 1; j < satirlar.length; j++) {
    const ham = satirlar[j].trim();
    if (SADECE_BASLIK.test(ham)) continue;      // hücre başlığı cümleyi bölmesin
    const s = ham.replace(HUCRE_BASLIGI, "");
    if (!s) break;
    if (kodDeseni.test(s)) break;
    if (/^={3,}|^SAYFA /.test(s)) break;
    if (/^[A-ZÇĞİÖŞÜ ]{6,}$/.test(s)) break;
    if (/^\d+$/.test(s)) break;
    if (/^[a-zçğıöşü]\)/.test(s)) break;        // süreç bileşeni maddesi
    parcalar.push(s);
    if (parcalar.join(" ").length > 400) break;
  }
  let govde = parcalar.join(" ").replace(/\s*-\s+/g, "").replace(/\s+/g, " ").trim();
  const bitis = govde.search(/\w*(bilme)\b/);
  if (bitis > 0) {
    const kalan = govde.slice(bitis).match(/^\S+/);
    govde = govde.slice(0, bitis + (kalan ? kalan[0].length : 0));
  }
  return govde;
}

// PDF bazı harfleri boşlukla ayırıyor ("Birinci D ü nya Savaşı"); tek harflik
// boşlukları kapatır.
function harfBosluguKapat(metin) {
  let s = metin;
  for (let i = 0; i < 3; i++) s = s.replace(/(\p{L}) ([üöçğışâîûÜÖÇĞİŞ]) (\p{L})/gu, "$1$2$3");
  // Sondaki tek harf de kopabiliyor ("…çıkarım yapabilm e").
  if (/\p{L} \p{L}$/u.test(s) && /bilm\s\w$/.test(s)) s = s.replace(/\s(\w)$/, "$1");
  return s;
}

// Maarif öğrenme çıktısı "-ebilme/-abilme" ile biter; tablo artığı, başka kod
// ya da aşırı uzunluk taşıyan aday geçersizdir.
function ciktiGecerliMi(metin) {
  return /bilme$/.test(metin)
    && metin.length >= 15 && metin.length <= 300
    && !/ÖĞRENME ÇIKTILARI|SÜREÇ BİLEŞENLERİ|süreç bileşenleri/.test(metin);
}

function ciktilariCikar(metin, kod, sinif) {
  const satirlar = metin.split("\n");
  const kacis = kod.replace(/\./g, "\\.");
  // Kodun KENDİSİ kaynakta bozuk olabiliyor: İnkılap Tarihi'nde "İTA . 8.1.2."
  // (noktalar boşluklu) ve "TA.8.2.5." (baştaki harf düşmüş) görüldü. Önek
  // için baş harfi eksik varyant da kabul ediliyor, noktaların iki yanında
  // boşluğa izin veriliyor; bulunan kod kanonik biçime geri yazılıyor.
  const onek = kacis.length > 2 ? `(?:${kacis}|${kacis.slice(1)})` : kacis;
  const nokta = "\\s*\\.\\s*";
  const kodDeseni = new RegExp(`(?:^|\\s)${onek}${nokta}${sinif}${nokta}(\\d+)${nokta}(\\d+)\\s*\\.\\s*(.*)$`);

  // Aynı kod belgede birden çok kez geçiyor: açıklama tablolarında, çapraz
  // göndermelerde ve gerçek tanım listesinde. "İlk eşleşme" yanlış metni
  // seçebiliyordu (İnkılap Tarihi'nde iki çıktı böyle bozulmuştu); bunun
  // yerine TÜM adaylar toplanıp geçerli olanların en kısası seçiliyor.
  const adaylar = new Map();
  for (let i = 0; i < satirlar.length; i++) {
    const m = kodDeseni.exec(satirlar[i].trim());
    if (!m) continue;
    const [, tema, sira, ilk] = m;
    if (!ilk.trim()) continue;
    const tamKod = `${kod}.${sinif}.${tema}.${sira}`;
    const govde = harfBosluguKapat(govdeTopla(satirlar, i, ilk, kodDeseni));
    const liste = adaylar.get(tamKod) ?? [];
    liste.push({ kod: tamKod, tema: Number(tema), sira: Number(sira), metin: govde });
    adaylar.set(tamKod, liste);
  }

  const bulunan = [];
  for (const liste of adaylar.values()) {
    const iyi = liste.filter((a) => ciktiGecerliMi(a.metin)).sort((a, b) => a.metin.length - b.metin.length);
    bulunan.push(iyi[0] ?? liste.sort((a, b) => b.metin.length - a.metin.length)[0]);
  }
  return bulunan.sort((a, b) => a.tema - b.tema || a.sira - b.sira);
}

// Özet tablosundan tema/ünite adları. İki biçim görüldü:
//   "1 MAT.8.1.SAYILAR VE NİCELİKLER 4 38 21"   (kodlu)
//   "1. MEVSİMLER VE İKLİM 2 12 8"              (numaralı)
function temaAdlari(metin, kod, sinif) {
  const satirlar = metin.split("\n");
  const kacis = kod.replace(/\./g, "\\.");
  const kodlu = new RegExp(`^(\\d+)\\s+${kacis}\\.${sinif}\\.(\\d+)\\.\\s*(.+?)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)$`);
  const numarali = /^(\d+)\.\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)$/;

  // Uzun tema adı hücreye sığmayınca ÜÇ parçaya bölünüyor; sayılar araya
  // giriyor:
  //   "MAT.6.2.İŞLEMLERLE CEBİRSEL DÜŞÜNME"
  //   "6 3 33 18"        <- işleniş sırası, çıktı sayısı, ders saati, yüzde
  //   "VE DEĞİŞİMLER"    <- adın devamı
  const sarmal = new RegExp(`^${kacis}\\.${sinif}\\.(\\d+)\\.\\s*(.+)$`);
  const SAYI_SATIRI = /^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/;
  const DEVAM_SATIRI = /^[A-ZÇĞİÖŞÜ ]{3,}$/;

  const adlar = new Map();
  // Kodlu biçim: tema numarası satırda açıkça var.
  for (const s of satirlar) {
    const m = kodlu.exec(s.trim());
    if (m) temaEkle(adlar, Number(m[2]), { ad: baslikDuzelt(m[3]), islenisSirasi: Number(m[1]), beklenenCikti: Number(m[4]), dersSaati: Number(m[5]), yuzde: Number(m[6]) });
  }
  for (let i = 0; i < satirlar.length - 1; i++) {
    const m = sarmal.exec(satirlar[i].trim());
    if (!m) continue;
    const sayilar = SAYI_SATIRI.exec(satirlar[i + 1].trim());
    if (!sayilar) continue;
    const devam = satirlar[i + 2]?.trim() ?? "";
    const tamAd = DEVAM_SATIRI.test(devam) ? `${m[2]} ${devam}` : m[2];
    temaEkle(adlar, Number(m[1]), {
      ad: baslikDuzelt(tamAd), islenisSirasi: Number(sayilar[1]),
      beklenenCikti: Number(sayilar[2]), dersSaati: Number(sayilar[3]), yuzde: Number(sayilar[4]),
    });
  }
  if (adlar.size > 0) return adlar;

  // Numaralı biçim: yalnız ilgili sınıf başlığından sonraki blok okunur.
  // DİKKAT: aynı başlık içindekiler sayfasında da geçiyor; gerçek tablo,
  // başlığı izleyen birkaç satırda numaralı satır taşır.
  const basligiBul = () => {
    // Başlık kimi programda yalnız "8. SINIF", kimisinde ders adıyla birlikte
    // ("8. SINIF DİN KÜLTÜRÜ … ÖĞRETİM PROGRAMI").
    const desen = new RegExp(`^${sinif}\\.\\s*SINIF\\b`);
    for (let i = 0; i < satirlar.length; i++) {
      if (!desen.test(satirlar[i].trim())) continue;
      if (satirlar.slice(i + 1, i + 16).some((s) => numarali.test(s.trim()))) return i;
    }
    return -1;
  };
  // Tek sınıflık programda (İnkılap Tarihi) sınıf başlığı hiç yok.
  let bas = basligiBul();
  if (bas === -1) {
    bas = satirlar.findIndex((s, i) =>
      /^(ÜNİTE|TEMA)\b/.test(s.trim())
      && satirlar.slice(i + 1, i + 16).some((x) => numarali.test(x.trim())));
  }
  if (bas === -1) return adlar;
  for (let i = bas + 1; i < satirlar.length; i++) {
    const s = satirlar[i].trim();
    if (/^TOPLAM/i.test(s)) break;
    // Sonraki sınıfın tablosuna geçince dur — bulma deseniyle AYNI gevşeklikte
    // olmalı, yoksa birkaç sınıfın satırları tek temada toplanır.
    if (/^\d+\.\s*SINIF\b/.test(s)) break;
    const m = numarali.exec(s);
    if (m) temaEkle(adlar, Number(m[1]), { ad: baslikDuzelt(m[2]), islenisSirasi: Number(m[1]), beklenenCikti: Number(m[3]), dersSaati: Number(m[4]), yuzde: Number(m[5]) });
  }
  return adlar;
}

// Aynı tema özet tabloda BİRDEN FAZLA satırda olabiliyor: matematikte bir tema
// yıla iki blokta yayılıyor ("SAYILAR VE NİCELİKLER (1)" / "(2)"). Üzerine
// yazmak yerine sayılar TOPLANIR, ad ilk satırdan alınır, sondaki "(1)" eki
// atılır.
function temaEkle(adlar, no, kayit) {
  const mevcut = adlar.get(no);
  if (!mevcut) {
    adlar.set(no, { ...kayit, ad: kayit.ad ? kayit.ad.replace(/\s*\(\d+\)\s*$/, "") : null });
    return;
  }
  mevcut.beklenenCikti = (mevcut.beklenenCikti ?? 0) + (kayit.beklenenCikti ?? 0);
  mevcut.dersSaati = (mevcut.dersSaati ?? 0) + (kayit.dersSaati ?? 0);
  mevcut.yuzde = (mevcut.yuzde ?? 0) + (kayit.yuzde ?? 0);
}

function baslikDuzelt(ham) {
  const s = ham.replace(/\s+/g, " ").trim();
  return s
    .toLocaleLowerCase("tr")
    .split(" ")
    .map((k) => (k.length > 2 && !["ve", "ile", "veya"].includes(k) ? k[0].toLocaleUpperCase("tr") + k.slice(1) : k))
    .join(" ");
}

// Türkçe programında aynı kod ONLARCA kez geçiyor: çapraz gönderme
// listelerinde ("T.D.5.6. T.D.5.8."), açıklama paragraflarında ve tema
// listelerinde. Gerçek TANIM, tema listelerindeki tek satırlık
// "T.O.5.4. Okuyacağı metnin içeriğine yönelik tahminde bulunabilme" biçimi.
// "İlk eşleşme" kuralıyla 71 çıktı çapraz gönderme ya da 2000 karakterlik
// metin bloğu olarak geliyordu; bu yüzden burada da aday seçimi yapılıyor.
const BECERI_BASLIGI = /^(Okuma|Yazma|Konuşma|Dinleme\/İzleme|Dinleme|İzleme)$/;

function turkceGecerliMi(metin) {
  return /bilme$/.test(metin)
    && metin.length >= 15 && metin.length <= 160
    && !/T\.[ODYK]\.\d+\.\d+/.test(metin);
}

function turkceCikar(metin, sinif) {
  const satirlar = metin.split("\n");
  const kodDeseni = new RegExp(`(?:^|\\s)(T\\.(O|D|Y|K)\\.${sinif}\\.(\\d+))\\.\\s*(.*)$`);

  const adaylar = new Map();
  for (let i = 0; i < satirlar.length; i++) {
    const m = kodDeseni.exec(satirlar[i].trim());
    if (!m) continue;
    const [, tamKod, beceri, sira, ilk] = m;
    if (!ilk.trim()) continue;

    // Gövde: bu satır + YALNIZ tireyle bölünmüş devam satırları.
    const parcalar = [ilk.trim()];
    for (let j = i + 1; j < satirlar.length && parcalar.length < 4; j++) {
      const s = satirlar[j].trim();
      if (!s || kodDeseni.test(s) || BECERI_BASLIGI.test(s)) break;
      if (/^={3,}|^SAYFA |^\d+$/.test(s)) break;
      const oncekiTireli = /-$/.test(parcalar.at(-1));
      parcalar.push(s);
      if (!oncekiTireli) break;
    }
    const govde = parcalar.join(" ").replace(/-\s+/g, "").replace(/\s+/g, " ").trim();
    const liste = adaylar.get(tamKod) ?? [];
    liste.push({ kod: tamKod, beceri, sira: Number(sira), metin: govde });
    adaylar.set(tamKod, liste);
  }

  const bulunan = [];
  for (const liste of adaylar.values()) {
    const iyi = liste.filter((a) => turkceGecerliMi(a.metin)).sort((a, b) => a.metin.length - b.metin.length);
    if (iyi.length > 0) { bulunan.push(iyi[0]); continue; }
    // Kurtarma: iki çıktı aynı satıra yapışmışsa sonraki kodda kes.
    const kurtarilan = liste
      .map((a) => ({ ...a, metin: a.metin.split(/\sT\.[ODYK]\.\d+\.\d+/)[0].trim() }))
      .filter((a) => turkceGecerliMi(a.metin))
      .sort((a, b) => a.metin.length - b.metin.length);
    if (kurtarilan.length > 0) bulunan.push(kurtarilan[0]);
  }
  return bulunan.sort((a, b) => a.beceri.localeCompare(b.beceri) || a.sira - b.sira);
}

// ---------------------------------------------------------------------------

const metinKlasoru = process.argv[2];
const ciktiKlasoru = process.argv[3];
fs.mkdirSync(ciktiKlasoru, { recursive: true });
const ozet = [];

for (const d of DERSLER) {
  const yol = path.join(metinKlasoru, d.dosya);
  if (!fs.existsSync(yol)) { console.warn(`atlandı (dosya yok): ${d.dosya}`); continue; }
  const metin = fs.readFileSync(yol, "utf8");
  for (const sinif of d.siniflar) {
    const ciktilar = ciktilariCikar(metin, d.kod, sinif);
    const adlar = temaAdlari(metin, d.kod, sinif);
    const temaNolar = [...new Set(ciktilar.map((c) => c.tema))].sort((a, b) => a - b);
    const temalar = temaNolar.map((no) => ({
      kod: `${d.kod}.${sinif}.${no}`,
      ad: adlar.get(no)?.ad ?? null,
      islenisSirasi: adlar.get(no)?.islenisSirasi ?? null,
      dersSaati: adlar.get(no)?.dersSaati ?? null,
      yuzde: adlar.get(no)?.yuzde ?? null,
      // Programın KENDİ bildirdiği çıktı sayısı — çıkarımın doğrulama ölçütü.
      beklenenCikti: adlar.get(no)?.beklenenCikti ?? null,
      ogrenmeCiktilari: ciktilar.filter((c) => c.tema === no).map((c) => ({ kod: c.kod, metin: c.metin })),
    }));
    const dosyaAdi = `${d.kod.toLocaleLowerCase("tr").replace(/\./g, "")}-${sinif}-taslak.json`;
    fs.writeFileSync(path.join(ciktiKlasoru, dosyaAdi), JSON.stringify({
      kaynak: d.dosya, mufredat: "MEB 2024 Maarif Modeli",
      ders: d.ders, dersKodu: d.kod, sinif,
      cikarimTarihi: new Date().toISOString().slice(0, 10),
      not: "Makineyle çıkarıldı; içerik doğrulaması yapılmadı.",
      temalar,
    }, null, 2), "utf8");
    const adsiz = temalar.filter((t) => !t.ad).length;
    ozet.push({ ders: d.ders, sinif, tema: temalar.length, cikti: ciktilar.length, adsizTema: adsiz });
  }
}

// Türkçe ayrı: beceri temelli, tema yok.
const turYol = path.join(metinKlasoru, "tur.txt");
if (fs.existsSync(turYol)) {
  const metin = fs.readFileSync(turYol, "utf8");
  for (const sinif of [5, 6, 7, 8]) {
    const ciktilar = turkceCikar(metin, sinif);
    const beceriler = Object.entries(TURKCE_BECERILER).map(([harf, ad]) => ({
      kod: `T.${harf}.${sinif}`, ad,
      ogrenmeCiktilari: ciktilar.filter((c) => c.beceri === harf).map((c) => ({ kod: c.kod, metin: c.metin })),
    })).filter((b) => b.ogrenmeCiktilari.length > 0);
    fs.writeFileSync(path.join(ciktiKlasoru, `turkce-${sinif}-taslak.json`), JSON.stringify({
      kaynak: "tur.txt", mufredat: "MEB 2024 Maarif Modeli",
      ders: "Türkçe", dersKodu: "T", sinif,
      cikarimTarihi: new Date().toISOString().slice(0, 10),
      not: "Türkçe programı tema değil BECERİ temelli; gruplama okuma/dinleme/yazma/konuşma. Makineyle çıkarıldı.",
      beceriler,
    }, null, 2), "utf8");
    ozet.push({ ders: "Türkçe", sinif, tema: beceriler.length, cikti: ciktilar.length, adsizTema: 0 });
  }
}

console.table(ozet);
console.log("toplam öğrenme çıktısı:", ozet.reduce((n, o) => n + o.cikti, 0));
