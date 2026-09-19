"use server";

// Grup Koçluk — Faz 5 (kullanıcı kararları 18.09.2026): grup öğrencisi ilk
// girişte tek ekranda yeni şifresini, isteğe bağlı e-postasını, alanını
// (11-12. sınıf), hedef bölümünü ve KVKK + veli onayını verir. Alan ve hedef
// sunucudan yazılır (students_transfer_guard bu alanları yalnızca servis
// anahtarına bırakıyor). E-posta doğrulanınca hesaba geçer (eposta-dogrulama.ts).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hedefBolumNormalize, sifreGecerliMi, SIFRE_IPUCU, teslimEdilebilirEpostaMi } from "@/lib/validators";
import { dokuzOnSinifMi, type AytAlan } from "@/lib/types";
import { GRUP_KVKK_VERSIYON } from "@/lib/grup-kvkk";
import { epostaDogrulamaGonder } from "@/lib/eposta-dogrulama";

const ALANLAR: AytAlan[] = ["SAY", "EA", "SOZ"];

export async function grupAktivasyonuTamamla(input: {
  sifre: string; sifreTekrar: string; email: string; alan: AytAlan; hedefBolum: string; kvkkOnay: boolean; veliOnay: boolean;
}): Promise<{ error: string | null; epostaGonderildi: boolean }> {
  const bos = (error: string) => ({ error, epostaGonderildi: false });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return bos("Oturum açılmadı.");

  const admin = createAdminClient();
  const [{ data: profil }, { data: ogrenci }] = await Promise.all([
    admin.from("profiles").select("ad, role, kvkk_onay_at").eq("id", user.id).maybeSingle(),
    admin.from("students").select("school_id, ayt_alan, classes(seviye), schools(grup_kapasitesi)").eq("id", user.id).maybeSingle(),
  ]);
  type OgrSatir = { school_id: string; ayt_alan: AytAlan; classes: { seviye: string } | { seviye: string }[] | null; schools: { grup_kapasitesi: number | null } | { grup_kapasitesi: number | null }[] | null };
  const o = ogrenci as unknown as OgrSatir | null;
  const tek = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  if (profil?.role !== "ogrenci" || !o || tek(o.schools)?.grup_kapasitesi == null) return bos("Bu adım yalnızca grup öğrencileri içindir.");

  // Doğrulamalar
  if (!sifreGecerliMi(input.sifre)) return bos(`Şifre geçersiz. ${SIFRE_IPUCU}`);
  if (input.sifre !== input.sifreTekrar) return bos("Şifreler aynı değil.");
  const seviye = tek(o.classes)?.seviye;
  const alanSorulur = !dokuzOnSinifMi(seviye);
  if (alanSorulur && !ALANLAR.includes(input.alan)) return bos("Alanını seç.");
  const hedef = hedefBolumNormalize(input.hedefBolum);
  if (hedef.length < 2) return bos("Hedef bölümünü yaz.");
  if (!input.kvkkOnay) return bos("Devam etmek için KVKK aydınlatma metnini onaylaman gerekiyor.");
  if (!input.veliOnay) return bos("Devam etmek için veli onayı beyanını işaretlemen gerekiyor.");
  const email = input.email.trim().toLowerCase();
  if (email) {
    if (!teslimEdilebilirEpostaMi(email)) return bos("Geçerli bir e-posta adresi yaz ya da alanı boş bırak.");
    const { data: kullanan } = await admin.from("profiles").select("id").eq("email", email).neq("id", user.id).maybeSingle();
    if (kullanan) return bos("Bu e-posta adresi başka bir hesapta kullanılıyor.");
  }

  // Şifre kullanıcının kendi oturumuyla değişir (oturum açık kalır).
  const { error: sifreHatasi } = await supabase.auth.updateUser({ password: input.sifre });
  if (sifreHatasi) return bos(sifreHatasi.message);

  const { error: ogrenciHatasi } = await admin.from("students")
    .update({ ayt_alan: alanSorulur ? input.alan : o.ayt_alan, hedef_bolum: hedef }).eq("id", user.id);
  if (ogrenciHatasi) return bos(ogrenciHatasi.message);
  const { error: profilHatasi } = await admin.from("profiles")
    .update({ gecici_sifre: false, kvkk_onay_at: new Date().toISOString(), kvkk_onay_versiyon: GRUP_KVKK_VERSIYON }).eq("id", user.id);
  if (profilHatasi) return bos(profilHatasi.message);

  // E-posta isteğe bağlı: gönderilemezse aktivasyon yine tamamlanır.
  let epostaGonderildi = false;
  if (email) epostaGonderildi = !(await epostaDogrulamaGonder(admin, user.id, profil.ad ?? "", email)).error;

  revalidatePath("/dashboard");
  return { error: null, epostaGonderildi };
}
