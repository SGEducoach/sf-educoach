import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REHBER_BRANSI } from "@/lib/rehberlik";

// Grup Koçluk — koç yetkisi (Faz 3, 18.09.2026). Koç: öğretmen rolü, bir
// grubun (schools.grup_kapasitesi dolu) "Rehber Öğretmen" branşlı öğretmeni
// VE o grubun moderatörü (bkz. grup-actions.ts grupOlustur). Koçun tüm
// yazma işlemleri servis anahtarıyla yapılır; yetki burada doğrulanır.

export interface GrupBilgisi {
  id: string;
  ad: string;
  kod: string;
  kapasite: number;
  bitisTarihi: string;
  donduruldu: boolean;
  suresiDoldu: boolean;
}

export type GrupKocuYetkisi =
  | { error: string; admin: null; kocId: null; grup: null }
  | { error: null; admin: ReturnType<typeof createAdminClient>; kocId: string; grup: GrupBilgisi };

export async function grupKocuYetkisi(): Promise<GrupKocuYetkisi> {
  const hata = (error: string): GrupKocuYetkisi => ({ error, admin: null, kocId: null, grup: null });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return hata("Oturum açılmadı.");

  const admin = createAdminClient();
  const [{ data: profil }, { data: ogretmen }] = await Promise.all([
    admin.from("profiles").select("role, aktif").eq("id", user.id).maybeSingle(),
    admin.from("teachers").select("school_id, brans").eq("id", user.id).maybeSingle(),
  ]);
  if (profil?.role !== "ogretmen" || profil.aktif === false || ogretmen?.brans !== REHBER_BRANSI || !ogretmen.school_id) {
    return hata("Bu işlem yalnızca grup koçuna açıktır.");
  }
  const [{ data: okul }, { data: moderator }] = await Promise.all([
    admin.from("schools").select("id, ad, okul_kodu, aktif, grup_kapasitesi, grup_bitis_tarihi").eq("id", ogretmen.school_id).maybeSingle(),
    admin.from("school_moderators").select("school_id").eq("profile_id", user.id).eq("school_id", ogretmen.school_id).maybeSingle(),
  ]);
  if (!okul || okul.grup_kapasitesi === null || !moderator) return hata("Bu işlem yalnızca grup koçuna açıktır.");

  const bugun = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  return {
    error: null,
    admin,
    kocId: user.id,
    grup: {
      id: okul.id,
      ad: okul.ad,
      kod: okul.okul_kodu,
      kapasite: okul.grup_kapasitesi,
      bitisTarihi: okul.grup_bitis_tarihi,
      donduruldu: okul.aktif === false,
      suresiDoldu: okul.grup_bitis_tarihi < bugun,
    },
  };
}

// Yazma işlemleri için: dondurulmuş ya da süresi dolmuş (salt okunur) grupta reddedilir.
export async function grupKocuYazmaYetkisi(): Promise<GrupKocuYetkisi> {
  const yetki = await grupKocuYetkisi();
  if (yetki.error !== null) return yetki;
  if (yetki.grup.donduruldu) return { error: "Grubunuz dondurulmuş.", admin: null, kocId: null, grup: null };
  if (yetki.grup.suresiDoldu) {
    return { error: "Grubunuzun süresi doldu; grup salt okunur. Devam etmek için SeFu Koç yönetimiyle görüşün.", admin: null, kocId: null, grup: null };
  }
  return yetki;
}
