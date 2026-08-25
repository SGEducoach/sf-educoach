"use server";

// DERSHANE MODU: öğrenci kendi kaydını tamamlama. Bu dosya /signup'tan
// (oturumsuz, herkese açık) çağrılır — bu yüzden requireUser()/requireAdmin()
// KULLANILMAZ; tüm sorgular service-role client ile yapılır ve tek yetki
// kontrolü "telefon, o dershanenin ön-kayıt listesinde var mı" sorgusudur.
import { createAdminClient } from "@/lib/supabase/admin";
import { rastgeleSifre } from "@/lib/validators";
import { bekleyenPdfSonuclariniOgrenciyeAktar } from "@/lib/deneme-sonucu-kaydet";
import { dershaneDenemeBitisGetir, suresiDolduMu, DENEME_SURESI_SONA_ERDI_MESAJI } from "@/lib/deneme-suresi";

export async function dershaneKayitTamamla(input: {
  schoolId: string; telefon: string; kullaniciAdi: string;
}) {
  const admin = createAdminClient();

  // Dershane 1 haftalık deneme süresi (bkz. deneme-suresi.ts, migration
  // 0065) — bu action SADECE dershane öğrencisi kaydı için var, ayrıca
  // kurumTuru sorgusuna gerek yok.
  const bitis = await dershaneDenemeBitisGetir(admin);
  if (suresiDolduMu(bitis)) return { error: DENEME_SURESI_SONA_ERDI_MESAJI, sifre: null };

  const telefon = input.telefon.trim();
  const kullaniciAdi = input.kullaniciAdi.trim();

  const { data: pending, error: bulmaHatasi } = await admin
    .from("pending_dershane_ogrenciler")
    .select("id, ad, class_id, ayt_alan, veli_telefon")
    .eq("school_id", input.schoolId)
    .eq("telefon", telefon)
    .is("kullanildi_at", null)
    .maybeSingle();

  if (bulmaHatasi) return { error: bulmaHatasi.message, sifre: null };
  if (!pending) {
    return { error: "Dershaneniz sizi sisteme eklemeden kayıt tamamlanamaz. Lütfen dershanenizle iletişime geçin.", sifre: null };
  }

  const sifre = rastgeleSifre();
  const email = `${crypto.randomUUID()}@ogrenci.sgeducoach.internal`;
  const { data: created, error: hesapHatasi } = await admin.auth.admin.createUser({
    email, password: sifre, email_confirm: true,
    user_metadata: {
      role: "ogrenci", ad: pending.ad, telefon, veli_telefon: pending.veli_telefon,
      school_id: input.schoolId, class_id: pending.class_id, okul_no: kullaniciAdi,
      ayt_alan: pending.ayt_alan, hedef_bolum: "Belirtilmedi",
      gecici_sifre: true,
      // "izinli öğrenci listesi" (allow-list) kontrolü bu akış için
      // anlamsız — asıl doğrulama zaten pending_dershane_ogrenciler
      // eşleşmesiyle yapıldı (yukarıda).
      admin_ekledi: true,
    },
  });
  if (hesapHatasi) {
    if (hesapHatasi.message?.includes("okul_no") || hesapHatasi.message?.toLowerCase().includes("duplicate"))
      return { error: "Bu kullanıcı adı zaten kullanılıyor.", sifre: null };
    return { error: hesapHatasi.message, sifre: null };
  }

  let aktarilanDenemeSayisi = 0;
  if (created.user?.id) {
    const aktarim = await bekleyenPdfSonuclariniOgrenciyeAktar(admin, {
      schoolId: input.schoolId,
      pendingId: pending.id,
      studentId: created.user.id,
      ad: pending.ad,
    });
    aktarilanDenemeSayisi = aktarim.aktarilan;
    if (aktarim.error || aktarim.atlanan > 0) {
      console.error("Ön kayıt PDF deneme sonuçları tam aktarılamadı:", {
        error: aktarim.error,
        atlanan: aktarim.atlanan,
        pendingId: pending.id,
      });
    }
  }

  await admin.from("pending_dershane_ogrenciler").update({ kullanildi_at: new Date().toISOString() }).eq("id", pending.id);

  return { error: null, sifre, ad: pending.ad, userId: created.user?.id ?? null, aktarilanDenemeSayisi };
}
