"use server";

// Mezun hesabının kendi Mezun Takip kaydını güncellemesi (migration 0188).
// Ad, soyad, mezuniyet yılı ve okul no kurumun kaydıdır; mezun yalnız
// iletişim, il/ilçe, üniversite ve meslek alanlarını değiştirir.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mezunBilgisiDogrula } from "@/lib/mezun";
import { bugununTarihiTR } from "@/lib/tarih";

export interface MezunKendiBilgisi {
  telefon: string; eposta: string; il: string; ilce: string; universite: string; meslek: string;
  /** Okulun SMS/e-posta ile mezun duyurusu göndermesine isteğe bağlı onay (migration 0189). */
  iletisimOnayi: boolean;
}

export async function mezunKendiBilgileriniGuncelle(girdi: MezunKendiBilgisi): Promise<{ error: string | null; uyarilar: string[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı.", uyarilar: [] };
  const admin = createAdminClient();
  const [{ data: profil }, { data: ogrenci }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("students").select("school_id").eq("id", user.id).maybeSingle(),
  ]);
  if (profil?.role !== "mezun" || !ogrenci) return { error: "Bu bölüm yalnız mezun hesabında kullanılabilir.", uyarilar: [] };
  const { data: kayit } = await admin.from("mezunlar").select("id, ad, soyad, mezuniyet_yili, iletisim_onayi")
    .eq("school_id", ogrenci.school_id).eq("student_id", user.id).maybeSingle();
  if (!kayit) return { error: "Mezun kaydın bulunamadı. Okulunla iletişime geç.", uyarilar: [] };

  const { bilgi, hatalar, uyarilar } = mezunBilgisiDogrula({
    ad: kayit.ad, soyad: kayit.soyad, mezuniyetYili: kayit.mezuniyet_yili,
    telefon: girdi.telefon, eposta: girdi.eposta, il: girdi.il, ilce: girdi.ilce, universite: girdi.universite, meslek: girdi.meslek,
  }, Number(bugununTarihiTR().slice(0, 4)));
  if (!bilgi) return { error: hatalar.join(" "), uyarilar };
  const { error } = await admin.from("mezunlar").update({
    telefon: bilgi.telefon, eposta: bilgi.eposta, il: bilgi.il, ilce: bilgi.ilce, universite: bilgi.universite, meslek: bilgi.meslek,
    guncelleyen_id: user.id, updated_at: new Date().toISOString(),
    // Onay yalnız değiştiğinde zaman damgası alır.
    ...(girdi.iletisimOnayi === true || kayit.iletisim_onayi !== null
      ? (kayit.iletisim_onayi === girdi.iletisimOnayi ? {} : { iletisim_onayi: girdi.iletisimOnayi === true, iletisim_onay_at: new Date().toISOString() })
      : {}),
  }).eq("id", kayit.id);
  if (error) return { error: "Bilgiler kaydedilemedi. Biraz sonra tekrar dene.", uyarilar };
  revalidatePath("/dashboard");
  return { error: null, uyarilar };
}
