import "server-only";
import { after } from "next/server";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushGonderProfile } from "@/lib/push-send";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { SITE_ADRESI, ogretmenBildirimEpostasi } from "@/lib/ogretmen-bildirim-sablon";
import type { KurumTuru, UserRole } from "@/lib/types";

// Öğretmene ders programı / yurt nöbeti bildirimi (kullanıcı isteği
// 12.09.2026): panel bildirimi (bildirimler) + anlık bildirim + e-posta.
// Öğretmenlerin çoğunun anlık bildirim aboneliği yok; asıl ulaşan e-posta.
export type OgretmenBildirimTuru = "ders_programi" | "yurt_nobeti";

// Derslerim sekmesi yalnızca menüsünde Ajandam olan öğretmende var (okul
// öğretmeni); diğerleri panelin ana sayfasına yönlenir.
async function aliciBilgisi(admin: SupabaseClient, profileId: string) {
  const [{ data: profil }, { data: ogretmen }] = await Promise.all([
    admin.from("profiles").select("ad, email, role").eq("id", profileId).maybeSingle(),
    admin.from("teachers").select("brans, school_id").eq("id", profileId).maybeSingle(),
  ]);
  if (!profil) return null;
  const { data: okul } = ogretmen?.school_id
    ? await admin.from("schools").select("tur").eq("id", ogretmen.school_id).maybeSingle()
    : { data: null };
  const ajandaVar = profil.role === "ogretmen" && dashboardMenusu(
    profil.role as UserRole, (okul?.tur ?? undefined) as KurumTuru | undefined, ogretmen?.brans ?? undefined,
  ).some((oge) => oge.bolum === "takvim");
  return {
    ad: (profil.ad as string | null) ?? "",
    email: profil.email as string | null,
    yol: ajandaVar ? "/dashboard/takvim?sekme=ders" : "/dashboard",
  };
}

async function disaGonder(admin: SupabaseClient, profileId: string, baslik: string, mesaj: string) {
  const alici = await aliciBilgisi(admin, profileId);
  if (!alici) return;
  await pushGonderProfile(admin, profileId, baslik, mesaj, alici.yol);
  if (!process.env.RESEND_API_KEY || !alici.email) return;
  const { subject, html } = ogretmenBildirimEpostasi(alici.ad, baslik, mesaj, SITE_ADRESI + alici.yol);
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "SeFu Koç <bildirim@sefukoc.com>", to: alici.email, subject, html,
  });
  if (error) console.error("öğretmen bildirimi e-postası gönderilemedi:", error.message);
}

export async function ogretmeneBildirimGonder(
  admin: SupabaseClient, profileId: string, tur: OgretmenBildirimTuru, baslik: string, mesaj: string,
): Promise<{ error: string | null }> {
  const { error } = await admin.from("bildirimler").insert({ profile_id: profileId, tur, baslik, mesaj });
  if (error) return { error: error.message };
  await disaGonder(admin, profileId, baslik, mesaj);
  return { error: null };
}

// Veritabanı tetikleyicisinin (üyelikte program aktarımı, migration 0104)
// yazdığı bildirimlerin anlık bildirim ve e-postası. İşaret önce tek UPDATE
// ile kaldırılır; aynı anda iki panel açılışı aynı e-postayı iki kez atmaz.
export function bekleyenOgretmenBildirimleriniGonder(profileId: string) {
  after(async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("bildirimler")
      .update({ dis_gonderim_bekliyor: false })
      .eq("profile_id", profileId)
      .eq("dis_gonderim_bekliyor", true)
      .select("baslik, mesaj");
    if (error) return console.error("bekleyen öğretmen bildirimleri okunamadı:", error.message);
    for (const b of data ?? []) await disaGonder(admin, profileId, b.baslik, b.mesaj);
  });
}
