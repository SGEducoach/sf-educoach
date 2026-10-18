"use server";

// Yurt öğrencisi işaretleme (kullanıcı isteği 18.10.2026): kurum müdürü ve
// yurt sorumlusu müdür yardımcısı, ön kayıtlılar dahil öğrencileri yurt
// öğrencisi olarak işaretler ya da işareti kaldırır. Anahtar "r:<resmî liste
// id>" ise resmî liste satırı ve (varsa) aynı okul numaralı kayıtlı öğrenci
// birlikte güncellenir; ön kayıtlı öğrenci sonradan kaydolunca işaret resmî
// listeden gelir (bkz. ogrenci_resmi_bilgilerini_uygula). "s:<öğrenci id>"
// resmî listede olmayan kayıtlı öğrencidir.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mudurYardimcisiUyeligiGetir } from "@/lib/mudur-yardimcisi";

const UUID = /^[0-9a-f-]{36}$/i;

export async function yurtDurumuKaydet(anahtarlar: string[], yurt: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const [{ data: profil }, { data: ogretmen }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("teachers").select("school_id").eq("id", user.id).maybeSingle(),
  ]);
  let okul: string | null = profil?.role === "mudur" ? ogretmen?.school_id ?? null : null;
  if (!okul && profil?.role === "ogretmen") {
    const uyelik = await mudurYardimcisiUyeligiGetir(admin, user.id);
    if (uyelik?.yurt) okul = uyelik.schoolId;
  }
  if (!okul) return { error: "Yurt öğrencisi işaretini yalnız kurum müdürü ya da yurt sorumlusu müdür yardımcısı değiştirebilir." };
  if (typeof yurt !== "boolean" || anahtarlar.length === 0 || anahtarlar.length > 600) return { error: "Seçim geçersiz." };

  const resmi = anahtarlar.filter((a) => a.startsWith("r:")).map((a) => a.slice(2));
  const kayitli = anahtarlar.filter((a) => a.startsWith("s:")).map((a) => a.slice(2));
  if (resmi.length + kayitli.length !== anahtarlar.length || ![...resmi, ...kayitli].every((a) => UUID.test(a))) return { error: "Seçim geçersiz." };

  if (resmi.length) {
    const { data: satirlar, error } = await admin.from("resmi_ogrenci_listesi").update({ yurt_ogrencisi: yurt })
      .in("id", resmi).eq("school_id", okul).select("okul_no");
    if (error) return { error: error.message };
    const numaralar = ((satirlar ?? []) as { okul_no: string | null }[]).map((s) => s.okul_no).filter((n): n is string => !!n);
    if (numaralar.length) {
      const { error: e2 } = await admin.from("students").update({ yurt_ogrencisi: yurt }).eq("school_id", okul).in("okul_no", numaralar);
      if (e2) return { error: e2.message };
    }
  }
  if (kayitli.length) {
    const { error } = await admin.from("students").update({ yurt_ogrencisi: yurt }).in("id", kayitli).eq("school_id", okul);
    if (error) return { error: error.message };
  }
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: yurt ? "yurt_ogrencisi_isaretle" : "yurt_ogrencisi_kaldir", detay: { school_id: okul, sayi: anahtarlar.length } });
  revalidatePath("/dashboard", "layout");
  return { error: null };
}
