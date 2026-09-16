"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function yetki() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profil } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profil?.role === "admin") return { user, adminMi: true, schoolId: null };
  const { data: moderator } = await db.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle();
  if (moderator) return { user, adminMi: false, schoolId: moderator.school_id as string };
  if (profil?.role !== "mudur") return null;
  const { data: teacher } = await db.from("teachers").select("school_id").eq("id", user.id).single();
  return teacher ? { user, adminMi: false, schoolId: teacher.school_id as string } : null;
}

export async function yoneticiMesajlariniGetir() {
  const auth = await yetki();
  if (!auth) return { error: "Bu bölüm için yetkiniz yok.", mesajlar: [], userId: "", adminMi: false };
  let sorgu = createAdminClient().from("yonetici_mesajlari")
    .select("id, kurum_yetkilisi_id, gonderen_id, mesaj, created_at, profiles!yonetici_mesajlari_kurum_yetkilisi_id_fkey(ad), schools(ad)")
    .order("created_at", { ascending: false }).limit(500);
  if (!auth.adminMi) sorgu = sorgu.eq("kurum_yetkilisi_id", auth.user.id);
  const { data, error } = await sorgu;
  return { error: error ? "Mesajlar alınamadı. Lütfen tekrar deneyin." : null, mesajlar: data ?? [], userId: auth.user.id, adminMi: auth.adminMi };
}

export async function yoneticiMesajGonder(metin: string, kurumYetkilisiId?: string) {
  const auth = await yetki();
  if (!auth) return { error: "Mesaj gönderme yetkiniz yok." };
  if (typeof metin !== "string" || !metin.trim() || metin.trim().length > 4000) return { error: "1–4000 karakter arasında bir mesaj yazın." };
  const db = createAdminClient();
  let schoolId = auth.schoolId;
  let hedef = auth.user.id;
  if (auth.adminMi) {
    if (!kurumYetkilisiId) return { error: "Yanıtlanacak konuşmayı seçin." };
    const { data: konusma } = await db.from("yonetici_mesajlari").select("school_id").eq("kurum_yetkilisi_id", kurumYetkilisiId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!konusma) return { error: "Konuşma bulunamadı." };
    schoolId = konusma.school_id;
    hedef = kurumYetkilisiId;
  }
  const { error } = await db.from("yonetici_mesajlari").insert({ kurum_yetkilisi_id: hedef, gonderen_id: auth.user.id, school_id: schoolId, mesaj: metin.trim() });
  return { error: error ? "Mesaj gönderilemedi. Lütfen tekrar deneyin." : null };
}
