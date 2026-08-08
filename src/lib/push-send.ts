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

// Serbest metin duyuru: verilen öğrenci id listesine VE onların bağlı
// veli(ler)ine aynı mesajı gönderir. Admin (herkese), müdür (kendi okulu)
// ve öğretmen (kendi sınıfı) duyuru araçları bunu paylaşıyor — kapsamı
// çağıran server action belirliyor, burası sadece gönderiyor.
// Push'a EK olarak (header'daki "Mesajlarım" kutusu için) duyurular +
// duyuru_aliciler'a da kalıcı olarak yazıyor — alıcı listesi push'un
// GERÇEKTEN gittiği aynı profil id'leri, ayrı bir kapsam hesaplaması yok.
export async function duyuruGonder(
  admin: SupabaseClient,
  ogrenciIdleri: string[],
  baslik: string,
  govde: string,
  gonderenId?: string,
): Promise<{ ogrenciSayisi: number; veliSayisi: number }> {
  if (ogrenciIdleri.length === 0) return { ogrenciSayisi: 0, veliSayisi: 0 };

  const { data: veliBaglantilari } = await admin
    .from("parent_students")
    .select("parent_id")
    .in("student_id", ogrenciIdleri);
  const veliIdSeti = new Set((veliBaglantilari ?? []).map((v) => v.parent_id as string));

  for (const ogrenciId of ogrenciIdleri) await pushGonderProfile(admin, ogrenciId, baslik, govde);
  for (const veliId of veliIdSeti) await pushGonderProfile(admin, veliId, baslik, govde);

  const { data: duyuru, error: duyuruHatasi } = await admin
    .from("duyurular")
    .insert({ gonderen_id: gonderenId ?? null, baslik, mesaj: govde })
    .select("id")
    .single();
  if (!duyuruHatasi && duyuru) {
    const aliciSatirlari = [...ogrenciIdleri, ...veliIdSeti].map((profileId) => ({ duyuru_id: duyuru.id, profile_id: profileId }));
    if (aliciSatirlari.length > 0) await admin.from("duyuru_aliciler").insert(aliciSatirlari);
  }

  return { ogrenciSayisi: ogrenciIdleri.length, veliSayisi: veliIdSeti.size };
}
