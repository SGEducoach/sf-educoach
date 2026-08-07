// Bir hesabın şifresini Admin API ile doğrudan atar ve ekranda bir kerelik
// gösterir. E-posta ile self-servis şifre sıfırlama akışı (mail linki)
// uygulamada henüz yok; bu yüzden acil durumlarda bu script kullanılıyor.
// Çalıştırma: node scripts/set-user-password.mjs kullanici@mail.com [yeni-sifre]
// (yeni şifre verilmezse rastgele üretilir)

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

function rastgeleSifre() {
  const harfler = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const rakamlar = "23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += harfler[Math.floor(Math.random() * harfler.length)];
  for (let i = 0; i < 4; i++) s += rakamlar[Math.floor(Math.random() * rakamlar.length)];
  return s.split("").sort(() => Math.random() - 0.5).join("");
}

const [, , email, verilenSifre] = process.argv;
if (!email) {
  console.error("Kullanım: node scripts/set-user-password.mjs kullanici@mail.com [yeni-sifre]");
  process.exit(1);
}
const yeniSifre = verilenSifre || rastgeleSifre();

async function main() {
  const { data: profile, error: bulmaHatasi } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("email", email)
    .maybeSingle();
  if (bulmaHatasi) throw new Error("Sorgu hatası: " + bulmaHatasi.message);
  if (!profile) throw new Error(`Bu e-postayla hesap bulunamadı: ${email}`);

  console.log(`Bulunan hesap: ${profile.email} (role: ${profile.role})`);

  const { error } = await admin.auth.admin.updateUserById(profile.id, { password: yeniSifre });
  if (error) throw new Error("Şifre güncellenemedi: " + error.message);

  console.log(`\n✓ Yeni şifre: ${yeniSifre}`);
  console.log("(Bu şifre tekrar gösterilmeyecek — kaydedin.)");
}

main().catch((e) => {
  console.error("Hata:", e.message);
  process.exit(1);
});
