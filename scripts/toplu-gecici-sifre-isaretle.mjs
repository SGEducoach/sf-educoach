// Bir kerelik: sentetik "@ogrenci.sgeducoach.internal" e-postalı, hiç giriş
// yapmamış 119 toplu-yükleme öğrenci hesabının:
//   1) Mevcut şifresini siler, YENİ bir rastgele şifre atar (self-signup'taki
//      "kayıt sonunda rastgele şifre" mantığıyla aynı).
//   2) profiles.gecici_sifre = true işaretler — ilk girişte kendi şifresini
//      belirlemeye zorlanır.
// CSV'yi DOĞRUDAN VERİTABANINDAN yeniden üretir (önceki script hatalı bir
// header-parse yüzünden CSV'yi "undefined" değerlerle bozmuştu — bu script
// CSV'ye hiç güvenmeyip students/profiles/veli_link_requests'ten okuyor).
//
// Çalıştırma: node scripts/toplu-gecici-sifre-isaretle.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

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

async function main() {
  const { data: usersData, error: listeHatasi } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listeHatasi) throw listeHatasi;
  const hesaplar = usersData.users.filter((u) => u.email && u.email.endsWith("@ogrenci.sgeducoach.internal"));
  console.log(`Toplu yüklenen hesap: ${hesaplar.length}`);

  const guvensiz = hesaplar.filter((u) => u.last_sign_in_at);
  if (guvensiz.length > 0) {
    console.error(`UYARI: ${guvensiz.length} hesap zaten giriş yapmış, DURDURULDU: ${guvensiz.map((u) => u.email).join(", ")}`);
    process.exit(1);
  }

  const { data: siniflar } = await admin.from("classes").select("id, seviye, sube");
  const sinifMap = new Map((siniflar ?? []).map((c) => [c.id, `${c.seviye}-${c.sube}`]));

  const sonuclar = [];
  let basarili = 0, hatali = 0;
  for (const u of hesaplar) {
    const meta = u.user_metadata ?? {};
    const ad = meta.ad ?? "";
    const okulNo = meta.okul_no ?? "";
    const sinif = sinifMap.get(meta.class_id) ?? "";

    const yeniSifre = rastgeleSifre();
    const { error: sifreHatasi } = await admin.auth.admin.updateUserById(u.id, { password: yeniSifre });
    if (sifreHatasi) {
      console.error(`✗ okul_no=${okulNo} (${ad}): şifre güncellenemedi - ${sifreHatasi.message}`);
      hatali++;
      continue;
    }
    const { error: profilHatasi } = await admin.from("profiles").update({ gecici_sifre: true }).eq("id", u.id);
    if (profilHatasi) console.error(`  ⚠ ${ad}: gecici_sifre işaretlenemedi - ${profilHatasi.message}`);

    const { data: talep } = await admin.from("veli_link_requests").select("kod").eq("student_id", u.id).maybeSingle();

    sonuclar.push({ sinif, okulNo, ad, ogrenciSifre: yeniSifre, veliKodu: talep?.kod ?? "", durum: "eklendi" });
    console.log(`✓ okul_no=${okulNo} (${ad})`);
    basarili++;
  }

  sonuclar.sort((a, b) => a.sinif.localeCompare(b.sinif) || Number(a.okulNo) - Number(b.okulNo));
  const basliklar = ["sinif", "okulNo", "ad", "ogrenciSifre", "veliKodu", "durum"];
  const csv = [basliklar.join(",")]
    .concat(sonuclar.map((s) => basliklar.map((b) => `"${String(s[b]).replace(/"/g, '""')}"`).join(",")))
    .join("\n");
  writeFileSync(new URL("../dokumanlar/toplu_yukleme_sonuc.csv", import.meta.url), "﻿" + csv, "utf-8");

  console.log(`\nTamamlandı: ${basarili} yeni şifre atandı, ${hatali} hata. CSV veritabanından yeniden üretildi.`);
}

main().catch((e) => {
  console.error("Hata:", e.message);
  process.exit(1);
});
