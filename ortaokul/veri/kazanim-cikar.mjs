import fs from "node:fs";

// MEB Maarif Modeli öğretim programı PDF metninden öğrenme çıktılarını çıkarır.
// Kod biçimi: <DERS>.<SINIF>.<TEMA>.<SIRA>. <metin>
// Metin satır sonlarında tireyle bölünüyor ("işlem -" / "lerle") — birleştirilir.

const metin = fs.readFileSync(process.argv[2], "utf8");
const dersKodu = process.argv[3];          // ör. MAT
const sinif = process.argv[4];             // ör. 8
const cikti = process.argv[5];

const satirlar = metin.split("\n");
// Kod satırın başında olmayabiliyor: tablo hücresi başlığı ("ÖĞRENME ÇIKTILARI
// VE SÜREÇ BİLEŞENLERİ") aynı satıra yapışık geliyor. Kodun önündeki bu
// başlık ve devam satırlarındaki tekrarı ayıklanıyor.
const kodDeseni = new RegExp(`(?:^|\\s)(${dersKodu}\\.${sinif}\\.(\\d+)\\.(\\d+))\\.\\s*(.*)$`);
const HUCRE_BASLIGI = /^(ÖĞRENME ÇIKTILARI|VE SÜREÇ BİLEŞENLERİ)\s*/;

const bulunan = new Map();
for (let i = 0; i < satirlar.length; i++) {
  const m = kodDeseni.exec(satirlar[i].trim());
  if (!m) continue;
  const [, kod, tema, sira, ilk] = m;
  if (!ilk.trim()) continue;               // gövdesiz tekrar (tablo başlığı)
  if (bulunan.has(kod)) continue;          // ilk tam tanım esas
  const parcalar = [ilk.trim()];
  for (let j = i + 1; j < satirlar.length; j++) {
    const ham = satirlar[j].trim();
    if (/^(ÖĞRENME ÇIKTILARI|VE SÜREÇ BİLEŞENLERİ)$/.test(ham)) continue; // hücre başlığı, metni böler
    const s = ham.replace(HUCRE_BASLIGI, "");
    if (!s) break;
    if (kodDeseni.test(s)) break;
    if (/^={3,}|^SAYFA |^[A-ZÇĞİÖŞÜ ]{6,}$/.test(s)) break;
    if (/^\d+$/.test(s)) break;
    parcalar.push(s);
    if (parcalar.join(" ").length > 400) break;
  }
  let govde = parcalar.join(" ")
    .replace(/\s*-\s+/g, "")               // satır sonu tiresi
    .replace(/\s+/g, " ")
    .trim();
  // Cümle sonuna kadar al; sonrasındaki tablo artığını at.
  const nokta = govde.search(/(bilme|ebilme|abilme)\b/);
  if (nokta > 0) govde = govde.slice(0, nokta + govde.slice(nokta).match(/^\w+/)[0].length);
  bulunan.set(kod, { kod, tema: Number(tema), sira: Number(sira), metin: govde });
}

const liste = [...bulunan.values()].sort((a, b) => a.tema - b.tema || a.sira - b.sira);
fs.writeFileSync(cikti, JSON.stringify(liste, null, 2), "utf8");
console.log(`${liste.length} öğrenme çıktısı -> ${cikti}`);
for (const c of liste) console.log(`${c.kod}  ${c.metin}`);
