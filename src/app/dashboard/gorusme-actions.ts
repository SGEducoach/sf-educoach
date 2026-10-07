"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rehberlikUyeligiGetir } from "@/lib/rehberlik-servisi";
import { gorusmeDogrula, type GorusmeKaydi, type GorusmeTuru } from "@/lib/gorusme";

// Rehberlik görüşme kayıtları (Faz 4, migration 0145).
//
// ÖNEMLİ: burada BİLE BİLE servis anahtarı (admin client) KULLANILMIYOR.
// Gizli veride tek gerçek kapı RLS olmalı; admin istemcisi RLS'i atlar ve
// yetki kontrolünü benim yazdığım if'lere bırakır. Kullanıcının kendi
// istemcisiyle çalışınca 0145 politikaları zorluyor: servis üyesi olmayan
// ya da kapsamı dışındaki öğrenciye yazmaya çalışan sessizce değil, DB
// düzeyinde reddediliyor.
//
// Aşağıdaki üyelik kontrolü yetki için değil, kullanıcıya anlamlı mesaj
// vermek için.

const YETKI_MESAJI = "Bu işlem sadece Rehberlik Servisi üyelerine açıktır.";

export async function gorusmeleriGetir(studentId?: string): Promise<{ error: string | null; kayitlar: GorusmeKaydi[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: YETKI_MESAJI, kayitlar: [] };
  if (!(await rehberlikUyeligiGetir(supabase, user.id))) return { error: YETKI_MESAJI, kayitlar: [] };

  let sorgu = supabase
    .from("rehberlik_gorusmeleri")
    .select("id, student_id, tarih, tur, icerik, rehber_id, students!inner(profiles!students_id_fkey(ad), classes(seviye, sube)), profiles!rehberlik_gorusmeleri_rehber_id_fkey(ad)")
    .order("tarih", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (studentId) sorgu = sorgu.eq("student_id", studentId);

  const { data, error } = await sorgu;
  if (error) return { error: "Görüşme kayıtları okunamadı.", kayitlar: [] };

  // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür (proje notu).
  const tekil = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  type Satir = {
    id: string; student_id: string; tarih: string; tur: string; icerik: string; rehber_id: string | null;
    students: { profiles: { ad: string } | { ad: string }[] | null; classes: { seviye: string; sube: string } | { seviye: string; sube: string }[] | null } | null;
    profiles: { ad: string } | { ad: string }[] | null;
  };

  const kayitlar = ((data ?? []) as unknown as Satir[]).map((s) => {
    const ogrenci = tekil(s.students?.profiles ?? null);
    const sinif = tekil(s.students?.classes ?? null);
    return {
      id: s.id,
      studentId: s.student_id,
      ogrenciAdi: ogrenci?.ad ?? "İsimsiz",
      sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "—",
      rehberAdi: tekil(s.profiles)?.ad ?? "—",
      kendiNotuMu: s.rehber_id === user.id,
      tarih: s.tarih,
      tur: s.tur as GorusmeTuru,
      icerik: s.icerik,
    };
  });
  return { error: null, kayitlar };
}

export async function gorusmeEkle(input: { studentId: string; tarih: string; tur: string; icerik: string }): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: YETKI_MESAJI };
  const uyelik = await rehberlikUyeligiGetir(supabase, user.id);
  if (!uyelik) return { error: YETKI_MESAJI };

  const hata = gorusmeDogrula(input);
  if (hata) return { error: hata };

  // school_id SUNUCUDAN, istemciden değil — istemciye kurum seçtirilmez.
  const { error } = await supabase.from("rehberlik_gorusmeleri").insert({
    student_id: input.studentId,
    rehber_id: user.id,
    school_id: uyelik.schoolId,
    tarih: input.tarih,
    tur: input.tur,
    icerik: input.icerik.trim(),
  });
  if (error) {
    // RLS reddi burada yakalanır: kapsamı dışındaki öğrenciye yazma denemesi.
    return { error: "Görüşme kaydedilemedi. Bu öğrenci sorumlu olduğunuz sınıf düzeylerinde olmayabilir." };
  }
  revalidatePath("/dashboard", "layout");
  return { error: null };
}

export async function gorusmeSil(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: YETKI_MESAJI };
  if (!(await rehberlikUyeligiGetir(supabase, user.id))) return { error: YETKI_MESAJI };

  // Sahiplik kontrolü RLS'te (0145: rehber_id = auth.uid()) — başka rehberin
  // notu silinmeye çalışılırsa 0 satır etkilenir.
  const { error, count } = await supabase
    .from("rehberlik_gorusmeleri").delete({ count: "exact" }).eq("id", id);
  if (error) return { error: "Görüşme silinemedi." };
  if (!count) return { error: "Yalnızca kendi yazdığınız görüşme kaydını silebilirsiniz." };
  revalidatePath("/dashboard", "layout");
  return { error: null };
}
