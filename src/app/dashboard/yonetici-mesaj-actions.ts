"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bildirimGonder } from "@/lib/bildirim-gonder";
import { pushGonderProfile } from "@/lib/push-send";

// Site içi yazışma — kullanıcı kararı (28.09.2026): SADECE kurum yetkilisi
// (müdür/moderatör) ile admin arasında. Öğretmen/öğrenci/veli bu hatta hiç
// girmez; onların kanalı Duyurular ve Hata Bildirimi.
//
// Moderatör bu hatta baştan beri yetkiliydi ama hat sessizdi: mesaj gelince
// kimse haber almıyordu ve admin yeni bir konuşma başlatamıyordu (yalnızca
// var olan bir konuşmaya yanıt verebiliyordu). Bu dosyadaki üç ekleme bunu
// kapatıyor: rol etiketi, iki yönlü bildirim, admin'in konuşma başlatması.

type KurumRolu = "moderator" | "mudur";

type Yetki =
  | { adminMi: true; userId: string; schoolId: null; rol: "admin" }
  | { adminMi: false; userId: string; schoolId: string; rol: KurumRolu };

async function yetki(): Promise<Yetki | null> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profil } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profil?.role === "admin") return { adminMi: true, userId: user.id, schoolId: null, rol: "admin" };
  // Bir moderatörün birden fazla okulu olabilir; maybeSingle() böyle bir
  // durumda hata döndürüp yetkiyi tamamen düşürürdü — limit(1) ile ilk kurum
  // alınıyor (yazışma kurum bazlı değil, kişi bazlı yürüyor).
  const { data: moderator } = await db.from("school_moderators").select("school_id").eq("profile_id", user.id).limit(1).maybeSingle();
  if (moderator) return { adminMi: false, userId: user.id, schoolId: moderator.school_id as string, rol: "moderator" };
  if (profil?.role !== "mudur") return null;
  const { data: teacher } = await db.from("teachers").select("school_id").eq("id", user.id).single();
  return teacher ? { adminMi: false, userId: user.id, schoolId: teacher.school_id as string, rol: "mudur" } : null;
}

export interface KurumYetkilisi {
  id: string;
  ad: string;
  okul: string;
  rol: KurumRolu;
}

// Admin'in konuşma başlatabilmesi için yazışabileceği kişiler: moderatörler
// ve müdürler. (Kullanıcı kararı: liste bununla sınırlı.)
async function kurumYetkilileri(): Promise<KurumYetkilisi[]> {
  const db = createAdminClient();
  // Müdürler önce profiles'tan bulunuyor: teachers tablosunun tamamını çekip
  // JS'te elemek hem gereksiz hem de PostgREST'in 1000 satır tavanına takılır.
  const { data: mudurProfilleri } = await db.from("profiles").select("id, ad").eq("role", "mudur");
  const mudurIdleri = ((mudurProfilleri ?? []) as { id: string; ad: string }[]);
  const [{ data: moderatorler }, { data: mudurler }] = await Promise.all([
    db.from("school_moderators").select("profile_id, profiles!school_moderators_profile_id_fkey(ad), schools(ad)"),
    mudurIdleri.length
      ? db.from("teachers").select("id, schools(ad)").in("id", mudurIdleri.map((m) => m.id))
      : Promise.resolve({ data: [] }),
  ]);
  const tek = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

  const liste: KurumYetkilisi[] = [];
  const eklenen = new Set<string>();
  type ModSatiri = { profile_id: string; profiles: { ad: string } | null; schools: { ad: string } | null };
  for (const m of ((moderatorler ?? []) as unknown as ModSatiri[])) {
    if (eklenen.has(m.profile_id)) continue;
    eklenen.add(m.profile_id);
    liste.push({ id: m.profile_id, ad: tek(m.profiles)?.ad ?? "Moderatör", okul: tek(m.schools)?.ad ?? "Kurum", rol: "moderator" });
  }
  type MudurSatiri = { id: string; schools: { ad: string } | null };
  const adlar = new Map(mudurIdleri.map((m) => [m.id, m.ad]));
  for (const t of ((mudurler ?? []) as unknown as MudurSatiri[])) {
    if (eklenen.has(t.id)) continue;
    eklenen.add(t.id);
    liste.push({ id: t.id, ad: adlar.get(t.id) ?? "Müdür", okul: tek(t.schools)?.ad ?? "Kurum", rol: "mudur" });
  }
  return liste.sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
}

export async function yoneticiMesajlariniGetir() {
  const auth = await yetki();
  if (!auth) return { error: "Bu bölüm için yetkiniz yok.", mesajlar: [], userId: "", adminMi: false, kisiler: [] as KurumYetkilisi[] };
  const db = createAdminClient();
  let sorgu = db.from("yonetici_mesajlari")
    .select("id, kurum_yetkilisi_id, gonderen_id, mesaj, created_at, profiles!yonetici_mesajlari_kurum_yetkilisi_id_fkey(ad), schools(ad)")
    .order("created_at", { ascending: false }).limit(500);
  if (!auth.adminMi) sorgu = sorgu.eq("kurum_yetkilisi_id", auth.userId);
  const { data, error } = await sorgu;
  // Admin, hiç yazışmamış moderatör/müdürle de konuşma başlatabilsin diye
  // kişi listesi mesajlardan bağımsız geliyor.
  const kisiler = auth.adminMi && !error ? await kurumYetkilileri() : [];
  return {
    error: error ? "Mesajlar alınamadı. Lütfen tekrar deneyin." : null,
    mesajlar: data ?? [],
    userId: auth.userId,
    adminMi: auth.adminMi,
    kisiler,
  };
}

// Mesajı alan tarafa haber ver. Bu hat kişiden kişiye yazışma olduğu için
// bildirim paneline düşmenin yanında anlık da gidiyor.
async function karsiTarafaHaberVer(
  db: ReturnType<typeof createAdminClient>,
  { adminGonderdi, hedefId, gonderenAd, okulAd, metin }:
  { adminGonderdi: boolean; hedefId: string; gonderenAd: string; okulAd: string; metin: string },
) {
  const ozet = metin.length > 140 ? `${metin.slice(0, 140)}…` : metin;
  if (adminGonderdi) {
    const baslik = "Yöneticiden yeni mesaj";
    await bildirimGonder(db, hedefId, "sistem", baslik, ozet);
    await pushGonderProfile(db, hedefId, baslik, ozet);
    return;
  }
  const { data: adminler } = await db.from("profiles").select("id").eq("role", "admin");
  const baslik = "Kurumdan yeni mesaj";
  const govde = `${gonderenAd} (${okulAd}): ${ozet}`;
  for (const a of ((adminler ?? []) as { id: string }[])) {
    await bildirimGonder(db, a.id, "sistem", baslik, govde);
    await pushGonderProfile(db, a.id, baslik, govde, "/yonetici/mesajlar");
  }
}

export async function yoneticiMesajGonder(metin: string, kurumYetkilisiId?: string) {
  const auth = await yetki();
  if (!auth) return { error: "Mesaj gönderme yetkiniz yok." };
  if (typeof metin !== "string" || !metin.trim() || metin.trim().length > 4000) return { error: "1–4000 karakter arasında bir mesaj yazın." };
  const db = createAdminClient();
  let schoolId = auth.schoolId;
  let hedef = auth.userId;

  if (auth.adminMi) {
    if (!kurumYetkilisiId) return { error: "Yanıtlanacak konuşmayı seçin." };
    hedef = kurumYetkilisiId;
    const { data: konusma } = await db.from("yonetici_mesajlari").select("school_id")
      .eq("kurum_yetkilisi_id", kurumYetkilisiId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (konusma) {
      schoolId = konusma.school_id;
    } else {
      // Henüz yazışma yoksa admin konuşmayı kendisi başlatıyor: kurum,
      // kişinin moderatörlüğünden ya da müdürlüğünden çözülüyor.
      const kisi = (await kurumYetkilileri()).find((k) => k.id === kurumYetkilisiId);
      if (!kisi) return { error: "Bu kişiyle yazışma açılamıyor." };
      if (kisi.rol === "moderator") {
        const { data: mod } = await db.from("school_moderators").select("school_id").eq("profile_id", kurumYetkilisiId).limit(1).maybeSingle();
        schoolId = (mod?.school_id as string | undefined) ?? null;
      } else {
        const { data: ogretmen } = await db.from("teachers").select("school_id").eq("id", kurumYetkilisiId).maybeSingle();
        schoolId = (ogretmen?.school_id as string | undefined) ?? null;
      }
      if (!schoolId) return { error: "Bu kişiyle yazışma açılamıyor." };
    }
  }

  const { error } = await db.from("yonetici_mesajlari").insert({ kurum_yetkilisi_id: hedef, gonderen_id: auth.userId, school_id: schoolId, mesaj: metin.trim() });
  if (error) return { error: "Mesaj gönderilemedi. Lütfen tekrar deneyin." };

  const [{ data: gonderen }, { data: okul }] = await Promise.all([
    db.from("profiles").select("ad").eq("id", auth.userId).maybeSingle(),
    schoolId ? db.from("schools").select("ad").eq("id", schoolId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  await karsiTarafaHaberVer(db, {
    adminGonderdi: auth.adminMi,
    hedefId: hedef,
    gonderenAd: (gonderen?.ad as string | undefined) ?? "Kurum yetkilisi",
    okulAd: (okul?.ad as string | undefined) ?? "Kurum",
    metin: metin.trim(),
  });
  return { error: null };
}
