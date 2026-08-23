import type { SupabaseClient } from "@supabase/supabase-js";
import { adNormalize } from "@/lib/validators";
import type { DenemeTuru } from "@/lib/types";

export interface DenemeDersSonucu {
  ders: string;
  dogru: number;
  yanlis: number;
}

function dersAdiNormalize(ad: string): string {
  return ad.trim().replace(/-\d$/, "").replace(/^Felsefe Grubu$/i, "Felsefe");
}

export async function ogretmenDenemeSonucuKaydet(
  admin: SupabaseClient,
  input: {
    studentId: string;
    tarih: string;
    tur: DenemeTuru;
    yayinevi: string;
    dersSonuclari: DenemeDersSonucu[];
  },
): Promise<{ error: string | null; denemeId: string | null }> {
  const { data: mevcutDeneme, error: aramaHatasi } = await admin
    .from("denemeler")
    .select("id")
    .eq("student_id", input.studentId)
    .eq("tarih", input.tarih)
    .eq("tur", input.tur)
    .eq("yayinevi", input.yayinevi)
    .eq("kaynak", "ogretmen")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (aramaHatasi) return { error: aramaHatasi.message, denemeId: null };

  let denemeId = mevcutDeneme?.id as string | undefined;
  if (!denemeId) {
    const { data: yeniDeneme, error: olusturmaHatasi } = await admin
      .from("denemeler")
      .insert({
        student_id: input.studentId,
        tarih: input.tarih,
        tur: input.tur,
        hedefe_yakinlik: "belirsiz",
        zorluk: "orta",
        yayinevi: input.yayinevi,
        kaynak: "ogretmen",
      })
      .select("id")
      .single();
    if (olusturmaHatasi || !yeniDeneme) {
      return { error: olusturmaHatasi?.message ?? "Deneme oluşturulamadı.", denemeId: null };
    }
    denemeId = yeniDeneme.id as string;
  }

  const { error: dersHatasi } = await admin.from("deneme_ders_sonuclari").upsert(
    input.dersSonuclari.map((sonuc) => ({
      deneme_id: denemeId,
      ders: dersAdiNormalize(sonuc.ders),
      dogru: sonuc.dogru,
      yanlis: sonuc.yanlis,
    })),
    { onConflict: "deneme_id,ders" },
  );
  if (dersHatasi) return { error: dersHatasi.message, denemeId };
  return { error: null, denemeId };
}

// Müdür PDF'yi öğrenci hesabı açılmadan önce yükleyebilir. Sonuçlar
// eşleştirme kuyruğunda tutulur ve ön kayıt, gerçek hesaba dönüştüğü anda
// aynı manuel deneme kayıt biçimiyle öğrenciye aktarılır.
export async function bekleyenPdfSonuclariniOgrenciyeAktar(
  admin: SupabaseClient,
  input: { schoolId: string; pendingId: string; studentId: string; ad: string },
): Promise<{ aktarilan: number; atlanan: number; error: string | null }> {
  const [{ data: onKayitlar, error: onKayitHatasi }, { data: aktifler, error: aktifHatasi }, { data: bekleyenler, error: bekleyenHatasi }] = await Promise.all([
    admin.from("pending_dershane_ogrenciler").select("id, ad").eq("school_id", input.schoolId).is("kullanildi_at", null),
    admin.from("students").select("id, profiles!students_id_fkey(ad)").eq("school_id", input.schoolId),
    admin.from("pdf_deneme_eslesme_bekleyenler").select("id, ad_soyad_ham, ders_sonuclari, yayinevi, tarih, tur")
      .eq("school_id", input.schoolId).eq("durum", "bekliyor"),
  ]);

  const sorguHatasi = onKayitHatasi ?? aktifHatasi ?? bekleyenHatasi;
  if (sorguHatasi) return { aktarilan: 0, atlanan: 0, error: sorguHatasi.message };

  const adNorm = adNormalize(input.ad);
  const adaUyanOnKayitlar = (onKayitlar ?? []).filter((satir) => adNormalize(String(satir.ad)) === adNorm);
  type AktifSatir = { id: string; profiles: { ad: string } | null };
  const adaUyanAktifler = ((aktifler ?? []) as unknown as AktifSatir[])
    .filter((satir) => satir.profiles && adNormalize(satir.profiles.ad) === adNorm);
  const adaUyanBekleyenler = (bekleyenler ?? []).filter((satir) => adNormalize(String(satir.ad_soyad_ham)) === adNorm);

  // Aynı isimli birden fazla ön kayıt/aktif öğrenci varsa ad-soyad tek başına
  // güvenli değildir. Yanlış öğrenciye yazmak yerine yönetici kuyruğunda bırak.
  const guvenliEslesme = adaUyanOnKayitlar.length === 1 &&
    adaUyanOnKayitlar[0].id === input.pendingId &&
    adaUyanAktifler.length === 1 &&
    adaUyanAktifler[0].id === input.studentId;
  if (!guvenliEslesme) {
    return { aktarilan: 0, atlanan: adaUyanBekleyenler.length, error: null };
  }

  let aktarilan = 0;
  let atlanan = 0;
  for (const bekleyen of adaUyanBekleyenler) {
    const sonuc = await ogretmenDenemeSonucuKaydet(admin, {
      studentId: input.studentId,
      tarih: String(bekleyen.tarih),
      tur: String(bekleyen.tur) as DenemeTuru,
      yayinevi: String(bekleyen.yayinevi),
      dersSonuclari: bekleyen.ders_sonuclari as unknown as DenemeDersSonucu[],
    });
    if (sonuc.error) {
      atlanan++;
      continue;
    }

    const { error: guncellemeHatasi } = await admin.from("pdf_deneme_eslesme_bekleyenler")
      .update({ durum: "atandi", atanan_student_id: input.studentId })
      .eq("id", bekleyen.id).eq("durum", "bekliyor");
    if (guncellemeHatasi) atlanan++;
    else aktarilan++;
  }

  return { aktarilan, atlanan, error: null };
}
