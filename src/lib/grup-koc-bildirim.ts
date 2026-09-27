import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { bildirimGonder } from "@/lib/bildirim-gonder";
import { pushGonderProfile } from "@/lib/push-send";

// Grup Koçluk denetimi (kullanıcı isteği 27.09.2026): koç bekleyen işleri
// ancak ekrana girerse görüyordu. Veli talebi, yönetici kararı ve giriş
// yapmayan öğrenci artık koça bildirim olarak düşer.
//
// Kullanıcı kararı: veli talebi ve süre uyarısı ANLIK (push) gider; kalanlar
// yalnızca bildirim panelinde durur.

export async function grupKocunuBul(admin: SupabaseClient, schoolId: string): Promise<string | null> {
  const { data: okul } = await admin.from("schools").select("id, grup_kapasitesi").eq("id", schoolId).maybeSingle();
  if (!okul || okul.grup_kapasitesi === null) return null;
  // teachers ile school_moderators arasında doğrudan bir yabancı anahtar YOK
  // (ikisi de profiles'a bağlı), bu yüzden gömülü sorgu kullanılamaz — iki
  // ayrı sorgu ve kesişim (grup-koc-auth.ts ile aynı desen).
  const { data: ogretmenler } = await admin
    .from("teachers")
    .select("id")
    .eq("school_id", schoolId)
    .eq("brans", REHBER_BRANSI);
  const adaylar = ((ogretmenler ?? []) as { id: string }[]).map((o) => o.id);
  if (adaylar.length === 0) return null;

  const { data: moderator } = await admin
    .from("school_moderators")
    .select("profile_id")
    .eq("school_id", schoolId)
    .in("profile_id", adaylar)
    .limit(1)
    .maybeSingle();
  return (moderator?.profile_id as string | undefined) ?? null;
}

// Öğrencinin kurumu bir grupsa o grubun koçunu döndürür.
export async function ogrencininGrupKocu(admin: SupabaseClient, studentId: string): Promise<string | null> {
  const { data: ogrenci } = await admin.from("students").select("school_id").eq("id", studentId).maybeSingle();
  if (!ogrenci?.school_id) return null;
  return grupKocunuBul(admin, ogrenci.school_id as string);
}

export async function kocaBildir(
  admin: SupabaseClient,
  kocId: string,
  baslik: string,
  mesaj: string,
  { anlik = false }: { anlik?: boolean } = {},
) {
  await bildirimGonder(admin, kocId, "sistem", baslik, mesaj);
  if (anlik) await pushGonderProfile(admin, kocId, baslik, mesaj);
}
