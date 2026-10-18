"use server";

// Kurum dışı belletmen başvurusu (kullanıcı isteği 18.10.2026, Faz 4,
// migration 0165). Hesap öğretmen olarak açılır ama admin onaylayana kadar
// kapalıdır (profiles.aktif = false); giriş ekranı "onay bekliyor" der.
import { createAdminClient } from "@/lib/supabase/admin";
import { KURUM_DISI_BELLETMEN_BRANSI } from "@/lib/belletmen";
import { sifreGecerliMi, telefonGecerliMi, telefonSanitize } from "@/lib/validators";

const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function belletmenBasvurusuGonder(formData: FormData): Promise<{ error: string | null }> {
  const ad = String(formData.get("ad") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr-TR");
  const telefon = telefonSanitize(String(formData.get("telefon") ?? ""));
  const sifre = String(formData.get("sifre") ?? "");
  const sifreTekrar = String(formData.get("sifreTekrar") ?? "");
  const okul = String(formData.get("okul") ?? "");
  const cinsiyet = String(formData.get("cinsiyet") ?? "");
  const kurallarVersiyon = String(formData.get("kurallarVersiyon") ?? "").slice(0, 60);
  const kurallarOnay = formData.get("kurallar") === "on";

  if (ad.length < 5 || !ad.includes(" ") || ad.length > 80) return { error: "Adınızı ve soyadınızı yazın." };
  if (!EPOSTA.test(email)) return { error: "Geçerli bir e-posta adresi yazın." };
  if (!telefonGecerliMi(telefon)) return { error: "Geçerli bir cep telefonu yazın." };
  if (!sifreGecerliMi(sifre)) return { error: "Şifre kurala uymuyor." };
  if (sifre !== sifreTekrar) return { error: "Şifreler aynı değil." };
  if (cinsiyet !== "kadin" && cinsiyet !== "erkek") return { error: "Cinsiyet seçin." };
  if (!kurallarOnay) return { error: "Kayıt ve kullanım kurallarını onaylayın." };

  const admin = createAdminClient();
  const { data: kurum } = await admin.from("schools").select("id, yurtlu, tur, aktif").eq("id", okul).maybeSingle();
  if (!kurum || !kurum.yurtlu || kurum.tur !== "okul" || kurum.aktif === false) return { error: "Yurtlu bir okul seçin." };

  const { data: yeni, error: hesapHatasi } = await admin.auth.admin.createUser({
    email, password: sifre, email_confirm: true,
    user_metadata: { role: "ogretmen", ad, telefon, school_id: kurum.id, brans: KURUM_DISI_BELLETMEN_BRANSI, kvkk_onay_versiyon: kurallarVersiyon || null },
  });
  if (hesapHatasi || !yeni.user) {
    return { error: /already|registered|exists/i.test(hesapHatasi?.message ?? "") ? "Bu e-posta adresiyle zaten bir hesap var." : "Başvuru oluşturulamadı. Lütfen tekrar deneyin." };
  }
  const id = yeni.user.id;
  // Onaya kadar kapalı; cinsiyet yurt listesindeki grubunu belirler.
  const [{ error: e1 }, { error: e2 }, { error: e3 }] = await Promise.all([
    admin.from("profiles").update({ aktif: false }).eq("id", id),
    admin.from("teachers").update({ cinsiyet }).eq("id", id),
    admin.from("kurum_disi_belletmenler").insert({ profile_id: id, school_id: kurum.id, cinsiyet, telefon }),
  ]);
  if (e1 || e2 || e3) {
    await admin.auth.admin.deleteUser(id);
    return { error: "Başvuru şu an alınamıyor (sistem güncellemesi bekleniyor). Lütfen daha sonra tekrar deneyin." };
  }
  await admin.from("admin_audit_log").insert({ actor_id: id, eylem: "belletmen_basvurusu", detay: { school_id: kurum.id } });
  return { error: null };
}
