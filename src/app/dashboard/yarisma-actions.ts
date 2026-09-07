"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Sosyal etkinlik / yarışma (revizyon_2 madde 2) — veri girişi öğretmen,
// okul moderatörü ve okul müdürü tarafından yapılabilir; sadece okul
// kurumlarında faal. Yazma işlemleri rol doğrulamasından sonra service-role
// ile yapılır (projedeki mevcut desenle aynı, bkz. etkinlik-actions.ts).
async function kullanici() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user, admin: createAdminClient() };
}

// Giriş yetkisi: okul kurumunda öğretmen / müdür / okul moderatörü.
async function girisYetkilisi() {
  const k = await kullanici();
  const { data: t } = await k.admin
    .from("teachers")
    .select("school_id, profiles!teachers_id_fkey(role), schools!teachers_school_id_fkey(tur)")
    .eq("id", k.user.id)
    .single();
  const rol = (t?.profiles as unknown as { role: string } | null)?.role;
  const tur = (t?.schools as unknown as { tur: string } | null)?.tur;
  if (t && tur === "okul" && (rol === "ogretmen" || rol === "mudur")) {
    return { ...k, error: null, schoolId: t.school_id as string };
  }
  // Okul moderatörü (school_moderators kaydı olan)
  const { data: mod } = await k.admin.from("school_moderators").select("school_id").eq("profile_id", k.user.id).maybeSingle();
  if (mod) {
    const { data: s } = await k.admin.from("schools").select("tur").eq("id", mod.school_id).maybeSingle();
    if (s?.tur === "okul") return { ...k, error: null, schoolId: mod.school_id as string };
  }
  return { ...k, error: "Bu bölüm yalnızca okullardaki öğretmen, müdür ve moderatörlere açıktır.", schoolId: null };
}

const yenile = () => revalidatePath("/dashboard/takvim");

export type YarismaTuru = "proje" | "yarisma" | "program";

export async function yarismaEkle(input: { isim: string; tur: YarismaTuru; tarih: string; sonBasvuruTarihi?: string }) {
  const k = await girisYetkilisi();
  if (k.error || !k.schoolId) return { error: k.error };
  const isim = input.isim.trim();
  if (isim.length < 2 || isim.length > 200) return { error: "Etkinlik adı 2-200 karakter olmalıdır." };
  if (!["proje", "yarisma", "program"].includes(input.tur)) return { error: "Geçerli bir etkinlik türü seçin." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarih)) return { error: "Geçerli bir tarih girin." };
  if (input.sonBasvuruTarihi && !/^\d{4}-\d{2}-\d{2}$/.test(input.sonBasvuruTarihi)) return { error: "Son başvuru tarihi geçerli bir tarih olmalıdır." };
  const { error } = await k.admin.from("yarismalar").insert({
    school_id: k.schoolId,
    teacher_id: k.user.id,
    isim,
    tur: input.tur,
    tarih: input.tarih,
    son_basvuru_tarihi: input.sonBasvuruTarihi || null,
  });
  yenile();
  return { error: error?.message ?? null };
}

export async function yarismaSil(id: string) {
  const k = await girisYetkilisi();
  if (k.error || !k.schoolId) return { error: k.error };
  const { error } = await k.admin.from("yarismalar").delete().eq("id", id).eq("school_id", k.schoolId);
  yenile();
  return { error: error?.message ?? null };
}

// Tarihi geçenler pasifleşir ama ajandada korunur (aktif=false) — revizyon_2 madde 1.
export async function yarismaAktifDegistir(id: string) {
  const k = await girisYetkilisi();
  if (k.error || !k.schoolId) return { error: k.error };
  const { data: y } = await k.admin.from("yarismalar").select("aktif").eq("id", id).eq("school_id", k.schoolId).maybeSingle();
  if (!y) return { error: "Etkinlik bulunamadı." };
  const { error } = await k.admin.from("yarismalar").update({ aktif: !y.aktif }).eq("id", id);
  yenile();
  return { error: error?.message ?? null };
}

// "Okudum" onayı (revizyon_2 madde 2) — öğretmen görevi okuduğunu
// işaretleyince kayıt ajandada ilgili tarihe yerleşir (okundu bilgisi
// Takvim bileşenine prop olarak iner).
export async function etkinlikOkudum(yarismaId: string) {
  const k = await kullanici();
  await k.admin.from("gorev_okuma_onaylari").upsert(
    { teacher_id: k.user.id, etkinlik_id: yarismaId, okudum: true, okunma_tarihi: new Date().toISOString() },
    { onConflict: "teacher_id,etkinlik_id" },
  );
  yenile();
  return { error: null };
}
