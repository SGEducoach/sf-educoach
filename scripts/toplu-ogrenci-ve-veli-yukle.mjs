// dokumanlar/ogrenci_listesi.json'daki (sinif, okulNo, ad) listesini toplu
// olarak işler:
//   1) Her öğrenci için hesap açar (rastgele şifre, admin_ekledi:true ->
//      izinli öğrenci listesi kontrolünden muaf)
//   2) İzinli öğrenci listesine (izinli_ogrenciler) adını ekler
//   3) Onaylanmış bir veli_link_requests kaydı + kod üretir — böylece veli
//      "kod talep et" adımını atlayıp doğrudan "Kodum var, tamamla" ile
//      kayıt olabilir.
// NOT: veli_ad/veli_telefon burada PLACEHOLDER ("Veli" / "0000000000") —
// gerçek veli adı/telefonu şu an tamamlama akışında toplanmıyor, veli hesabı
// açıldıktan sonra profildeki bu alanlar placeholder olarak kalır.
//
// Çıktı: dokumanlar/toplu_yukleme_sonuc.csv (sınıf, okul no, ad, öğrenci
// şifresi, veli kodu) — öğrenci/veliye dağıtmak için.
//
// Çalıştırma: node scripts/toplu-ogrenci-ve-veli-yukle.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";

const OKUL_ADI = "Elbistan Bist Fen Lisesi";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function adNormalize(v) {
  return v.trim().replace(/\s+/g, " ").toLocaleUpperCase("tr-TR");
}

function rastgeleSifre() {
  const harfler = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const rakamlar = "23456789";
  const ozelKarakterler = "!@#$%*.,";
  let s = "";
  for (let i = 0; i < 5; i++) s += harfler[Math.floor(Math.random() * harfler.length)];
  for (let i = 0; i < 4; i++) s += rakamlar[Math.floor(Math.random() * rakamlar.length)];
  s += ozelKarakterler[Math.floor(Math.random() * ozelKarakterler.length)];
  return s.split("").sort(() => Math.random() - 0.5).join("");
}

function rastgeleKod() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

async function main() {
  const satirlar = JSON.parse(readFileSync(new URL("../dokumanlar/ogrenci_listesi.json", import.meta.url), "utf-8"));
  console.log(`${satirlar.length} satır okundu.`);

  const { data: okul, error: okulHatasi } = await admin.from("schools").select("id").eq("ad", OKUL_ADI).single();
  if (okulHatasi || !okul) throw new Error(`Okul bulunamadı: ${OKUL_ADI} — ${okulHatasi?.message ?? ""}`);

  const { data: siniflar, error: sinifHatasi } = await admin.from("classes").select("id, seviye, sube").eq("school_id", okul.id);
  if (sinifHatasi) throw new Error("Sınıflar okunamadı: " + sinifHatasi.message);
  const sinifMap = new Map(siniflar.map((s) => [`${s.seviye}-${s.sube}`, s.id]));

  const { data: mevcutOgrenciler } = await admin.from("students").select("okul_no").eq("school_id", okul.id);
  const mevcutOkulNolar = new Set((mevcutOgrenciler ?? []).map((s) => s.okul_no));

  const sonuclar = [];
  let basarili = 0, atlanan = 0, hatali = 0;

  for (const satir of satirlar) {
    const sinif = satir.sinif.trim().toUpperCase();
    const classId = sinifMap.get(sinif);
    const ad = adNormalize(satir.ad);
    const okulNo = satir.okulNo.trim();

    if (!classId) {
      console.error(`✗ ${ad}: sınıf bulunamadı (${sinif})`);
      sonuclar.push({ sinif, okulNo, ad, ogrenciSifre: "", veliKodu: "", durum: "HATA: sınıf bulunamadı" });
      hatali++;
      continue;
    }
    if (mevcutOkulNolar.has(okulNo)) {
      console.log(`• ${ad} (#${okulNo}): zaten kayıtlı, atlandı`);
      sonuclar.push({ sinif, okulNo, ad, ogrenciSifre: "", veliKodu: "", durum: "atlandı (zaten var)" });
      atlanan++;
      continue;
    }

    const sifre = rastgeleSifre();
    const email = `${crypto.randomUUID()}@ogrenci.sgeducoach.internal`;
    const { data: created, error: hesapHatasi } = await admin.auth.admin.createUser({
      email, password: sifre, email_confirm: true,
      user_metadata: {
        role: "ogrenci", ad, telefon: null, school_id: okul.id, class_id: classId,
        okul_no: okulNo, ayt_alan: "SAY", hedef_bolum: "",
        admin_ekledi: true,
      },
    });
    if (hesapHatasi || !created.user) {
      console.error(`✗ ${ad} (#${okulNo}): ${hesapHatasi?.message}`);
      sonuclar.push({ sinif, okulNo, ad, ogrenciSifre: "", veliKodu: "", durum: "HATA: " + (hesapHatasi?.message ?? "bilinmiyor") });
      hatali++;
      continue;
    }

    const kod = rastgeleKod();
    const { error: veliHatasi } = await admin.from("veli_link_requests").insert({
      student_id: created.user.id, veli_ad: "Veli", veli_telefon: "0000000000",
      durum: "onaylandi", kod, onaylanma_at: new Date().toISOString(),
    });
    if (veliHatasi) console.error(`  ⚠ ${ad}: veli kodu oluşturulamadı - ${veliHatasi.message}`);

    const { error: izinliHatasi } = await admin.from("izinli_ogrenciler").upsert(
      { school_id: okul.id, ad_soyad: ad }, { onConflict: "school_id,ad_soyad", ignoreDuplicates: true },
    );
    if (izinliHatasi) console.error(`  ⚠ ${ad}: izinli listeye eklenemedi - ${izinliHatasi.message}`);

    console.log(`✓ ${ad} (#${okulNo}, ${sinif})`);
    sonuclar.push({ sinif, okulNo, ad, ogrenciSifre: sifre, veliKodu: veliHatasi ? "" : kod, durum: "eklendi" });
    basarili++;
  }

  const basliklar = ["sinif", "okulNo", "ad", "ogrenciSifre", "veliKodu", "durum"];
  const csv = [basliklar.join(",")]
    .concat(sonuclar.map((s) => basliklar.map((b) => `"${String(s[b]).replace(/"/g, '""')}"`).join(",")))
    .join("\n");
  writeFileSync(new URL("../dokumanlar/toplu_yukleme_sonuc.csv", import.meta.url), "﻿" + csv, "utf-8");

  console.log(`\nTamamlandı: ${basarili} eklendi, ${atlanan} atlandı, ${hatali} hata.`);
  console.log("Sonuç: dokumanlar/toplu_yukleme_sonuc.csv");
}

main().catch((e) => {
  console.error("Hata:", e.message);
  process.exit(1);
});
