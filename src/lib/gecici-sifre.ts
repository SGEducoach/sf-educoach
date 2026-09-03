import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const HASH_ALANI = "sifre_sifirlama_hash";
const SON_KULLANMA_ALANI = "sifre_sifirlama_son_kullanma";

export function guvenliGeciciSifre() {
  const harfler = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const rakamlar = "23456789";
  const ozelKarakterler = "!@#$%*.,";
  const tumu = harfler + rakamlar + ozelKarakterler;
  const sec = (kaynak: string) => kaynak[randomInt(kaynak.length)];
  const karakterler = [sec(harfler), sec(rakamlar), sec(ozelKarakterler)];
  while (karakterler.length < 12) karakterler.push(sec(tumu));
  for (let i = karakterler.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [karakterler[i], karakterler[j]] = [karakterler[j], karakterler[i]];
  }
  return karakterler.join("");
}

function hashAnahtari() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function geciciSifreHash(sifre: string) {
  return createHmac("sha256", hashAnahtari()).update(sifre).digest("hex");
}

export function geciciSifreMetadata(sifre: string, sonKullanma: Date) {
  return {
    [HASH_ALANI]: geciciSifreHash(sifre),
    [SON_KULLANMA_ALANI]: sonKullanma.toISOString(),
  };
}

function hashEsitMi(sol: string, sag: string) {
  const solBuffer = Buffer.from(sol, "hex");
  const sagBuffer = Buffer.from(sag, "hex");
  return solBuffer.length === sagBuffer.length && timingSafeEqual(solBuffer, sagBuffer);
}

/**
 * E-postadaki geçici şifre ilk kez kullanıldığında gerçek Auth şifresine
 * dönüştürülür. Böylece sıfırlama isteyen biri mevcut şifreyi hemen geçersiz
 * kılamaz; eski şifre, geçici şifre kullanılana kadar çalışmaya devam eder.
 */
export async function geciciSifreyiEtkinlestir(
  admin: SupabaseClient,
  userId: string,
  girilenSifre: string,
) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return false;

  const metadata = data.user.user_metadata ?? {};
  const kayitliHash = metadata[HASH_ALANI];
  const sonKullanma = metadata[SON_KULLANMA_ALANI];
  if (typeof kayitliHash !== "string" || typeof sonKullanma !== "string") return false;
  if (new Date(sonKullanma).getTime() <= Date.now()) return false;
  if (!hashEsitMi(kayitliHash, geciciSifreHash(girilenSifre))) return false;

  // GoTrue user_metadata güncellemesini birleştirerek uygulayabildiği için
  // alanları silmek yerine açıkça null yapıyoruz; böylece aynı geçici şifre
  // ikinci kez etkinleştirilemez.
  const temizMetadata = {
    ...metadata,
    [HASH_ALANI]: null,
    [SON_KULLANMA_ALANI]: null,
  };

  const { error: sifreHatasi } = await admin.auth.admin.updateUserById(userId, {
    password: girilenSifre,
    user_metadata: temizMetadata,
  });
  if (sifreHatasi) return false;

  await admin.from("profiles").update({ gecici_sifre: true }).eq("id", userId).neq("role", "admin");
  return true;
}
