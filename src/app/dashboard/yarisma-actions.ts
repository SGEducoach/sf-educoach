"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type YarismaTuru = "proje" | "yarisma" | "program";
export type SosyalEtkinlik = {
  id: string; isim: string; tur: YarismaTuru; tarih: string;
  sonBasvuruTarihi: string | null; ekleyenAd: string; okundu: boolean;
  kendiMi: boolean; silinebilir: boolean; aktif: boolean;
};

async function yetki() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: profil } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: teacher } = await admin.from("teachers").select("school_id").eq("id", user.id).maybeSingle();
  let schoolId = teacher?.school_id as string | undefined;
  const { data: moderator } = await admin.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle();
  schoolId ||= moderator?.school_id as string | undefined;
  const yoneticiMi = profil?.role === "mudur" || !!moderator;
  if (!schoolId) return { admin, user, teacher: null, schoolId: null, yoneticiMi, error: "Kurum kaydı bulunamadı." };
  const { data: okul } = await admin.from("schools").select("tur").eq("id", schoolId).maybeSingle();
  const uygunRol = profil?.role === "ogretmen" || profil?.role === "mudur" || !!moderator;
  if (okul?.tur !== "okul" || !uygunRol) return { admin, user, teacher, schoolId: null, yoneticiMi, error: "Bu bölüm yalnızca okul öğretmeni, müdürü ve moderatörüne açıktır." };
  return { admin, user, teacher, schoolId, yoneticiMi, error: null };
}

function yenile() {
  revalidatePath("/dashboard/takvim"); revalidatePath("/dashboard/yarismalar"); revalidatePath("/moderator");
}

export async function sosyalEtkinlikleriGetir(): Promise<{ etkinlikler: SosyalEtkinlik[]; error: string | null }> {
  const k = await yetki();
  if (k.error || !k.schoolId) return { etkinlikler: [], error: k.error };
  const bugun = new Date().toISOString().slice(0, 10);
  await k.admin.from("yarismalar").update({ aktif: false }).eq("school_id", k.schoolId).eq("aktif", true).lt("tarih", bugun);
  const { data, error } = await k.admin.from("yarismalar").select("id,isim,tur,tarih,son_basvuru_tarihi,teacher_id,olusturan_id,aktif").eq("school_id", k.schoolId).order("tarih", { ascending: true });
  if (error) return { etkinlikler: [], error: error.message };
  const ids = (data ?? []).map((x) => x.olusturan_id ?? x.teacher_id).filter(Boolean) as string[];
  const { data: adlar } = ids.length ? await k.admin.from("profiles").select("id,ad").in("id", ids) : { data: [] };
  const adMap = new Map((adlar ?? []).map((x) => [x.id, x.ad]));
  const { data: onaylar } = k.teacher ? await k.admin.from("gorev_okuma_onaylari").select("etkinlik_id").eq("teacher_id", k.user.id).eq("okudum", true) : { data: [] };
  const okunan = new Set((onaylar ?? []).map((x) => x.etkinlik_id));
  return { etkinlikler: (data ?? []).map((x) => ({ id: x.id, isim: x.isim, tur: x.tur as YarismaTuru, tarih: x.tarih,
    sonBasvuruTarihi: x.son_basvuru_tarihi, ekleyenAd: adMap.get(x.olusturan_id ?? x.teacher_id) ?? "Kurum yönetimi",
    okundu: okunan.has(x.id), kendiMi: (x.olusturan_id ?? x.teacher_id) === k.user.id,
    silinebilir: k.yoneticiMi || (x.olusturan_id ?? x.teacher_id) === k.user.id, aktif: x.aktif })), error: null };
}

export async function yarismaEkle(input: { isim: string; tur: YarismaTuru; tarih: string; sonBasvuruTarihi?: string }) {
  const k = await yetki(); if (k.error || !k.schoolId) return { error: k.error };
  const isim = input.isim.trim();
  if (isim.length < 2 || isim.length > 200) return { error: "Etkinlik adı 2-200 karakter olmalıdır." };
  if (!(["proje", "yarisma", "program"] as string[]).includes(input.tur)) return { error: "Geçerli bir etkinlik türü seçin." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarih)) return { error: "Geçerli bir etkinlik tarihi girin." };
  if (input.sonBasvuruTarihi && !/^\d{4}-\d{2}-\d{2}$/.test(input.sonBasvuruTarihi)) return { error: "Son başvuru tarihi geçersiz." };
  const { error } = await k.admin.from("yarismalar").insert({ school_id: k.schoolId, teacher_id: k.teacher ? k.user.id : null,
    olusturan_id: k.user.id, isim, tur: input.tur, tarih: input.tarih, son_basvuru_tarihi: input.sonBasvuruTarihi || null });
  yenile(); return { error: error?.message ?? null };
}

export async function yarismaSil(id: string) {
  const k = await yetki(); if (k.error || !k.schoolId) return { error: k.error };
  if (!k.yoneticiMi) {
    const { data: kayit } = await k.admin.from("yarismalar").select("olusturan_id,teacher_id").eq("id", id).eq("school_id", k.schoolId).maybeSingle();
    if (!kayit || (kayit.olusturan_id ?? kayit.teacher_id) !== k.user.id) return { error: "Yalnızca kendi eklediğiniz etkinliği silebilirsiniz." };
  }
  const { error } = await k.admin.from("yarismalar").delete().eq("id", id).eq("school_id", k.schoolId);
  yenile(); return { error: error?.message ?? null };
}

export async function etkinlikOkudum(id: string) {
  const k = await yetki();
  if (k.error || !k.schoolId || !k.teacher) return { error: k.error ?? "Ajanda onayı yalnız öğretmenler içindir." };
  const { data: etkinlik } = await k.admin.from("yarismalar").select("id").eq("id", id).eq("school_id", k.schoolId).maybeSingle();
  if (!etkinlik) return { error: "Etkinlik bu kuruma ait değil." };
  const { error } = await k.admin.from("gorev_okuma_onaylari").upsert({ teacher_id: k.user.id, etkinlik_id: id, okudum: true, okunma_tarihi: new Date().toISOString() }, { onConflict: "teacher_id,etkinlik_id" });
  yenile(); return { error: error?.message ?? null };
}
