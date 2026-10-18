"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ogretmeneBildirimGonder } from "@/lib/ogretmen-bildirim";
import { bildirimGonder } from "@/lib/bildirim-gonder";
import { pushGonderProfile } from "@/lib/push-send";
import { mudurYardimcisiUyeligiGetir, yurtSorumlulari } from "@/lib/mudur-yardimcisi";
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

export async function nobetTakasTalebiGonder(input: {
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

  const { data: hedefNobeti } = await admin.from("yurt_nobet_gorevleri")
    .select("id").eq("school_id", schoolId).eq("teacher_id", input.hedefOgretmenId).eq("tarih", nobet.tarih).maybeSingle();
  if (hedefNobeti) return { error: "Seçilen öğretmenin aynı tarihte zaten yurt nöbeti var." };
  const sorumlular = (await yurtSorumlulari(admin, schoolId)).filter((id) => id !== userId);
  if (sorumlular.length === 0) return { error: "Kurumda yurt sorumlusu müdür yardımcısı atanmamış." };

  const { error } = await admin.from("yurt_nobet_takas_talepleri").insert({
    school_id: schoolId, nobet_id: input.nobetId, tarih: nobet.tarih,
    devreden_id: userId, devreden_adi: devredenAd,
    devralan_id: input.hedefOgretmenId, devralan_adi: hedefAd,
  });
  if (error) return { error: error.code === "23505" ? "Bu nöbet için zaten bekleyen bir takas talebi var." : "Takas talebi kaydedilemedi. Veritabanı güncellemesini kontrol edin." };

  await admin.from("admin_audit_log").insert({
    actor_id: userId, eylem: "yurt_nobet_takas_talebi",
    detay: { school_id: schoolId, nobet_id: input.nobetId, tarih: nobet.tarih, devreden: devredenAd, devralan: hedefAd, devralan_id: input.hedefOgretmenId },
  });

  const tarih = new Date(`${nobet.tarih}T12:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric", weekday: "long",
  });
  const mesaj = `${devredenAd}, ${tarih} tarihli yurt nöbetini ${hedefAd} öğretmene devretmek için onayınızı bekliyor.`;
  await Promise.allSettled(sorumlular.map(async (id) => {
    await bildirimGonder(admin, id, "sistem", "Yurt nöbeti takas talebi", mesaj);
    await pushGonderProfile(admin, id, "Yurt nöbeti takas talebi", mesaj);
  }));

  revalidatePath("/dashboard");
  return { error: null };
}

export interface NobetTakasTalebi {
  id: string; tarih: string; devredenAdi: string; devralanAdi: string;
  durum: "bekliyor" | "onaylandi" | "reddedildi"; createdAt: string;
}

export async function nobetTaleplerimGetir(): Promise<{ error: string | null; talepler: NobetTakasTalebi[] }> {
  const baglam = await devirBaglamiGetir();
  if (baglam.error !== null) return { error: baglam.error, talepler: [] };
  const { data, error } = await baglam.admin.from("yurt_nobet_takas_talepleri")
    .select("id, tarih, devreden_adi, devralan_adi, durum, created_at")
    .eq("school_id", baglam.schoolId).eq("devreden_id", baglam.userId)
    .order("created_at", { ascending: false }).limit(20);
  if (error) return { error: "Takas talepleri okunamadı.", talepler: [] };
  return { error: null, talepler: (data ?? []).map((r) => ({
    id: r.id, tarih: r.tarih, devredenAdi: r.devreden_adi, devralanAdi: r.devralan_adi,
    durum: r.durum as NobetTakasTalebi["durum"], createdAt: r.created_at,
  })) };
}

async function yurtOnayYetkisi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const [{ data: profil }, { data: ogretmen }, uyelik] = await Promise.all([
    admin.from("profiles").select("role, aktif").eq("id", user.id).maybeSingle(),
    admin.from("teachers").select("school_id").eq("id", user.id).maybeSingle(),
    mudurYardimcisiUyeligiGetir(admin, user.id),
  ]);
  if (profil?.role !== "ogretmen" || profil.aktif !== true || !uyelik?.yurt || ogretmen?.school_id !== uyelik.schoolId) return null;
  return { admin, userId: user.id, schoolId: uyelik.schoolId };
}

export async function nobetTakasTalepleriGetir(): Promise<{ error: string | null; talepler: NobetTakasTalebi[] }> {
  const yetki = await yurtOnayYetkisi();
  if (!yetki) return { error: "Yurt sorumlusu müdür yardımcısı yetkisi gerekiyor.", talepler: [] };
  const { data, error } = await yetki.admin.from("yurt_nobet_takas_talepleri")
    .select("id, tarih, devreden_adi, devralan_adi, durum, created_at")
    .eq("school_id", yetki.schoolId).eq("durum", "bekliyor")
    .order("created_at", { ascending: true }).limit(100);
  if (error) return { error: "Takas talepleri okunamadı (veritabanı güncellemesi bekleniyor olabilir).", talepler: [] };
  return { error: null, talepler: (data ?? []).map((r) => ({
    id: r.id, tarih: r.tarih, devredenAdi: r.devreden_adi, devralanAdi: r.devralan_adi,
    durum: r.durum as NobetTakasTalebi["durum"], createdAt: r.created_at,
  })) };
}

export async function nobetTakasKarari(talepId: string, karar: "onaylandi" | "reddedildi"): Promise<{ error: string | null }> {
  const yetki = await yurtOnayYetkisi();
  if (!yetki) return { error: "Yurt sorumlusu müdür yardımcısı yetkisi gerekiyor." };
  if (!/^[0-9a-f-]{36}$/i.test(talepId) || (karar !== "onaylandi" && karar !== "reddedildi")) return { error: "Geçersiz istek." };
  const { data, error } = await yetki.admin.rpc("yurt_nobet_takas_karari", {
    p_talep_id: talepId, p_school_id: yetki.schoolId, p_karar_veren_id: yetki.userId, p_karar: karar,
  });
  if (error) return { error: error.code === "23505" ? "Devralacak öğretmenin o tarihte zaten nöbeti var." : error.message };
  const sonuc = data as { tarih: string; devredenId: string; devredenAdi: string; devralanId: string; devralanAdi: string } | null;
  if (!sonuc) return { error: "Takas kararı kaydedilemedi." };

  await yetki.admin.from("admin_audit_log").insert({
    actor_id: yetki.userId, eylem: "yurt_nobet_takas_karari",
    detay: { school_id: yetki.schoolId, talep_id: talepId, karar, tarih: sonuc.tarih, devreden_id: sonuc.devredenId, devralan_id: sonuc.devralanId },
  });
  const baslik = karar === "onaylandi" ? "Yurt nöbeti takası onaylandı" : "Yurt nöbeti takası reddedildi";
  const mesaj = karar === "onaylandi"
    ? `${sonuc.tarih} tarihli yurt nöbetiniz ${sonuc.devralanAdi} öğretmene devredildi.`
    : `${sonuc.tarih} tarihli yurt nöbeti takas talebiniz reddedildi.`;
  await bildirimGonder(yetki.admin, sonuc.devredenId, "sistem", baslik, mesaj);
  if (karar === "onaylandi") {
    await ogretmeneBildirimGonder(yetki.admin, sonuc.devralanId, "yurt_nobeti", "Yurt nöbeti devri", `${sonuc.devredenAdi}, ${sonuc.tarih} tarihli yurt nöbetini size devretti.`);
  }
  revalidatePath("/dashboard");
  return { error: null };
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
