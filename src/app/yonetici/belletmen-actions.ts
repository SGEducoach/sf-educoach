"use server";

// Kurum dışı belletmen başvuruları (Faz 4, migration 0165): admin onaylar
// ya da reddeder. Onayla hesap açılır (profiles.aktif = true) ve belletmen
// kurumda göreve başlar.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bildirimGonder } from "@/lib/bildirim-gonder";

export interface BelletmenBasvurusu {
  id: string; ad: string; email: string; telefon: string | null; okul: string; cinsiyet: "kadin" | "erkek";
  durum: "bekliyor" | "onaylandi" | "reddedildi"; createdAt: string;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { user, admin: createAdminClient() };
}

export async function belletmenBasvurulariGetir(): Promise<{ error: string | null; basvurular: BelletmenBasvurusu[] }> {
  const { admin } = await requireAdmin();
  const { data, error } = await admin.from("kurum_disi_belletmenler")
    .select("profile_id, cinsiyet, telefon, durum, created_at, schools(ad), profiles!kurum_disi_belletmenler_profile_id_fkey(ad, email)")
    .order("created_at", { ascending: false }).limit(200);
  if (error) return { error: "Başvurular okunamadı (veritabanı güncellemesi bekleniyor olabilir).", basvurular: [] };
  type Row = { profile_id: string; cinsiyet: "kadin" | "erkek"; telefon: string | null; durum: BelletmenBasvurusu["durum"]; created_at: string;
    schools: { ad: string } | { ad: string }[] | null; profiles: { ad: string; email: string } | { ad: string; email: string }[] | null };
  const tek = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  return {
    error: null,
    basvurular: ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.profile_id, ad: tek(r.profiles)?.ad ?? "İsimsiz", email: tek(r.profiles)?.email ?? "", telefon: r.telefon,
      okul: tek(r.schools)?.ad ?? "—", cinsiyet: r.cinsiyet, durum: r.durum, createdAt: r.created_at,
    })),
  };
}

export async function belletmenKarari(profileId: string, karar: "onaylandi" | "reddedildi"): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(profileId) || (karar !== "onaylandi" && karar !== "reddedildi")) return { error: "Geçersiz istek." };
  const { data: kayit } = await admin.from("kurum_disi_belletmenler").select("profile_id").eq("profile_id", profileId).maybeSingle();
  if (!kayit) return { error: "Başvuru bulunamadı." };
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    admin.from("kurum_disi_belletmenler").update({ durum: karar, karar_veren_id: user.id, karar_at: new Date().toISOString() }).eq("profile_id", profileId),
    admin.from("profiles").update({ aktif: karar === "onaylandi" }).eq("id", profileId),
  ]);
  if (e1 || e2) return { error: (e1 ?? e2)!.message };
  if (karar === "onaylandi") {
    await bildirimGonder(admin, profileId, "sistem", "Belletmen başvurunuz onaylandı", "Hoş geldiniz. Panelinizde yoklama listesi ve nöbet bilgileriniz yer alıyor.");
  }
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "belletmen_karari", detay: { profile_id: profileId, karar } });
  revalidatePath("/yonetici", "layout");
  return { error: null };
}
