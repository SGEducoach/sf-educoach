// Çıkarılmış müfredat taslaklarını denetler. Çıkarıcıyı her değiştirdikten
// sonra çalıştırın: node ortaokul/veri/mufredat-denetim.mjs
//
// En güçlü ölçüt "beklenen/çıkan" karşılaştırmasıdır: öğretim programlarının
// özet tabloları tema başına öğrenme çıktısı sayısını kendileri bildiriyor,
// çıkarım bununla birebir tutmalı.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const klasor = process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url));
const dosyalar = fs.readdirSync(klasor).filter((f) => f.endsWith("-taslak.json")).sort();

const bulgular = [];
const ekle = (tur, dosya, detay) => bulgular.push({ tur, dosya, detay });
let toplamCikti = 0;

for (const d of dosyalar) {
  const v = JSON.parse(fs.readFileSync(path.join(klasor, d), "utf8"));
  const gruplar = v.temalar ?? v.beceriler ?? [];

  for (const g of gruplar) {
    if (v.temalar && !g.ad) ekle("adsız-tema", d, g.kod);
    if (!g.ogrenmeCiktilari?.length) ekle("kazanımsız-tema", d, g.kod);

    // Programın kendi bildirdiği sayı ile karşılaştırma.
    if (g.beklenenCikti != null && g.beklenenCikti !== g.ogrenmeCiktilari.length) {
      ekle("sayı-tutmuyor", d, `${g.kod}: beklenen ${g.beklenenCikti}, çıkan ${g.ogrenmeCiktilari.length}`);
    }

    const nolar = g.ogrenmeCiktilari.map((c) => Number(c.kod.split(".").at(-1))).filter(Number.isFinite).sort((a, b) => a - b);
    for (let i = 1; i <= (nolar.at(-1) ?? 0); i++) {
      if (!nolar.includes(i)) ekle("kod-boşluğu", d, `${g.kod}.${i}`);
    }

    for (const c of g.ogrenmeCiktilari) {
      toplamCikti++;
      const m = c.metin ?? "";
      // Geçerli en kısa çıktı "Akıcı okuyabilme" (16 karakter).
      if (m.length < 14) ekle("çok-kısa", d, `${c.kod}: "${m}"`);
      if (m.length > 300) ekle("çok-uzun", d, `${c.kod}: ${m.length} karakter`);
      if (/\s-$|-\s*$/.test(m)) ekle("yarım-kalmış", d, `${c.kod}: "…${m.slice(-40)}"`);
      // Maarif öğrenme çıktıları "-ebilme/-abilme" ile biter.
      if (!/bilme$/.test(m)) ekle("bilme-ile-bitmiyor", d, `${c.kod}: "…${m.slice(-45)}"`);
      if (/ÖĞRENME ÇIKTILARI|SÜREÇ BİLEŞENLERİ|SAYFA \d/.test(m)) ekle("tablo-artığı", d, c.kod);
    }
  }
}

const gruplu = new Map();
for (const b of bulgular) gruplu.set(b.tur, [...(gruplu.get(b.tur) ?? []), b]);
for (const [tur, liste] of [...gruplu.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n### ${tur} (${liste.length})`);
  for (const b of liste.slice(0, 40)) console.log(`  ${b.dosya.padEnd(22)} ${b.detay}`);
  if (liste.length > 40) console.log(`  … ${liste.length - 40} tane daha`);
}
console.log(`\n${dosyalar.length} dosya, ${toplamCikti} öğrenme çıktısı, ${bulgular.length} bulgu.`);
