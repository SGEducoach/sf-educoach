import type { SupabaseClient } from "@supabase/supabase-js";
import { adNormalize } from "@/lib/validators";
import type { DenemeTuru } from "@/lib/types";
import type { KarneBirinciSayfa } from "@/lib/karne-birinci-sayfa";

export interface DenemeDersSonucu {
  ders: string;
  dogru: number;
  yanlis: number;
}

// Faz P4 (Deneme Net Dağıtımı raporu) — karnenin kazanım (konu bazlı)
// dökümü, deneme_kazanim_sonuclari'ne HAM olarak yazılır (ders adı burada
// TYT_DERSLERI'nin kanonik hali DEĞİL, karnenin kendi alt-ders adı —
// dersAdiNormalize buna uygulanmıyor). Şu an sadece TYT/BRANŞ için
// dolduruluyor (bkz. deneme-pdf-ayristirici.ts P4 notu, AYT taksonomisi
// netleşmedi).
export interface DenemeKazanimSonucu {
  ders: string;
  kazanimMetni: string;
  soru: number;
  dogru: number;
  yanlis: number;
}

function dersAdiNormalize(ad: string): string {
  return ad.trim().replace(/-\d$/, "").replace(/^Felsefe Grubu$/i, "Felsefe");
}

// Okulun (kaynak='ogretmen') deneme kaydını bulur; yoksa açar. Kullanıcı
// kararı (25.09.2026, "üst üste binmesin"): öğrenci aynı denemeyi (aynı
// tarih + tür) daha önce KENDİSİ girmişse ikinci bir kayıt açılmaz — o kayıt
// silinmeden okul kaydına dönüştürülür ve okulun sonuçları geçerli olur.
// Ters yön zaten kapalı: okul yüklediyse öğrenci/rehber aynı denemeyi
// giremiyor (bkz. veri-actions.ts denemeEkle, rehber-ogrenci-actions.ts).
export async function okulDenemeKaydiniHazirla(
  admin: SupabaseClient,
  input: {
    studentId: string;
    tarih: string;
    tur: DenemeTuru;
    yayinevi?: string;
    yeniKayitAlanlari: Record<string, unknown>;
  },
): Promise<{ error: string | null; denemeId: string | null; devralindi: boolean }> {
  let okulKaydiSorgusu = admin
    .from("denemeler")
    .select("id")
    .eq("student_id", input.studentId)
    .eq("tarih", input.tarih)
    .eq("tur", input.tur)
    .eq("kaynak", "ogretmen");
  if (input.yayinevi !== undefined) okulKaydiSorgusu = okulKaydiSorgusu.eq("yayinevi", input.yayinevi);
  const { data: okulKaydi, error: aramaHatasi } = await okulKaydiSorgusu
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (aramaHatasi) return { error: aramaHatasi.message, denemeId: null, devralindi: false };
  if (okulKaydi) return { error: null, denemeId: okulKaydi.id as string, devralindi: false };

  const { data: ogrenciKaydi, error: ogrenciAramaHatasi } = await admin
    .from("denemeler")
    .select("id")
    .eq("student_id", input.studentId)
    .eq("tarih", input.tarih)
    .eq("tur", input.tur)
    .eq("kaynak", "ogrenci")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ogrenciAramaHatasi) return { error: ogrenciAramaHatasi.message, denemeId: null, devralindi: false };
  if (ogrenciKaydi) {
    const guncelleme: Record<string, unknown> = { kaynak: "ogretmen" };
    if (input.yayinevi !== undefined) guncelleme.yayinevi = input.yayinevi;
    const { error: devirHatasi } = await admin.from("denemeler").update(guncelleme).eq("id", ogrenciKaydi.id);
    if (devirHatasi) return { error: devirHatasi.message, denemeId: null, devralindi: false };
    return { error: null, denemeId: ogrenciKaydi.id as string, devralindi: true };
  }

  const { data: yeniDeneme, error: olusturmaHatasi } = await admin
    .from("denemeler")
    .insert({ ...input.yeniKayitAlanlari, student_id: input.studentId, tarih: input.tarih, tur: input.tur, kaynak: "ogretmen" })
    .select("id")
    .single();
  if (olusturmaHatasi || !yeniDeneme) {
    return { error: olusturmaHatasi?.message ?? "Deneme oluşturulamadı.", denemeId: null, devralindi: false };
  }
  return { error: null, denemeId: yeniDeneme.id as string, devralindi: false };
}

export async function ogretmenDenemeSonucuKaydet(
  admin: SupabaseClient,
  input: {
    studentId: string;
    tarih: string;
    tur: DenemeTuru;
    yayinevi: string;
    dersSonuclari: DenemeDersSonucu[];
    kazanimSonuclari?: DenemeKazanimSonucu[];
    karneOzeti?: KarneBirinciSayfa;
  },
): Promise<{ error: string | null; denemeId: string | null }> {
  const hazirlik = await okulDenemeKaydiniHazirla(admin, {
    studentId: input.studentId,
    tarih: input.tarih,
    tur: input.tur,
    yayinevi: input.yayinevi,
    yeniKayitAlanlari: { hedefe_yakinlik: "belirsiz", zorluk: "orta", yayinevi: input.yayinevi },
  });
  if (hazirlik.error || !hazirlik.denemeId) return { error: hazirlik.error ?? "Deneme oluşturulamadı.", denemeId: null };
  const denemeId = hazirlik.denemeId;

  const okulDersleri = [...new Set(input.dersSonuclari.map((sonuc) => dersAdiNormalize(sonuc.ders)))];
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

  // Öğrencinin kaydı devralındıysa, okul sonucunda olmayan (öğrencinin
  // girdiği) ders satırları kalmasın — deneme tamamen okulun sonucu olsun.
  if (hazirlik.devralindi) {
    const { data: mevcutDersler } = await admin.from("deneme_ders_sonuclari").select("ders").eq("deneme_id", denemeId);
    const fazlaDersler = (mevcutDersler ?? []).map((d) => d.ders as string).filter((d) => !okulDersleri.includes(d));
    if (fazlaDersler.length > 0) {
      const { error: silmeHatasi } = await admin.from("deneme_ders_sonuclari").delete().eq("deneme_id", denemeId).in("ders", fazlaDersler);
      if (silmeHatasi) console.warn("Devralınan denemede öğrencinin fazla ders satırları silinemedi:", silmeHatasi.message);
    }
  }

  // Faz P4 — kazanım dökümü SUPPLEMENTARY: yoksa/yazılamazsa asıl kayıt
  // (yukarıdaki dersSonuclari) hiç etkilenmesin diye hata döndürülmüyor,
  // sadece konsola loglanıyor. Yeniden yükleme/güncelleme idempotent olsun
  // diye önce bu deneme_id'nin eski kazanım satırları silinip yeniden
  // yazılıyor (deneme_ders_sonuclari'nin aksine benzersiz kısıtı yok —
  // aynı kazanım metni birden fazla soruya karşılık gelebiliyor, bkz.
  // migration 0063).
  if (input.kazanimSonuclari && input.kazanimSonuclari.length > 0) {
    const { error: silmeHatasi } = await admin.from("deneme_kazanim_sonuclari").delete().eq("deneme_id", denemeId);
    if (silmeHatasi) {
      console.warn("Deneme kazanım verisi silinemedi (asıl kayıt etkilenmiyor):", silmeHatasi.message);
    } else {
      const { error: kazanimHatasi } = await admin.from("deneme_kazanim_sonuclari").insert(
        input.kazanimSonuclari.map((k) => ({
          deneme_id: denemeId,
          ders: k.ders,
          kazanim_metni: k.kazanimMetni,
          soru: k.soru,
          dogru: k.dogru,
          yanlis: k.yanlis,
        })),
      );
      if (kazanimHatasi) console.warn("Deneme kazanım verisi kaydedilemedi (asıl kayıt etkilenmiyor):", kazanimHatasi.message);
    }
  }

  // Karnenin 1. sayfası (puan/sıralama, ders ortalamaları, cevaplar —
  // migration 0123). Kazanım gibi EK veri: yazılamazsa (ör. migration henüz
  // uygulanmadıysa) asıl kayıt etkilenmesin diye yalnızca loglanıyor.
  if (input.karneOzeti && (input.karneOzeti.puanlar.length > 0 || input.karneOzeti.testler.length > 0)) {
    const { error: karneHatasi } = await admin.from("deneme_karne_ozetleri").upsert({
      deneme_id: denemeId,
      puanlar: input.karneOzeti.puanlar,
      ders_ortalamalari: input.karneOzeti.dersler,
      cevaplar: input.karneOzeti.testler,
      updated_at: new Date().toISOString(),
    }, { onConflict: "deneme_id" });
    if (karneHatasi) console.warn("Deneme karne özeti kaydedilemedi (asıl kayıt etkilenmiyor):", karneHatasi.message);
  }

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
