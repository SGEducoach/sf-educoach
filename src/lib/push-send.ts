import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// Rozet kazanımı gibi anlık (kullanıcı işlem yaparken tetiklenen) push
// bildirimleri için — cron route'undaki toplu gönderim ayrı/optimize
// kalıyor (yüzlerce öğrenciyi tek seferde işliyor), bu ise tek bir
// profile'a anında göndermek için.
let vapidYapilandirildi = false;
function vapidYapilandir() {
  if (vapidYapilandirildi) return;
  if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:destek@sgeducoach.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
    vapidYapilandirildi = true;
  }
}

export async function pushGonderProfile(
  admin: SupabaseClient,
  profileId: string,
  baslik: string,
  govde: string,
  url = "/dashboard",
) {
  vapidYapilandir();
  if (!vapidYapilandirildi) return;

  const { data: abonelikler } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profileId);

  for (const ab of abonelikler ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: ab.endpoint, keys: { p256dh: ab.p256dh, auth: ab.auth } },
        JSON.stringify({ title: baslik, body: govde, url }),
      );
    } catch (e) {
      const statusCode = (e as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", ab.id);
      }
    }
  }
}
