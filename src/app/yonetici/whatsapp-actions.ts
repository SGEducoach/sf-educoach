"use server";

// WhatsApp duyuru sisteminin admin yönetimi (kullanıcı isteği 18.10.2026,
// migration 0162): şablon adı/başlığı/gizleme, şablon fotoğrafları, kurum
// logosu ve kurumun yurt listesi verisi (cinsiyet bilgisini admin de girer —
// bkz. yurt-cinsiyet-actions.ts). Her işlem admin doğrulanarak service-role
// ile yapılır ve işlem geçmişine yazılır.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sablonTanimi } from "@/lib/whatsapp-sablon-ayarlari";
import { yurtVerisiGetir } from "@/lib/yurt-listesi-verisi";
import type { YurtVerisi } from "@/components/dashboard/YurtListeStudyosu";

const IZINLI = ["image/png", "image/jpeg", "image/webp"];
const UUID = /^[0-9a-f-]{36}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { user, admin: createAdminClient() };
}

type Admin = ReturnType<typeof createAdminClient>;
async function kaydet(admin: Admin, actorId: string, eylem: string, detay: Record<string, unknown>) {
  await admin.from("admin_audit_log").insert({ actor_id: actorId, eylem, detay });
}
function yenile() {
  revalidatePath("/yonetici");
  revalidatePath("/dashboard");
}

export async function sablonAyariKaydet(anahtar: string, girdi: { ad: string; baslik: string; gizli: boolean }): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  const t = sablonTanimi(anahtar);
  if (!t) return { error: "Şablon bulunamadı." };
  const ad = girdi.ad.trim().replace(/\s+/g, " ");
  const baslik = girdi.baslik.trim().replace(/\s+/g, " ");
  if (ad && (ad.length < 2 || ad.length > 60)) return { error: "Ad 2–60 karakter olmalı." };
  if (baslik && (baslik.length < 2 || baslik.length > 80)) return { error: "Başlık 2–80 karakter olmalı." };
  const { error } = await admin.from("whatsapp_sablon_ayarlari").upsert({
    anahtar, ad: ad && ad !== t.ad ? ad : null, baslik: t.baslik !== null && baslik && baslik !== t.baslik ? baslik : null,
    gizli: girdi.gizli, guncelleyen_id: user.id, updated_at: new Date().toISOString(),
  }, { onConflict: "anahtar" });
  if (error) return { error: error.message };
  await kaydet(admin, user.id, "whatsapp_sablon_ayari", { anahtar, ad, baslik, gizli: girdi.gizli });
  yenile();
  return { error: null };
}

export async function yerlesikFotoGizle(anahtar: string, gizli: boolean): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  if (!sablonTanimi(anahtar)) return { error: "Şablon bulunamadı." };
  const { data: mevcut } = await admin.from("whatsapp_sablon_ayarlari").select("anahtar").eq("anahtar", anahtar).maybeSingle();
  const { error } = mevcut
    ? await admin.from("whatsapp_sablon_ayarlari").update({ yerlesik_foto_gizli: gizli, guncelleyen_id: user.id, updated_at: new Date().toISOString() }).eq("anahtar", anahtar)
    : await admin.from("whatsapp_sablon_ayarlari").insert({ anahtar, yerlesik_foto_gizli: gizli, guncelleyen_id: user.id });
  if (error) return { error: error.message };
  await kaydet(admin, user.id, "whatsapp_yerlesik_foto", { anahtar, gizli });
  yenile();
  return { error: null };
}

export async function sablonFotografiYukle(formData: FormData): Promise<{ error: string | null; eklenen: number }> {
  const { user, admin } = await requireAdmin();
  const anahtar = String(formData.get("anahtar") ?? "");
  if (!sablonTanimi(anahtar)) return { error: "Şablon bulunamadı.", eklenen: 0 };
  const dosyalar = formData.getAll("foto").filter((f): f is File => f instanceof File && f.size > 0);
  if (dosyalar.length === 0) return { error: "Fotoğraf seçin.", eklenen: 0 };
  if (dosyalar.length > 10) return { error: "Tek seferde en çok 10 fotoğraf.", eklenen: 0 };
  for (const d of dosyalar) {
    if (!IZINLI.includes(d.type)) return { error: `${d.name}: PNG, JPG ya da WEBP olmalı.`, eklenen: 0 };
    if (d.size > 3 * 1024 * 1024) return { error: `${d.name}: en fazla 3 MB olabilir.`, eklenen: 0 };
  }
  const { count } = await admin.from("whatsapp_sablon_fotograflari").select("id", { count: "exact", head: true }).eq("anahtar", anahtar);
  let sira = count ?? 0;
  let eklenen = 0;
  for (const d of dosyalar) {
    const id = crypto.randomUUID();
    const yol = `${anahtar}/${id}`;
    const { error: e1 } = await admin.storage.from("duyuru-fotograflari").upload(yol, Buffer.from(await d.arrayBuffer()), { contentType: d.type });
    if (e1) return { error: `Yüklenemedi: ${e1.message}`, eklenen };
    const { error: e2 } = await admin.from("whatsapp_sablon_fotograflari").insert({ id, anahtar, dosya_yolu: yol, sira: sira++, olusturan_id: user.id });
    if (e2) { await admin.storage.from("duyuru-fotograflari").remove([yol]); return { error: e2.message, eklenen }; }
    eklenen++;
  }
  await kaydet(admin, user.id, "whatsapp_foto_ekle", { anahtar, sayi: eklenen });
  yenile();
  return { error: null, eklenen };
}

export async function sablonFotografiSil(id: string): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  if (!UUID.test(id)) return { error: "Geçersiz fotoğraf." };
  const { data: satir } = await admin.from("whatsapp_sablon_fotograflari").select("anahtar, dosya_yolu").eq("id", id).maybeSingle();
  if (!satir) return { error: "Fotoğraf bulunamadı." };
  const { error } = await admin.from("whatsapp_sablon_fotograflari").delete().eq("id", id);
  if (error) return { error: error.message };
  await admin.storage.from("duyuru-fotograflari").remove([satir.dosya_yolu]);
  await kaydet(admin, user.id, "whatsapp_foto_sil", { anahtar: satir.anahtar, id });
  yenile();
  return { error: null };
}

// Admin kurum adına logo yükler/kaldırır (müdürün yaptığı iş).
export async function adminKurumLogosuYukle(formData: FormData): Promise<{ error: string | null; logoAdresi: string | null }> {
  const { user, admin } = await requireAdmin();
  const okul = String(formData.get("okul") ?? "");
  const dosya = formData.get("logo");
  if (!UUID.test(okul)) return { error: "Kurum seçin.", logoAdresi: null };
  if (!(dosya instanceof File) || dosya.size === 0) return { error: "Bir logo dosyası seçin.", logoAdresi: null };
  if (!IZINLI.includes(dosya.type)) return { error: "Logo PNG, JPG ya da WEBP olmalı.", logoAdresi: null };
  if (dosya.size > 1024 * 1024) return { error: "Logo en fazla 1 MB olabilir.", logoAdresi: null };
  const { error: e1 } = await admin.storage.from("kurum-logolari").upload(`${okul}/logo`, Buffer.from(await dosya.arrayBuffer()), { contentType: dosya.type, upsert: true });
  if (e1) return { error: `Logo yüklenemedi: ${e1.message}`, logoAdresi: null };
  const logoAdresi = `/api/kurum-logo?okul=${okul}&v=${Date.now()}`;
  const { error } = await admin.from("schools").update({ logo_url: logoAdresi }).eq("id", okul);
  if (error) return { error: error.message, logoAdresi: null };
  await kaydet(admin, user.id, "kurum_logosu_yukle", { school_id: okul, admin: true });
  yenile();
  return { error: null, logoAdresi };
}

export async function adminKurumLogosuKaldir(okul: string): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  if (!UUID.test(okul)) return { error: "Kurum seçin." };
  const { error } = await admin.from("schools").update({ logo_url: null }).eq("id", okul);
  if (error) return { error: error.message };
  await admin.storage.from("kurum-logolari").remove([`${okul}/logo`]);
  await kaydet(admin, user.id, "kurum_logosu_kaldir", { school_id: okul });
  yenile();
  return { error: null };
}

export async function adminKurumWhatsappVerisi(okul: string): Promise<{ error: string | null; logoAdresi: string | null; yurtlu: boolean; yurt: YurtVerisi | null }> {
  const { user, admin } = await requireAdmin();
  if (!UUID.test(okul)) return { error: "Kurum seçin.", logoAdresi: null, yurtlu: false, yurt: null };
  const { data: kurum, error } = await admin.from("schools").select("logo_url, yurtlu").eq("id", okul).maybeSingle();
  if (error || !kurum) return { error: error?.message ?? "Kurum bulunamadı.", logoAdresi: null, yurtlu: false, yurt: null };
  const yurt = kurum.yurtlu ? { ...(await yurtVerisiGetir(admin, okul, user.id, true)), okulId: okul, hazirlayan: "Yönetici" } : null;
  return { error: null, logoAdresi: kurum.logo_url ?? null, yurtlu: kurum.yurtlu === true, yurt };
}
