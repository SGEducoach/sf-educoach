// Kalıcı örnek/test hesapları oluşturur (öğrenci, öğretmen, veli).
// Çalıştırma: node scripts/seed-demo-users.mjs
// Gerekli: .env.local içinde NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// .env.local'i basitçe oku (dotenv kurulu değilse diye)
const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const SIFRE = "Ornek123!";
const OGRETMEN_EMAIL = "ornek.ogretmen@sgeducoach.test";
const OGRENCI_EMAIL = "ornek.ogrenci@sgeducoach.test";
const OGRENCI_OKUL_NO = "1";
const VELI_KOD = "ORNEK123";

async function main() {
  const { data: school } = await admin.from("schools").select("id").eq("ad", "Elbistan Bist Fen Lisesi").single();
  const { data: klas } = await admin.from("classes").select("id").eq("school_id", school.id).eq("seviye", "11").eq("sube", "C").single();

  // --- Öğretmen ---
  let { data: mevcutOgretmen } = await admin.from("profiles").select("id").eq("email", OGRETMEN_EMAIL).maybeSingle();
  let ogretmenId = mevcutOgretmen?.id;
  if (!ogretmenId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: OGRETMEN_EMAIL, password: SIFRE, email_confirm: true,
      user_metadata: { role: "ogretmen", ad: "Örnek Öğretmen", telefon: "5550000001", school_id: school.id, class_id: klas.id, brans: "Matematik" },
    });
    if (error) throw new Error("Öğretmen oluşturulamadı: " + error.message);
    ogretmenId = created.user.id;
    console.log("✓ Örnek Öğretmen oluşturuldu:", OGRETMEN_EMAIL, SIFRE);
  } else {
    console.log("• Örnek Öğretmen zaten var:", OGRETMEN_EMAIL, SIFRE);
  }

  // --- Öğrenci ---
  let { data: mevcutOgrenci } = await admin.from("profiles").select("id").eq("email", OGRENCI_EMAIL).maybeSingle();
  let ogrenciId = mevcutOgrenci?.id;
  if (!ogrenciId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: OGRENCI_EMAIL, password: SIFRE, email_confirm: true,
      user_metadata: {
        role: "ogrenci", ad: "Örnek Öğrenci", telefon: "5550000002", okul_no: OGRENCI_OKUL_NO,
        school_id: school.id, class_id: klas.id, ayt_alan: "SAY", hedef_bolum: "Bilgisayar Mühendisliği",
      },
    });
    if (error) throw new Error("Öğrenci oluşturulamadı: " + error.message);
    ogrenciId = created.user.id;
    console.log(`✓ Örnek Öğrenci oluşturuldu: okul no ${OGRENCI_OKUL_NO}, şifre ${SIFRE}`);
  } else {
    console.log(`• Örnek Öğrenci zaten var: okul no ${OGRENCI_OKUL_NO}, şifre ${SIFRE}`);
  }

  // --- Veli (onaylı talep + sabit kod ile) ---
  let { data: mevcutTalep } = await admin.from("veli_link_requests").select("id, durum").eq("student_id", ogrenciId).eq("kod", VELI_KOD).maybeSingle();
  let requestId = mevcutTalep?.id;
  if (!requestId) {
    const { data: created, error } = await admin.from("veli_link_requests").insert({
      student_id: ogrenciId, veli_ad: "Örnek Veli", veli_telefon: "5550000003",
      durum: "onaylandi", kod: VELI_KOD, onaylanma_at: new Date().toISOString(),
    }).select("id").single();
    if (error) throw new Error("Veli talebi oluşturulamadı: " + error.message);
    requestId = created.id;
  }

  const veliSyntheticEmail = `veli+${requestId}@sgeducoach.internal`;
  const { data: mevcutVeliProfil } = await admin.from("profiles").select("id").eq("email", veliSyntheticEmail).maybeSingle();
  if (!mevcutVeliProfil) {
    const { error } = await admin.auth.admin.createUser({
      email: veliSyntheticEmail, password: VELI_KOD, email_confirm: true,
      user_metadata: { role: "veli", ad: "Örnek Veli", telefon: "5550000003", request_id: requestId },
    });
    if (error) throw new Error("Veli oluşturulamadı: " + error.message);
    console.log(`✓ Örnek Veli oluşturuldu: okul no ${OGRENCI_OKUL_NO}, kod ${VELI_KOD}`);
  } else {
    console.log(`• Örnek Veli zaten var: okul no ${OGRENCI_OKUL_NO}, kod ${VELI_KOD}`);
  }

  console.log("\n--- Giriş bilgileri ---");
  console.log("Öğretmen: ", OGRETMEN_EMAIL, "/", SIFRE);
  console.log("Öğrenci:  okul no", OGRENCI_OKUL_NO, "/ şifre", SIFRE);
  console.log("Veli:     okul no", OGRENCI_OKUL_NO, "/ kod", VELI_KOD);
}

main().catch((e) => { console.error(e); process.exit(1); });
