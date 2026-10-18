"use server";

// Yurt listesi için cinsiyet bilgisi (migration 0161). Yalnız kurum müdürü
// yazar; kayıt service-role ile, hedefin aynı kuruma ait olduğu
// doğrulanarak yapılır. Öğrenci anahtarı "r:<resmî liste id>" (ön kayıt)
// ya da "s:<öğrenci id>" (resmî listede olmayan kayıtlı öğrenci).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f-]{36}$/i;

export async function cinsiyetKaydet(tur: "ogrenci" | "ogretmen", anahtarlar: string[], cinsiyet: string | null): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profil }, { data: ogretmen }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("teachers").select("school_id").eq("id", user.id).maybeSingle(),
  ]);
  if (profil?.role !== "mudur" || !ogretmen?.school_id) return { error: "Cinsiyet bilgisini yalnız kurum müdürü girebilir." };
  const izinli = tur === "ogrenci" ? ["kiz", "erkek"] : ["kadin", "erkek"];
  if (cinsiyet !== null && !izinli.includes(cinsiyet)) return { error: "Geçersiz seçim." };
  if (anahtarlar.length === 0 || anahtarlar.length > 600) return { error: "Seçim geçersiz." };

  const admin = createAdminClient();
  const okul = ogretmen.school_id;
  if (tur === "ogretmen") {
    if (!anahtarlar.every((a) => UUID.test(a))) return { error: "Seçim geçersiz." };
    const { error } = await admin.from("teachers").update({ cinsiyet }).in("id", anahtarlar).eq("school_id", okul);
    if (error) return { error: error.message };
  } else {
    const resmi = anahtarlar.filter((a) => a.startsWith("r:")).map((a) => a.slice(2));
    const kayitli = anahtarlar.filter((a) => a.startsWith("s:")).map((a) => a.slice(2));
    if (resmi.length + kayitli.length !== anahtarlar.length || ![...resmi, ...kayitli].every((a) => UUID.test(a))) return { error: "Seçim geçersiz." };
    if (resmi.length) {
      const { error } = await admin.from("resmi_ogrenci_listesi").update({ cinsiyet }).in("id", resmi).eq("school_id", okul);
      if (error) return { error: error.message };
    }
    if (kayitli.length) {
      const { error } = await admin.from("students").update({ cinsiyet }).in("id", kayitli).eq("school_id", okul);
      if (error) return { error: error.message };
    }
  }
  await supabase.from("admin_audit_log").insert({ actor_id: user.id, eylem: "cinsiyet_kaydet", detay: { school_id: okul, tur, sayi: anahtarlar.length, cinsiyet } });
  revalidatePath("/dashboard");
  return { error: null };
}
