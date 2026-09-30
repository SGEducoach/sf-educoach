// Ortaokul müfredat taslaklarını (ortaokul/veri/*.json) veritabanına yükler.
// Tekrar çalıştırılabilir: var olan kayıt güncellenir, eksik olan eklenir.
//
// Çalıştırma: node scripts/ortaokul-mufredat-yukle.mjs [--kuru]
//   --kuru  : hiçbir şey yazmaz, ne yapacağını listeler.
// Gerekli: .env.local içinde NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Yükleme SIRASI önemli: sürüm > ders > tema > kazanım.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY .env.local'de yok.");

const kuru = process.argv.includes("--kuru");
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const veriKlasoru = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "ortaokul", "veri");
const dosyalar = readdirSync(veriKlasoru).filter((f) => f.endsWith("-taslak.json")).sort();
if (dosyalar.length === 0) throw new Error(`${veriKlasoru} altında taslak bulunamadı.`);

// Türkçe beceri temelli, Fen ünite temelli, diğerleri tema.
function temaTuru(dersKodu) {
  if (dersKodu === "T") return "beceri";
  if (dersKodu === "FB") return "unite";
  return "tema";
}

const SURUM_ADI = "MEB 2024 Maarif Modeli";

async function surumuBul() {
  const { data: mevcut } = await db.from("ortaokul_mufredat_surumleri").select("id").eq("ad", SURUM_ADI).maybeSingle();
  if (mevcut) return mevcut.id;
  if (kuru) return "(kuru çalışma — sürüm oluşturulmadı)";
  const { data, error } = await db.from("ortaokul_mufredat_surumleri")
    .insert({ ad: SURUM_ADI, yetkili: "MEB", durum: "aktif", kaynak_belge: "MEB öğretim programları (ortaokul/ klasörü)" })
    .select("id").single();
  if (error) throw new Error(`sürüm oluşturulamadı: ${error.message}`);
  return data.id;
}

async function dersYukle(surumId, taslak) {
  const satir = {
    surum_id: surumId,
    sinif_seviyesi: String(taslak.sinif),
    ders_kodu: taslak.dersKodu,
    ad: taslak.ders,
  };
  if (kuru) return "(kuru)";
  const { data, error } = await db.from("ortaokul_mufredat_dersleri")
    .upsert(satir, { onConflict: "surum_id,sinif_seviyesi,ders_kodu" })
    .select("id").single();
  if (error) throw new Error(`${taslak.ders} ${taslak.sinif}: ${error.message}`);
  return data.id;
}

async function temaYukle(dersId, tema, sira, tur) {
  const satir = {
    ders_id: dersId,
    kod: tema.kod,
    ad: tema.ad ?? null,
    tur,
    islenis_sirasi: tema.islenisSirasi ?? null,
    ders_saati: tema.dersSaati ?? null,
    yuzde: tema.yuzde ?? null,
    sira,
  };
  if (kuru) return "(kuru)";
  const { data, error } = await db.from("ortaokul_mufredat_temalari")
    .upsert(satir, { onConflict: "ders_id,kod" })
    .select("id").single();
  if (error) throw new Error(`${tema.kod}: ${error.message}`);
  return data.id;
}

async function kazanimlariYukle(temaId, ciktilar) {
  if (ciktilar.length === 0 || kuru) return ciktilar.length;
  const satirlar = ciktilar.map((c, i) => ({ tema_id: temaId, kod: c.kod, metin: c.metin, sira: i + 1 }));
  const { error } = await db.from("ortaokul_mufredat_kazanimlari").upsert(satirlar, { onConflict: "tema_id,kod" });
  if (error) throw new Error(`kazanım yazılamadı (${satirlar[0].kod}…): ${error.message}`);
  return satirlar.length;
}

const surumId = await surumuBul();
console.log(`sürüm: ${SURUM_ADI} -> ${surumId}${kuru ? " [KURU ÇALIŞMA]" : ""}`);

let toplamTema = 0;
let toplamKazanim = 0;
let adsizTema = 0;

for (const dosya of dosyalar) {
  const taslak = JSON.parse(readFileSync(path.join(veriKlasoru, dosya), "utf8"));
  const tur = temaTuru(taslak.dersKodu);
  // Türkçe dosyalarında grup adı "beceriler", diğerlerinde "temalar".
  const gruplar = taslak.temalar ?? taslak.beceriler ?? [];
  const dersId = await dersYukle(surumId, taslak);

  let kazanim = 0;
  for (const [i, grup] of gruplar.entries()) {
    const temaId = await temaYukle(dersId, grup, i + 1, tur);
    kazanim += await kazanimlariYukle(temaId, grup.ogrenmeCiktilari ?? []);
    if (!grup.ad) adsizTema++;
  }
  toplamTema += gruplar.length;
  toplamKazanim += kazanim;
  console.log(`  ${taslak.ders} ${taslak.sinif}. sınıf: ${gruplar.length} ${tur}, ${kazanim} öğrenme çıktısı`);
}

console.log(`\ntoplam: ${dosyalar.length} ders-sınıf, ${toplamTema} tema/ünite/beceri, ${toplamKazanim} öğrenme çıktısı`);
if (adsizTema > 0) console.log(`UYARI: ${adsizTema} tema adı boş — kaynak PDF özet tablosundan çıkarılamadı, elle tamamlanmalı.`);
