// Yalnız sunucuda. SMS modülünü kimin, hangi kurumda, hangi kapsamda
// kullanabileceğini VERİTABANINDAN çözer (menü yalnız görünürlüktür, yetki
// vermez). Kullanıcı kararı 28.10.2026:
//   - Modülü kullanan: müdür, müdür yardımcısı, kurum rehber öğretmeni.
//   - Bağlantı bilgilerini giren: kurum yöneticisi (moderatör / müdür) ve admin.
//   - Modül kurum bazında Kurum Yetkileri'nden admin tarafından açılır/kapanır.
import type { SupabaseClient } from "@supabase/supabase-js";
import { kurumErisimiKapaliMi, kurumModuluAcikMi, type KurumModulYetkileri } from "@/lib/kurum-yetkileri";
import { REHBER_BRANSI } from "@/lib/rehberlik";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export type SmsRol = "mudur" | "mudur_yardimcisi" | "rehber";

export interface SmsErisimi {
  userId: string;
  schoolId: string;
  rol: SmsRol;
  /** null = kurumun tamamı; dizi = yalnız bu sınıf düzeyleri (boş = atama yok). */
  sinifDuzeyleri: string[] | null;
}

export interface SmsKurumu {
  id: string;
  ad: string;
  modulAcik: boolean;
}

export const SMS_ROL_ETIKETI: Record<SmsRol, string> = {
  mudur: "Müdür",
  mudur_yardimcisi: "Müdür Yardımcısı",
  rehber: "Rehber Öğretmen",
};

/** Kurum var mı, erişime açık mı ve SMS modülü yönetici tarafından açılmış mı. */
export async function smsKurumunuGetir(admin: Istemci, schoolId: string): Promise<SmsKurumu | null> {
  const { data: s } = await admin.from("schools")
    .select("id, ad, aktif, manuel_aktif, kullanim_bitis_tarihi, grup_kapasitesi, modul_yetkileri")
    .eq("id", schoolId).maybeSingle();
  if (!s || s.grup_kapasitesi !== null) return null;
  if (kurumErisimiKapaliMi({
    grupMu: false, aktif: s.aktif !== false, manuelAktif: s.manuel_aktif !== false,
    kullanimBitisTarihi: (s.kullanim_bitis_tarihi as string | null) ?? null,
  })) return null;
  return {
    id: s.id as string,
    ad: s.ad as string,
    modulAcik: kurumModuluAcikMi((s.modul_yetkileri as KurumModulYetkileri | null) ?? {}, "sms"),
  };
}

/** SMS GÖNDEREBİLEN kişi: müdür, müdür yardımcısı ya da kurum rehber öğretmeni. */
export async function smsKullaniciErisimi(admin: Istemci, userId: string): Promise<SmsErisimi | null> {
  const { data: profil } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = profil?.role as string | undefined;
  if (role !== "mudur" && role !== "ogretmen") return null;

  const { data: ogretmen } = await admin.from("teachers").select("school_id, brans").eq("id", userId).maybeSingle();
  const schoolId = ogretmen?.school_id as string | undefined;
  if (!schoolId) return null;
  if (role === "mudur") return { userId, schoolId, rol: "mudur", sinifDuzeyleri: null };

  const [{ data: yardimci }, { data: rehberlik }, { data: okul }] = await Promise.all([
    admin.from("mudur_yardimcilari").select("school_id, sinif_duzeyleri").eq("profile_id", userId).maybeSingle(),
    admin.from("rehberlik_servisi").select("school_id, sinif_duzeyleri").eq("profile_id", userId).maybeSingle(),
    admin.from("schools").select("tur").eq("id", schoolId).maybeSingle(),
  ]);
  const yardimciOkulu = yardimci?.school_id === schoolId;
  const rehberOkulu = rehberlik?.school_id === schoolId;
  // Dershane rehberi kimliğini branştan alır ve kurumun tamamını görür
  // (bkz. dashboard-navigation DERSHANE_REHBER_MENUSU); okul rehberi servis üyeliğinden.
  const dershaneRehberi = okul?.tur === "dershane" && ogretmen?.brans === REHBER_BRANSI;
  if (dershaneRehberi) return { userId, schoolId, rol: "rehber", sinifDuzeyleri: null };
  if (!yardimciOkulu && !rehberOkulu) return null;

  const duzeyler = new Set<string>([
    ...(yardimciOkulu ? ((yardimci?.sinif_duzeyleri as string[] | null) ?? []) : []),
    ...(rehberOkulu ? ((rehberlik?.sinif_duzeyleri as string[] | null) ?? []) : []),
  ]);
  return { userId, schoolId, rol: rehberOkulu ? "rehber" : "mudur_yardimcisi", sinifDuzeyleri: [...duzeyler] };
}

export interface SmsYonetimErisimi {
  userId: string;
  schoolId: string;
  admin: boolean;
}

/**
 * Bağlantı bilgilerini girebilen kişi: admin (verilen kurum için), kurumun
 * moderatörü ya da müdürü. Kendi kurumu dışında istek reddedilir.
 */
export async function smsYonetimErisimi(admin: Istemci, userId: string, istenenOkulId?: string): Promise<SmsYonetimErisimi | null> {
  const { data: profil } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profil) return null;
  if (profil.role === "admin") return istenenOkulId ? { userId, schoolId: istenenOkulId, admin: true } : null;

  const [{ data: moderator }, { data: ogretmen }] = await Promise.all([
    admin.from("school_moderators").select("school_id").eq("profile_id", userId).maybeSingle(),
    profil.role === "mudur" ? admin.from("teachers").select("school_id").eq("id", userId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const schoolId = ((ogretmen as { school_id: string } | null)?.school_id ?? moderator?.school_id ?? null) as string | null;
  if (!schoolId || (istenenOkulId && istenenOkulId !== schoolId)) return null;
  return { userId, schoolId, admin: false };
}

/** Sınıf düzeyi (seviye) kapsamda mı? null kapsam = hepsi. */
export function smsSeviyeKapsamdaMi(sinifDuzeyleri: string[] | null, seviye: string): boolean {
  return sinifDuzeyleri === null || sinifDuzeyleri.includes(seviye);
}
