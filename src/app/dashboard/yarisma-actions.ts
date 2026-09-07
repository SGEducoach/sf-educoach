"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bildirimGonder } from "@/lib/bildirim-gonder";
import { pushGonderProfile } from "@/lib/push-send";
import { bugununTarihiTR } from "@/lib/tarih";

export type YarismaTuru = "proje" | "yarisma" | "program" | "diger";
export type AtanabilirOgretmen = { id: string; ad: string; brans: string };
export type SosyalEtkinlik = {
  id: string; isim: string; tur: YarismaTuru; tarih: string;
  sonBasvuruTarihi: string | null; ekleyenAd: string;
  silinebilir: boolean; duzenlenebilir: boolean; aktif: boolean;
  atananlar: string[]; atananOgretmenIds: string[];
};
type Yetki = {
  admin: ReturnType<typeof createAdminClient>; user: { id: string };
  teacher: { school_id: string } | null; schoolId: string | null;
  yoneticiMi: boolean; error: string | null;
};
type EtkinlikGirdisi = { isim: string; tur: YarismaTuru; tarih: string; sonBasvuruTarihi?: string; teacherIds?: string[] };

async function yetki(): Promise<Yetki> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const [{ data: profil }, { data: teacher }, { data: moderator }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("teachers").select("school_id").eq("id", user.id).maybeSingle(),
    admin.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle(),
  ]);
  const schoolId = (teacher?.school_id ?? moderator?.school_id ?? null) as string | null;
  const yoneticiMi = profil?.role === "mudur" || !!moderator;
  if (!schoolId) return { admin, user, teacher: null, schoolId: null, yoneticiMi, error: "Kurum kaydı bulunamadı." };
  const { data: okul } = await admin.from("schools").select("tur").eq("id", schoolId).maybeSingle();
  if (okul?.tur !== "okul" || !(profil?.role === "ogretmen" || profil?.role === "mudur" || moderator)) {
    return { admin, user, teacher, schoolId: null, yoneticiMi, error: "Bu bölüm yalnızca okul öğretmeni, müdürü ve moderatörüne açıktır." };
  }
  return { admin, user, teacher, schoolId, yoneticiMi, error: null };
}

function yenile() {
  revalidatePath("/dashboard/takvim");
  revalidatePath("/dashboard/yarismalar");
  revalidatePath("/moderator");
}
function girdiyiDogrula(input: EtkinlikGirdisi): string | null {
  const isim = input.isim.trim();
  if (isim.length < 2 || isim.length > 200) return "Etkinlik adı 2-200 karakter olmalıdır.";
  if (!["proje", "yarisma", "program", "diger"].includes(input.tur)) return "Geçerli bir etkinlik türü seçin.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarih)) return "Geçerli bir etkinlik tarihi girin.";
  if (input.sonBasvuruTarihi && !/^\d{4}-\d{2}-\d{2}$/.test(input.sonBasvuruTarihi)) return "Son başvuru tarihi geçersiz.";
  return null;
}
async function uygunOgretmenIdleri(k: Yetki, istenen: string[]): Promise<string[]> {
  if (!k.schoolId || !istenen.length) return [];
  const benzersiz = [...new Set(istenen)];
  const { data } = await k.admin.from("teachers").select("id").eq("school_id", k.schoolId).in("id", benzersiz);
  return (data ?? []).map((x) => x.id);
}
async function yeniGorevBildirimi(k: Yetki, teacherIds: string[], isim: string, tarih: string) {
  const baslik = "Yeni göreviniz var.";
  const mesaj = `Sosyal görev eklendi: ${isim} · ${new Date(`${tarih}T12:00:00`).toLocaleDateString("tr-TR")}`;
  await Promise.all(teacherIds.flatMap((teacherId) => [
    bildirimGonder(k.admin, teacherId, "sistem", baslik, mesaj),
    pushGonderProfile(k.admin, teacherId, baslik, mesaj, "/dashboard/takvim"),
  ]));
}
async function gorevGuncellemeBildirimi(k: Yetki, teacherIds: string[], isim: string, tarih: string) {
  const baslik = "Göreviniz güncellendi.";
  const mesaj = `${isim} · ${new Date(`${tarih}T12:00:00`).toLocaleDateString("tr-TR")}`;
  await Promise.all(teacherIds.flatMap((teacherId) => [
    bildirimGonder(k.admin, teacherId, "sistem", baslik, mesaj),
    pushGonderProfile(k.admin, teacherId, baslik, mesaj, "/dashboard/takvim"),
  ]));
}

export async function sosyalEtkinlikleriGetir(): Promise<{ etkinlikler: SosyalEtkinlik[]; ogretmenler: AtanabilirOgretmen[]; atamaYapabilir: boolean; error: string | null }> {
  const k = await yetki();
  if (k.error || !k.schoolId) return { etkinlikler: [], ogretmenler: [], atamaYapabilir: false, error: k.error };
  const bugun = bugununTarihiTR();
  await k.admin.from("yarismalar").update({ aktif: false }).eq("school_id", k.schoolId).eq("aktif", true).lt("tarih", bugun);
  const [{ data: ham, error }, { data: ogretmenHam }] = await Promise.all([
    k.admin.from("yarismalar").select("id,isim,tur,tarih,son_basvuru_tarihi,teacher_id,olusturan_id,aktif").eq("school_id", k.schoolId).order("tarih"),
    k.admin.from("teachers").select("id,brans,profiles!teachers_id_fkey(ad,role)").eq("school_id", k.schoolId),
  ]);
  if (error) return { etkinlikler: [], ogretmenler: [], atamaYapabilir: k.yoneticiMi, error: error.message };
  type OgretmenRow = { id: string; brans: string; profiles: { ad: string; role: string } | null };
  const ogretmenler = ((ogretmenHam as unknown as OgretmenRow[]) ?? [])
    .filter((o) => o.profiles?.role === "ogretmen")
    .map((o) => ({ id: o.id, ad: o.profiles?.ad ?? "İsimsiz", brans: o.brans }))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const tumIds = (ham ?? []).map((x) => x.id);
  const { data: atamalar } = tumIds.length
    ? await k.admin.from("yarisma_ogretmen_atamalari").select("yarisma_id,teacher_id").in("yarisma_id", tumIds)
    : { data: [] };
  const atamaMap = new Map<string, string[]>();
  for (const atama of atamalar ?? []) atamaMap.set(atama.yarisma_id, [...(atamaMap.get(atama.yarisma_id) ?? []), atama.teacher_id]);
  const gorunen = k.yoneticiMi ? (ham ?? []) : (ham ?? []).filter((x) => atamaMap.get(x.id)?.includes(k.user.id));
  const profilIds = gorunen.map((x) => x.olusturan_id ?? x.teacher_id).filter(Boolean) as string[];
  const { data: adlar } = profilIds.length ? await k.admin.from("profiles").select("id,ad").in("id", profilIds) : { data: [] };
  const adMap = new Map((adlar ?? []).map((x) => [x.id, x.ad]));
  const ogretmenMap = new Map(ogretmenler.map((o) => [o.id, o.ad]));
  return {
    etkinlikler: gorunen.map((x) => {
      const atananOgretmenIds = atamaMap.get(x.id) ?? [];
      return {
        id: x.id, isim: x.isim, tur: x.tur as YarismaTuru, tarih: x.tarih,
        sonBasvuruTarihi: x.son_basvuru_tarihi,
        ekleyenAd: adMap.get(x.olusturan_id ?? x.teacher_id) ?? "Kurum yönetimi",
        silinebilir: k.yoneticiMi || (x.olusturan_id ?? x.teacher_id) === k.user.id,
        duzenlenebilir: k.yoneticiMi, aktif: x.aktif,
        atananlar: atananOgretmenIds.map((id) => ogretmenMap.get(id) ?? "Öğretmen"),
        atananOgretmenIds,
      };
    }),
    ogretmenler, atamaYapabilir: k.yoneticiMi, error: null,
  };
}

export async function yarismaEkle(input: EtkinlikGirdisi) {
  const k = await yetki();
  if (k.error || !k.schoolId) return { error: k.error };
  const girdiHatasi = girdiyiDogrula(input);
  if (girdiHatasi) return { error: girdiHatasi };
  const istenen = k.yoneticiMi ? input.teacherIds ?? [] : k.teacher ? [k.user.id] : [];
  const teacherIds = await uygunOgretmenIdleri(k, istenen);
  if (!teacherIds.length) return { error: "En az bir öğretmen seçin." };
  if (teacherIds.length !== new Set(istenen).size) return { error: "Seçilen öğretmenlerden biri bu okula ait değil." };
  const isim = input.isim.trim();
  const { data: kayit, error } = await k.admin.from("yarismalar").insert({
    school_id: k.schoolId, teacher_id: k.teacher ? k.user.id : null, olusturan_id: k.user.id,
    isim, tur: input.tur, tarih: input.tarih, son_basvuru_tarihi: input.sonBasvuruTarihi || null,
  }).select("id").single();
  if (error || !kayit) return { error: error?.message ?? "Etkinlik oluşturulamadı." };
  const { error: atamaHatasi } = await k.admin.from("yarisma_ogretmen_atamalari").insert(
    teacherIds.map((teacher_id) => ({ yarisma_id: kayit.id, teacher_id, atayan_id: k.user.id })),
  );
  if (atamaHatasi) {
    await k.admin.from("yarismalar").delete().eq("id", kayit.id);
    return { error: atamaHatasi.message };
  }
  await yeniGorevBildirimi(k, teacherIds, isim, input.tarih);
  yenile();
  return { error: null };
}

export async function yarismaGuncelle(id: string, input: EtkinlikGirdisi) {
  const k = await yetki();
  if (k.error || !k.schoolId) return { error: k.error };
  if (!k.yoneticiMi) return { error: "Görevleri yalnızca moderatör veya müdür güncelleyebilir." };
  const girdiHatasi = girdiyiDogrula(input);
  if (girdiHatasi) return { error: girdiHatasi };
  const teacherIds = await uygunOgretmenIdleri(k, input.teacherIds ?? []);
  if (!teacherIds.length) return { error: "En az bir öğretmen seçin." };
  if (teacherIds.length !== new Set(input.teacherIds ?? []).size) return { error: "Seçilen öğretmenlerden biri bu okula ait değil." };
  const { data: mevcut } = await k.admin.from("yarismalar").select("id").eq("id", id).eq("school_id", k.schoolId).maybeSingle();
  if (!mevcut) return { error: "Güncellenecek görev bulunamadı." };
  const { data: eskiAtamalar } = await k.admin.from("yarisma_ogretmen_atamalari").select("teacher_id").eq("yarisma_id", id);
  const eskiIds = (eskiAtamalar ?? []).map((x) => x.teacher_id);
  const eklenecekler = teacherIds.filter((teacherId) => !eskiIds.includes(teacherId));
  const cikarilacaklar = eskiIds.filter((teacherId) => !teacherIds.includes(teacherId));
  const isim = input.isim.trim();
  const { error: guncellemeHatasi } = await k.admin.from("yarismalar").update({
    isim, tur: input.tur, tarih: input.tarih, son_basvuru_tarihi: input.sonBasvuruTarihi || null,
    aktif: input.tarih >= bugununTarihiTR(),
  }).eq("id", id).eq("school_id", k.schoolId);
  if (guncellemeHatasi) return { error: guncellemeHatasi.message };
  if (eklenecekler.length) {
    const { error } = await k.admin.from("yarisma_ogretmen_atamalari").insert(
      eklenecekler.map((teacher_id) => ({ yarisma_id: id, teacher_id, atayan_id: k.user.id })),
    );
    if (error) return { error: error.message };
  }
  if (cikarilacaklar.length) {
    const { error } = await k.admin.from("yarisma_ogretmen_atamalari").delete().eq("yarisma_id", id).in("teacher_id", cikarilacaklar);
    if (error) return { error: error.message };
  }
  await Promise.all([
    yeniGorevBildirimi(k, eklenecekler, isim, input.tarih),
    gorevGuncellemeBildirimi(k, teacherIds.filter((teacherId) => !eklenecekler.includes(teacherId)), isim, input.tarih),
  ]);
  yenile();
  return { error: null };
}

export async function yarismaSil(id: string) {
  const k = await yetki();
  if (k.error || !k.schoolId) return { error: k.error };
  if (!k.yoneticiMi) {
    const { data: kayit } = await k.admin.from("yarismalar").select("olusturan_id,teacher_id").eq("id", id).eq("school_id", k.schoolId).maybeSingle();
    if (!kayit || (kayit.olusturan_id ?? kayit.teacher_id) !== k.user.id) return { error: "Yalnızca kendi eklediğiniz etkinliği silebilirsiniz." };
  }
  const { error } = await k.admin.from("yarismalar").delete().eq("id", id).eq("school_id", k.schoolId);
  yenile();
  return { error: error?.message ?? null };
}
