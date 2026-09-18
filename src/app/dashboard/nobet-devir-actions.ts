"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ogretmeneBildirimGonder } from "@/lib/ogretmen-bildirim";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

type DevirBaglami =
  | { error: string; admin: null; userId: null; schoolId: null; devredenAd: null }
  | { error: null; admin: ReturnType<typeof createAdminClient>; userId: string; schoolId: string; devredenAd: string };

async function devirBaglamiGetir(): Promise<DevirBaglami> {
  const hata = (error: string): DevirBaglami => ({
    error, admin: null, userId: null, schoolId: null, devredenAd: null,
  });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return hata("Oturum açılmadı.");

  const admin = createAdminClient();
  const [{ data: profil }, { data: ogretmen }] = await Promise.all([
    admin.from("profiles").select("ad, role, aktif").eq("id", user.id).maybeSingle(),
    admin.from("teachers").select("school_id").eq("id", user.id).maybeSingle(),
  ]);
  if (profil?.role !== "ogretmen" || profil.aktif !== true) {
    return hata("Nöbet devri yalnızca aktif öğretmen hesapları içindir.");
  }
  if (!ogretmen?.school_id) return hata("Okul bilginiz bulunamadı.");

  const { data: okul } = await admin.from("schools").select("tur").eq("id", ogretmen.school_id).maybeSingle();
  if (okul?.tur !== "okul") return hata("Nöbet devri yalnızca okul kurumlarında kullanılabilir.");

  return {
    error: null,
    admin,
    userId: user.id,
    schoolId: ogretmen.school_id as string,
    devredenAd: String(profil.ad ?? "Öğretmen"),
  };
}

export async function nobetDevret(input: {
  nobetId: string;
  hedefOgretmenId: string;
}): Promise<{ error: string | null; warning?: string }> {
  if (!input.nobetId || !input.hedefOgretmenId) return { error: "Nöbet ve öğretmen seçin." };

  const baglam = await devirBaglamiGetir();
  if (baglam.error !== null) return { error: baglam.error };
  const { admin, userId, schoolId, devredenAd } = baglam;
  if (input.hedefOgretmenId === userId) return { error: "Nöbetinizi kendinize devredemezsiniz." };

  const { data: hedef } = await admin
    .from("teachers")
    .select("id, school_id, profiles!teachers_id_fkey(ad, role, aktif)")
    .eq("id", input.hedefOgretmenId)
    .eq("school_id", schoolId)
    .maybeSingle();
  type HedefSatiri = {
    id: string;
    school_id: string;
    profiles: { ad: string | null; role: string | null; aktif: boolean | null } | null;
  };
  const hedefSatiri = hedef as unknown as HedefSatiri | null;
  if (
    !hedefSatiri ||
    hedefSatiri.profiles?.role !== "ogretmen" ||
    hedefSatiri.profiles.aktif !== true
  ) {
    return { error: "Seçilen kişi aynı okuldaki aktif bir öğretmen değil." };
  }
  const hedefAd = hedefSatiri.profiles.ad?.trim();
  if (!hedefAd) return { error: "Seçilen öğretmenin adı bulunamadı." };

  const { data: nobet } = await admin
    .from("yurt_nobet_gorevleri")
    .select("id, tarih")
    .eq("id", input.nobetId)
    .eq("school_id", schoolId)
    .eq("teacher_id", userId)
    .maybeSingle();
  if (!nobet) return { error: "Yurt nöbeti bulunamadı veya artık size ait değil." };
  if (nobet.tarih < bugununTarihiTR()) return { error: "Tarihi geçmiş yurt nöbeti devredilemez." };

  const { data: guncellenen, error } = await admin
    .from("yurt_nobet_gorevleri")
    .update({ teacher_id: input.hedefOgretmenId, ad_soyad: hedefAd })
    .eq("id", input.nobetId)
    .eq("school_id", schoolId)
    .eq("teacher_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    return { error: error.code === "23505" ? "Seçilen öğretmenin aynı tarihte zaten yurt nöbeti var." : error.message };
  }
  if (!guncellenen) return { error: "Yurt nöbeti başka bir işlemde değişti. Sayfayı yenileyip tekrar deneyin." };

  // Devir İşlem Geçmişi'ne yazılır: kimin kime hangi tarihi devrettiği
  // yöneticiye sonradan görünsün (kullanıcıya verilen söz, 17.09.2026).
  const { error: kayitHatasi } = await admin.from("admin_audit_log").insert({
    actor_id: userId,
    eylem: "yurt_nobeti_devret",
    detay: { school_id: schoolId, nobet_id: input.nobetId, tarih: nobet.tarih, devreden: devredenAd, devralan: hedefAd, devralan_id: input.hedefOgretmenId },
  });
  if (kayitHatasi) console.error("Yurt nöbeti devri işlem kaydı yazılamadı:", kayitHatasi.message);

  const tarih = new Date(`${nobet.tarih}T12:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric", weekday: "long",
  });
  const mesaj = `${devredenAd}, ${tarih} tarihli yurt nöbetini size devretti.`;
  const bildirim = await ogretmeneBildirimGonder(admin, input.hedefOgretmenId, "yurt_nobeti", "Yurt nöbeti devri", mesaj);
  if (bildirim.error) console.error("Yurt nöbeti devri bildirimi gönderilemedi:", bildirim.error);

  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return {
    error: null,
    warning: bildirim.error ? "Devir tamamlandı ancak öğretmen bildirimi gönderilemedi." : undefined,
  };
}

// "Nöbet ekle" (kullanıcı isteği 18.09.2026: "takas harici nöbet gelmişse
// nöbet ekle yeterli"): öğretmen listede olmayan ek bir yurt nöbetini
// kendine yazar. Yalnızca kendi adına ekler; ekleyen_id ile işaretlenir ki
// yanlış girdiğinde sadece kendi eklediğini silebilsin (migration 0113).
export async function yurtNobetimiEkle(tarih: string): Promise<{ error: string | null }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return { error: "Geçerli bir tarih seçin." };
  const baglam = await devirBaglamiGetir();
  if (baglam.error !== null) return { error: baglam.error };
  const { admin, userId, schoolId, devredenAd } = baglam;

  const bugun = bugununTarihiTR();
  if (tarih < bugun) return { error: "Geçmiş bir tarihe nöbet eklenemez." };
  if (tarih > tarihEkle(bugun, 365)) return { error: "En fazla bir yıl sonrasına nöbet eklenebilir." };

  const { error } = await admin.from("yurt_nobet_gorevleri").insert({
    school_id: schoolId, ad_soyad: devredenAd, teacher_id: userId, tarih, ekleyen_id: userId,
  });
  if (error) return { error: error.code === "23505" ? "Bu tarihte zaten yurt nöbetiniz var." : error.message };

  await admin.from("admin_audit_log").insert({
    actor_id: userId, eylem: "yurt_nobeti_ekle_ogretmen", detay: { school_id: schoolId, tarih, ogretmen: devredenAd },
  });
  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return { error: null };
}

export async function eklenenYurtNobetimiSil(nobetId: string): Promise<{ error: string | null }> {
  const baglam = await devirBaglamiGetir();
  if (baglam.error !== null) return { error: baglam.error };
  const { admin, userId, schoolId, devredenAd } = baglam;

  // Yalnızca öğretmenin KENDİ eklediği ve hâlâ kendisine ait nöbet silinir;
  // PDF'ten/yöneticiden gelen nöbetlerde ekleyen_id boş olduğundan eşleşmez.
  const { data: silinen, error } = await admin
    .from("yurt_nobet_gorevleri")
    .delete()
    .eq("id", nobetId)
    .eq("school_id", schoolId)
    .eq("teacher_id", userId)
    .eq("ekleyen_id", userId)
    .select("tarih")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!silinen) return { error: "Yalnızca kendi eklediğiniz nöbeti silebilirsiniz." };

  await admin.from("admin_audit_log").insert({
    actor_id: userId, eylem: "yurt_nobeti_sil_ogretmen", detay: { school_id: schoolId, tarih: silinen.tarih, ogretmen: devredenAd },
  });
  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return { error: null };
}
