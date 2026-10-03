"use server";

// Faz G (2026-08-25 kullanıcı isteği) — "tüm kullanıcılara hata bildir
// bölümü hazırla ... hepsi için kayıt defteri oluşturulsun." Her rol
// (öğrenci/veli/öğretmen/müdür/admin) bu TEK action ile bildirim
// gönderebiliyor; bildiren_rol İSTEMCİDEN alınmıyor, sunucuda kendi
// profilinden türetiliyor (sahtecilik önlenir).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MESAJ_MAKS_UZUNLUK = 2000;

export async function hataBildir(mesaj: string, sayfa?: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile) return { error: "Profiliniz bulunamadı." };

  const mesajTemiz = mesaj.trim();
  if (!mesajTemiz) return { error: "Lütfen yaşadığınız sorunu kısaca açıklayın." };
  if (mesajTemiz.length > MESAJ_MAKS_UZUNLUK) return { error: `En fazla ${MESAJ_MAKS_UZUNLUK} karakter yazabilirsiniz.` };

  const admin = createAdminClient();
  const { error } = await admin.from("hata_bildirimleri").insert({
    bildiren_id: user.id,
    bildiren_rol: profile.role,
    mesaj: mesajTemiz,
    sayfa: sayfa?.trim().slice(0, 200) || null,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export interface AcikHataBildirimi {
  id: string;
  mesaj: string;
  createdAt: string;
  yanitlar: { id: string; gonderenRol: "admin" | "kullanici"; mesaj: string; createdAt: string }[];
}

export async function acikHataBildirimlerimGetir(): Promise<{ error: string | null; bildirimler: AcikHataBildirimi[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data, error } = await admin.from("hata_bildirimleri")
    .select("id, mesaj, created_at").eq("bildiren_id", user.id).eq("durum", "bekliyor")
    .order("created_at", { ascending: false }).limit(20);
  if (error) return { error: error.message, bildirimler: [] };
  const satirlar = data ?? [];
  const { data: yanitlar, error: yanitHatasi } = satirlar.length
    ? await admin.from("hata_bildirimi_yanitlari").select("id, hata_id, gonderen_rol, mesaj, created_at")
      .in("hata_id", satirlar.map((r) => r.id)).order("created_at", { ascending: true })
    : { data: [], error: null };
  if (yanitHatasi) return { error: yanitHatasi.message, bildirimler: [] };
  const yanitHaritasi = new Map<string, AcikHataBildirimi["yanitlar"]>();
  for (const y of (yanitlar ?? []) as { id: string; hata_id: string; gonderen_rol: "admin" | "kullanici"; mesaj: string; created_at: string }[]) {
    const liste = yanitHaritasi.get(y.hata_id) ?? [];
    liste.push({ id: y.id, gonderenRol: y.gonderen_rol, mesaj: y.mesaj, createdAt: y.created_at });
    yanitHaritasi.set(y.hata_id, liste);
  }
  return { error: null, bildirimler: satirlar.map((r) => ({
    id: r.id, mesaj: r.mesaj, createdAt: r.created_at, yanitlar: yanitHaritasi.get(r.id) ?? [],
  })) };
}

export async function hataBildirimineEkBilgiGonder(id: string, mesaj: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const temiz = mesaj.trim();
  if (!temiz || temiz.length > MESAJ_MAKS_UZUNLUK) return { error: "Ek bilgi 1-2000 karakter olmalı." };
  const admin = createAdminClient();
  const { data: bildirim, error: okumaHatasi } = await admin.from("hata_bildirimleri")
    .select("id").eq("id", id).eq("bildiren_id", user.id).eq("durum", "bekliyor").maybeSingle();
  if (okumaHatasi) return { error: okumaHatasi.message };
  if (!bildirim) return { error: "Açık hata bildirimi bulunamadı." };
  const { error } = await admin.from("hata_bildirimi_yanitlari")
    .insert({ hata_id: id, gonderen_id: user.id, gonderen_rol: "kullanici", mesaj: temiz });
  if (error) return { error: error.message };
  const { data: yoneticiler } = await admin.from("profiles").select("id").eq("role", "admin");
  if (yoneticiler?.length) {
    const { error: haberHatasi } = await admin.from("bildirimler").insert(yoneticiler.map((y) => ({
      profile_id: y.id, tur: "sistem", baslik: "Hata bildirimine ek bilgi geldi",
      mesaj: "Bir kullanıcı açık hata bildirimine ek bilgi yazdı. Hata Bildirimleri bölümünden inceleyin.",
    })));
    if (haberHatasi) console.error("Hata bildirimi ek bilgi uyarısı gönderilemedi:", haberHatasi.message);
  }
  revalidatePath("/yonetici");
  return { error: null };
}
