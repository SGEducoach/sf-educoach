import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adSoyadAyir } from "@/lib/mezun";
import { telefonuNormallestir } from "@/lib/sms-telefon";
import { MEZUN_EDILEBILIR_SEVIYE, gercekEposta, mezuniyetYiliBelirle } from "@/lib/mezun-hesap-kurallari";

// Mezun hesabı (migration 0188). Öğrenci hesabı silinmez: Mezun Takip kaydı
// oluşturulur (yoksa), öğrenci sınıftan çıkar (class_id boş; okul listesi
// satırı silinmez — yazılı sonuçları korunur) ve rolü "mezun" olur. Çağıran
// taraf yetkiyi (moderatör/admin, kurum) doğrulamış olmalıdır.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

type OgrenciSatiri = {
  id: string; okul_no: string | null;
  classes: { seviye: string } | null;
  profiles: { ad: string; email: string | null; telefon: string | null; role: string } | null;
};

export async function ogrencileriMezunEt(admin: Istemci, girdi: { schoolId: string; studentIds: string[]; yapanId: string; bugun: string }): Promise<{ mezunEdilen: number; atlanan: number; error: string | null }> {
  const idler = [...new Set(girdi.studentIds)].slice(0, 500);
  if (idler.length === 0) return { mezunEdilen: 0, atlanan: 0, error: null };
  const { data, error: okumaHatasi } = await admin.from("students")
    .select("id, okul_no, classes(seviye), profiles!students_id_fkey(ad, email, telefon, role)")
    .eq("school_id", girdi.schoolId).in("id", idler);
  if (okumaHatasi) return { mezunEdilen: 0, atlanan: idler.length, error: okumaHatasi.message };
  // Yalnız kurumun 12. sınıftaki öğrenci hesapları; diğerleri sessizce atlanır.
  const uygun = ((data ?? []) as unknown as OgrenciSatiri[])
    .filter((o) => o.profiles?.role === "ogrenci" && o.classes?.seviye === MEZUN_EDILEBILIR_SEVIYE);
  if (uygun.length === 0) return { mezunEdilen: 0, atlanan: idler.length, error: "Seçilenler arasında mezun edilebilecek 12. sınıf öğrencisi yok." };
  const uygunIdler = uygun.map((o) => o.id);

  // 1) Mezun Takip kaydı (otomatik aktarım ya da PDF ile zaten eklenmişse dokunulmaz).
  const { data: mevcut } = await admin.from("mezunlar").select("student_id").eq("school_id", girdi.schoolId).in("student_id", uygunIdler);
  const kayitli = new Set(((mevcut ?? []) as { student_id: string }[]).map((m) => m.student_id));
  const yil = mezuniyetYiliBelirle(girdi.bugun);
  const yeniler = uygun.filter((o) => !kayitli.has(o.id) && o.profiles?.ad?.trim()).map((o) => {
    const { ad, soyad } = adSoyadAyir(o.profiles!.ad);
    return {
      school_id: girdi.schoolId, ad, soyad, eposta: gercekEposta(o.profiles!.email), telefon: telefonuNormallestir(o.profiles!.telefon),
      mezuniyet_yili: yil, okul_no: o.okul_no, student_id: o.id, kaynak: "elle", ekleyen_id: girdi.yapanId,
    };
  });
  if (yeniler.length > 0) {
    const { error } = await admin.from("mezunlar").insert(yeniler);
    if (error) return { mezunEdilen: 0, atlanan: idler.length, error: `Mezun kaydı yazılamadı: ${error.message}` };
  }

  // 2) Önce rol: migration 0188 uygulanmamışsa ("mezun" değeri yok) burada
  // durur ve öğrenci sınıfından çıkmaz. 3) Sınıftan çıkar (öğrenci + okul
  // listesi satırı); bu adım başarısız olursa rol geri alınır.
  const { error: rolHatasi } = await admin.from("profiles").update({ role: "mezun" }).in("id", uygunIdler);
  if (rolHatasi) return { mezunEdilen: 0, atlanan: idler.length, error: `Rol değiştirilemedi: ${rolHatasi.message}` };
  const { error: sinifHatasi } = await admin.from("students").update({ class_id: null }).in("id", uygunIdler);
  if (sinifHatasi) {
    await admin.from("profiles").update({ role: "ogrenci" }).in("id", uygunIdler);
    return { mezunEdilen: 0, atlanan: idler.length, error: `Sınıftan çıkarılamadı: ${sinifHatasi.message}` };
  }
  await admin.from("okul_ogrenci_listesi").update({ class_id: null }).in("student_id", uygunIdler);

  await admin.from("admin_audit_log").insert({
    actor_id: girdi.yapanId, eylem: "mezun_et",
    detay: { school_id: girdi.schoolId, ogrenci_sayisi: uygunIdler.length, mezuniyet_yili: yil },
  });
  return { mezunEdilen: uygunIdler.length, atlanan: idler.length - uygunIdler.length, error: null };
}

/** Yanlışlıkla mezun edilen hesabı seçilen sınıfa öğrenci olarak geri alır. Mezun Takip kaydı silinmez. */
export async function mezunuOgrenciyeGeriAl(admin: Istemci, girdi: { schoolId: string; studentId: string; classId: string; yapanId: string }): Promise<{ error: string | null }> {
  const [{ data: ogrenci }, { data: profil }, { data: sinif }] = await Promise.all([
    admin.from("students").select("id").eq("id", girdi.studentId).eq("school_id", girdi.schoolId).maybeSingle(),
    admin.from("profiles").select("role").eq("id", girdi.studentId).maybeSingle(),
    admin.from("classes").select("id").eq("id", girdi.classId).eq("school_id", girdi.schoolId).maybeSingle(),
  ]);
  if (!ogrenci || profil?.role !== "mezun") return { error: "Bu kurumda böyle bir mezun hesabı yok." };
  if (!sinif) return { error: "Sınıf bu kuruma ait değil." };
  const { error: sinifHatasi } = await admin.from("students").update({ class_id: girdi.classId }).eq("id", girdi.studentId);
  if (sinifHatasi) return { error: `Sınıfa alınamadı: ${sinifHatasi.message}` };
  await admin.from("okul_ogrenci_listesi").update({ class_id: girdi.classId }).eq("student_id", girdi.studentId);
  const { error: rolHatasi } = await admin.from("profiles").update({ role: "ogrenci" }).eq("id", girdi.studentId);
  if (rolHatasi) return { error: `Rol değiştirilemedi: ${rolHatasi.message}` };
  await admin.from("admin_audit_log").insert({
    actor_id: girdi.yapanId, eylem: "mezun_geri_al", detay: { school_id: girdi.schoolId, student_id: girdi.studentId, class_id: girdi.classId },
  });
  return { error: null };
}
