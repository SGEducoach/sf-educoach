import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DuyuruAliciTuru = "hepsi" | "ogrenci" | "veli";

// Kullanıcı isteği (26.08.2026): Bildirimler bölümünde öğretmen/müdür
// duyurularının AYRI AYRI kapatılabilmesi — bkz. migration 0077
// (profiles.bildirim_ogretmen_mesaji/bildirim_mudur_mesaji). Admin
// duyurusu buna dahil değil (o zaten site geneli sabit banner + push
// olarak ayrı bir yoldan gidiyor, bkz. src/lib/site-duyuru.ts) — bu
// yüzden admin gönderiminde kategori hiç geçilmiyor.
export type DuyuruKategorisi = "ogretmen_mesaji" | "mudur_mesaji";
const DUYURU_KATEGORI_KOLONU: Record<DuyuruKategorisi, "bildirim_ogretmen_mesaji" | "bildirim_mudur_mesaji"> = {
  ogretmen_mesaji: "bildirim_ogretmen_mesaji",
  mudur_mesaji: "bildirim_mudur_mesaji",
};

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
  aliciTuru: DuyuruAliciTuru = "hepsi",
  kategori?: DuyuruKategorisi,
  meta?: { schoolId?: string | null; gonderenRol?: string; gonderenAdi?: string; hedef?: string },
): Promise<{ ogrenciSayisi: number; veliSayisi: number }> {
  if (ogrenciIdleri.length === 0) return { ogrenciSayisi: 0, veliSayisi: 0 };

  const { data: veliBaglantilari } = await admin
    .from("parent_students")
    .select("parent_id")
    .in("student_id", ogrenciIdleri);
  const veliIdSeti = new Set((veliBaglantilari ?? []).map((v) => v.parent_id as string));
  let ogrenciAlicilari = aliciTuru === "veli" ? [] : ogrenciIdleri;
  let veliAlicilari = aliciTuru === "ogrenci" ? new Set<string>() : veliIdSeti;

  // Kategoriye göre kapatmış olanları alıcı listesinden çıkar (kullanıcı
  // isteği, 26.08.2026 — bkz. migration 0077).
  if (kategori) {
    const kolon = DUYURU_KATEGORI_KOLONU[kategori];
    const tumAlicilar = [...new Set([...ogrenciAlicilari, ...veliAlicilari])];
    if (tumAlicilar.length > 0) {
      const { data: tercihler } = await admin.from("profiles").select(`id, ${kolon}`).in("id", tumAlicilar);
      const kapatanlar = new Set((tercihler ?? []).filter((p) => (p as unknown as Record<string, boolean>)[kolon] === false).map((p) => p.id as string));
      if (kapatanlar.size > 0) {
        ogrenciAlicilari = ogrenciAlicilari.filter((id) => !kapatanlar.has(id));
        veliAlicilari = new Set([...veliAlicilari].filter((id) => !kapatanlar.has(id)));
      }
    }
  }

  for (const ogrenciId of ogrenciAlicilari) await pushGonderProfile(admin, ogrenciId, baslik, govde);
  for (const veliId of veliAlicilari) await pushGonderProfile(admin, veliId, baslik, govde);

  const { data: duyuru, error: duyuruHatasi } = await admin
    .from("duyurular")
    .insert({ gonderen_id: gonderenId ?? null, baslik, mesaj: govde, school_id: meta?.schoolId ?? null, gonderen_rol: meta?.gonderenRol ?? null, gonderen_adi: meta?.gonderenAdi ?? null, hedef: meta?.hedef ?? null, alici_sayisi: ogrenciAlicilari.length + veliAlicilari.size })
    .select("id")
    .single();
  if (!duyuruHatasi && duyuru) {
    const aliciSatirlari = [...ogrenciAlicilari, ...veliAlicilari].map((profileId) => ({ duyuru_id: duyuru.id, profile_id: profileId }));
    if (aliciSatirlari.length > 0) await admin.from("duyuru_aliciler").insert(aliciSatirlari);
  }

  return { ogrenciSayisi: ogrenciAlicilari.length, veliSayisi: veliAlicilari.size };
}
