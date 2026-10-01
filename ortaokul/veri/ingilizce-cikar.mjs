// İngilizce öğretim programı (MEB 2024, "The English Language Curriculum")
// PDF metninden 5-8. sınıf tema ve alt tema taslağı üretir.
//
// Kullanım:  node ingilizce-cikar.mjs <ing.txt> <cikti-klasoru>
//
// NEDEN AYRI BİR BETİK: diğer dersler "ÖĞRENME ÇIKTILARI" tablolarından
// numaralı kazanımlarla çıkıyor (mufredat-cikar.mjs). İngilizce programında
// NUMARALI ÖĞRENME ÇIKTISI YOK; içerik tema > alt tema olarak veriliyor.
// Bu yüzden kazanım üretilmiyor, alt başlıklar `altBasliklar` olarak taşınıyor.
//
// NEDEN ÖZET TABLOSU KULLANILMIYOR: programın başındaki özet tablosunda
// (s. 33-36) alt temalar tema adının üstüne ve altına bölünmüş halde çıkıyor,
// hangi maddenin hangi temaya ait olduğu metinden anlaşılmıyor. Gövdede ise
// her tema için tek ve kesin bir "Sub-themes:" satırı var — o kullanılıyor.
//
// Ders saati ve kazanım sayısı BİLEREK alınmıyor: özet tablosunun sayı
// sütunları metin çıkarımında güvenilir gelmiyor (5. sınıf satır toplamları
// tablonun kendi TOTAL satırıyla tutmuyor). Doğrulanamayan sayı saklanmaz.

import fs from "node:fs";
import path from "node:path";

const SINIFLAR = [5, 6, 7, 8];
const GOVDE_BASLANGICI = 2000; // içindekiler bölümündeki YEAR satırlarını atla

function blokAraliklari(satirlar) {
  const isaretler = [];
  satirlar.forEach((s, i) => {
    const m = /^YEAR ([5-8])$/.exec(s.trim());
    if (m && i > GOVDE_BASLANGICI) isaretler.push({ sinif: Number(m[1]), satir: i });
  });
  return isaretler.map((is, idx) => ({
    sinif: is.sinif,
    bas: is.satir,
    son: idx + 1 < isaretler.length ? isaretler[idx + 1].satir : satirlar.length,
  }));
}

// "SCHOOL LIFE & EDUCATION" -> "School Life & Education"
// "LIFE IN THE WORLD" -> "Life in the World" (İngilizce başlık kuralı: kısa
// edat/artikeller baştan başka yerde küçük kalır).
const KUCUK_KALANLAR = new Set(["in", "the", "of", "and", "to", "a", "an", "for", "on", "at"]);
function baslikDuzelt(ham) {
  const kelimeler = ham.trim().toLocaleLowerCase("en").split(/\s+/);
  return kelimeler
    .map((k, i) => (i > 0 && KUCUK_KALANLAR.has(k) ? k : k.replace(/^(\p{L})/u, (h) => h.toLocaleUpperCase("en"))))
    .join(" ");
}

// "Classroom rules and language; school subjects" -> ["Classroom rules and language", "School subjects"]
function altBasliklariAyir(metin) {
  return metin
    .replace(/^Sub-themes:\s*/i, "")
    .split(";")
    .map((p) => p.replace(/\s+/g, " ").trim().replace(/[.,]+$/, ""))
    .filter((p) => p.length > 1)
    .map((p) => p.charAt(0).toLocaleUpperCase("en") + p.slice(1));
}

function temalariCikar(satirlar, blok) {
  const temalar = [];
  for (let i = blok.bas; i < blok.son; i += 1) {
    const m = /^THEME (\d+):\s*(.+)$/.exec(satirlar[i].trim());
    if (!m) continue;
    const sira = Number(m[1]);
    // Aynı tema gövdede birden fazla yerde anılabiliyor; ilk geçtiği yer esas.
    if (temalar.some((t) => t.sira === sira)) continue;

    // Tema adı satır sonuna sığmazsa alt satıra taşıyor (ör. 8. sınıf 5. tema:
    // "LIFE IN THE NEIGHBOURHOOD & CITY &" / "SOCIAL LIFE"). Ad, "Sub-themes:"
    // satırına kadar devam eder.
    const adParcalari = [m[2].trim()];
    let j = i + 1;
    for (; j < Math.min(i + 5, blok.son); j += 1) {
      if (/^Sub-themes:/i.test(satirlar[j].trim())) break;
      adParcalari.push(satirlar[j].trim());
    }

    // "Sub-themes:" satırını ve devamını topla; açıklama paragrafı başlayınca dur.
    const parcalar = [];
    for (let k = j; k < Math.min(j + 8, blok.son); k += 1) {
      const satir = satirlar[k].trim();
      if (/^This theme is centred/i.test(satir)) break;
      if (parcalar.length === 0 && !/^Sub-themes:/i.test(satir)) continue;
      parcalar.push(satir);
    }
    if (parcalar.length === 0) continue;

    temalar.push({
      kod: `İNG.${blok.sinif}.${sira}`,
      ad: baslikDuzelt(adParcalari.join(" ")),
      tur: "tema",
      sira,
      altBasliklar: altBasliklariAyir(parcalar.join(" ")),
    });
  }
  return temalar.sort((a, b) => a.sira - b.sira);
}

const [, , metinDosyasi, ciktiKlasoru] = process.argv;
if (!metinDosyasi || !ciktiKlasoru) {
  console.error("Kullanım: node ingilizce-cikar.mjs <ing.txt> <cikti-klasoru>");
  process.exit(1);
}

const satirlar = fs.readFileSync(metinDosyasi, "utf8").split(/\r?\n/);
const bloklar = blokAraliklari(satirlar);

let hata = 0;
for (const sinif of SINIFLAR) {
  const blok = bloklar.find((b) => b.sinif === sinif);
  if (!blok) {
    console.error(`HATA: ${sinif}. sınıf bloğu bulunamadı`);
    hata += 1;
    continue;
  }
  const temalar = temalariCikar(satirlar, blok);
  if (temalar.length !== 8) {
    console.error(`HATA: ${sinif}. sınıfta 8 tema beklenirken ${temalar.length} bulundu`);
    hata += 1;
  }
  const bosAlt = temalar.filter((t) => t.altBasliklar.length === 0);
  if (bosAlt.length > 0) {
    console.error(`HATA: ${sinif}. sınıfta alt başlığı boş tema: ${bosAlt.map((t) => t.kod).join(", ")}`);
    hata += 1;
  }

  // Alan adları diğer taslaklarla BİREBİR aynı olmalı: yükleyici
  // (scripts/ortaokul-mufredat-yukle.mjs) `dersKodu` okuyor, `kod` değil.
  const cikti = {
    kaynak: "ortaokul/ingilizce-dersi-2-8.pdf",
    mufredat: "MEB 2024 Maarif Modeli",
    ders: "İngilizce",
    dersKodu: "İNG",
    sinif: String(sinif),
    cikarimTarihi: new Date().toISOString().slice(0, 10),
    // Numaralı öğrenme çıktısı olmadığını okuyucuya da söyle.
    not: "MEB İngilizce programında numaralı öğrenme çıktısı yoktur; içerik tema ve alt tema olarak verilir.",
    temalar,
  };
  const yol = path.join(ciktiKlasoru, `ingilizce-${sinif}-taslak.json`);
  fs.writeFileSync(yol, `${JSON.stringify(cikti, null, 2)}\n`, "utf8");
  console.log(`${yol}: ${temalar.length} tema, ${temalar.reduce((t, x) => t + x.altBasliklar.length, 0)} alt başlık`);
}

process.exit(hata > 0 ? 1 : 0);
