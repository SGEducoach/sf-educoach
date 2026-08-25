"use server";

// Öğretmen Ders Programı + Yurt Nöbeti (2026-08-25 kullanıcı isteği) —
// bkz. migration 0066, src/lib/ders-programi.ts. Ders programını SADECE
// admin ve dershane müdürü elle ekleyip silebilir (kullanıcı kararı);
// yurt nöbeti (okula özel) öğretmenin kendi öz-yönetimi (bkz.
// ogretmenDersEkle/Sil deseni, dashboard/actions.ts).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDershaneMudur } from "@/lib/dershane-auth";
import type { DersProgramiGunu } from "@/lib/ders-programi";
import { YURT_NOBETI_SIRA_SAYISI, YURT_NOBETI_SUTUN_SAYISI } from "@/lib/ders-programi";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Admin (tüm okullar/dershaneler) VEYA dershane müdürü (sadece kendi
// dershanesi) — döner: service-role client + çağıranın school_id'si
// (admin için null = sınırsız, dershane müdürü için kendi okulu).
async function requireDersProgramiYetkisi(): Promise<
  { error: string; admin: null; schoolId: null }
  | { error: null; admin: ReturnType<typeof createAdminClient>; schoolId: string | null }
> {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "admin") {
    return { error: null, admin: createAdminClient(), schoolId: null };
  }
  if (profile?.role === "mudur") {
    const { admin, schoolId } = await requireDershaneMudur();
    if (!admin || !schoolId) return { error: "Bu işlem için dershane müdürü yetkisi gerekiyor.", admin: null, schoolId: null };
    return { error: null, admin, schoolId };
  }
  return { error: "Bu işlem için yetkiniz yok.", admin: null, schoolId: null };
}

export async function dersProgramiEkle(input: {
  teacherId: string;
  gun: DersProgramiGunu;
  dersSaatiSira: number;
  classId: string;
  ders: string;
}) {
  const yetki = await requireDersProgramiYetkisi();
  if (yetki.error !== null) return { error: yetki.error };
  const { admin, schoolId } = yetki;

  const [{ data: ogretmen }, { data: sinif }] = await Promise.all([
    admin.from("teachers").select("school_id").eq("id", input.teacherId).maybeSingle(),
    admin.from("classes").select("school_id").eq("id", input.classId).maybeSingle(),
  ]);
  if (!ogretmen) return { error: "Öğretmen bulunamadı." };
  if (!sinif) return { error: "Sınıf bulunamadı." };
  if (schoolId && (ogretmen.school_id !== schoolId || sinif.school_id !== schoolId)) {
    return { error: "Bu öğretmen/sınıf sizin kurumunuza ait değil." };
  }
  if (ogretmen.school_id !== sinif.school_id) return { error: "Sınıf, öğretmenin okuluna ait değil." };

  const { error } = await admin.from("ogretmen_ders_programi").insert({
    teacher_id: input.teacherId,
    gun: input.gun,
    ders_saati_sira: input.dersSaatiSira,
    class_id: input.classId,
    ders: input.ders.trim(),
  });
  if (error) {
    if (error.code === "23505") return { error: "Bu gün ve ders saatinde zaten bir kayıt var." };
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return { error: null };
}

export async function dersProgramiSil(id: string) {
  const yetki = await requireDersProgramiYetkisi();
  if (yetki.error !== null) return { error: yetki.error };
  const { admin, schoolId } = yetki;

  if (schoolId) {
    const { data: kayit } = await admin
      .from("ogretmen_ders_programi")
      .select("teacher_id, teachers!inner(school_id)")
      .eq("id", id)
      .maybeSingle();
    const teacherSchoolId = (kayit as unknown as { teachers: { school_id: string } } | null)?.teachers?.school_id;
    if (!kayit || teacherSchoolId !== schoolId) return { error: "Bu kayıt sizin kurumunuza ait değil." };
  }

  const { error } = await admin.from("ogretmen_ders_programi").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return { error: null };
}

// Yurt Nöbeti — öğretmenin kendi öz-yönetimi, sadece 2×6 tarih hücresi
// (bkz. migration 0066 yorumu). RLS zaten teacher_id = auth.uid() ile
// sınırlıyor, burada sadece sutun/sira aralığı doğrulanıyor.
export async function yurtNobetiKaydet(sutun: number, sira: number, tarih: string | null) {
  const { supabase, user } = await requireUser();
  if (sutun < 1 || sutun > YURT_NOBETI_SUTUN_SAYISI || sira < 1 || sira > YURT_NOBETI_SIRA_SAYISI) {
    return { error: "Geçersiz hücre." };
  }
  const { error } = await supabase
    .from("ogretmen_yurt_nobeti")
    .upsert({ teacher_id: user.id, sutun, sira, tarih: tarih || null }, { onConflict: "teacher_id,sutun,sira" });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}
