// Bir hesabın auth e-postasını GÜVENLİ şekilde değiştirir (Supabase Admin
// API üzerinden). Ham SQL ile auth.users'ı doğrudan güncellemek
// auth.identities ile tutarsızlığa yol açabileceği için bu yol kullanılıyor.
// Çalıştırma: node scripts/set-admin-email.mjs eski@mail.com yeni@mail.com

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const [, , eskiEmail, yeniEmail] = process.argv;
if (!eskiEmail || !yeniEmail) {
  console.error("Kullanım: node scripts/set-admin-email.mjs eski@mail.com yeni@mail.com");
  process.exit(1);
}

async function main() {
  const { data: profile, error: bulmaHatasi } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("email", eskiEmail)
    .maybeSingle();
  if (bulmaHatasi) throw new Error("Sorgu hatası: " + bulmaHatasi.message);
  if (!profile) throw new Error(`Bu e-postayla hesap bulunamadı: ${eskiEmail}`);

  console.log(`Bulunan hesap: ${profile.email} (role: ${profile.role}, id: ${profile.id})`);

  const { error: guncelHatasi } = await admin.auth.admin.updateUserById(profile.id, {
    email: yeniEmail,
    email_confirm: true,
  });
  if (guncelHatasi) throw new Error("Auth e-postası güncellenemedi: " + guncelHatasi.message);
  console.log("✓ Auth e-postası güncellendi.");

  const { error: profilHatasi } = await admin.from("profiles").update({ email: yeniEmail }).eq("id", profile.id);
  if (profilHatasi) {
    console.warn("⚠ profiles.email güncellenemedi (auth tarafı başarılı oldu):", profilHatasi.message);
  } else {
    console.log("✓ profiles.email güncellendi.");
  }

  console.log(`\nTamamlandı: ${eskiEmail} → ${yeniEmail}`);
}

main().catch((e) => {
  console.error("Hata:", e.message);
  process.exit(1);
});
