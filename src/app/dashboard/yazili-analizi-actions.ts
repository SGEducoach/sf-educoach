"use server";

import { createClient } from "@/lib/supabase/server";
import type { Kaynak } from "@/lib/types";
import { soruPuaniHatasi, soruPuanlariniHesapla, GIRIS_MODLARI, type GirisModu } from "@/lib/yazili-soru-puanlari";

// Supabase (PostgREST) çok-bire ve bire-bir gömülü ilişkileri NESNE olarak
// döndürür, ama supabase-js'in tip çıkarımı (şema tipi verilmediğinde)
// bunları DİZİ diye işaretler. `iliski?.[0]` diye okumak çalışma anında hep
// undefined verir — bu dosyada öğrenci adlarının "Bilinmeyen", sınıf
// listesinin boş görünmesinin sebebi buydu. İki biçimi de karşılar.
function tekIliski<T>(deger: T | T[] | null | undefined): T | null {
  if (deger == null) return null;
  return Array.isArray(deger) ? (deger[0] ?? null) : deger;
}

export async function getAktifKullaniciId(): Promise<{ error: string | null; userId: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { error: error?.message ?? null, userId: user?.id ?? null };
}

/**
 * Yazılı sınavı ve ilişkili verileri atomik olarak kaydeder.
 * Kayıt işlemi tek bir PostgreSQL fonksiyonu (yazili_sinav_olustur) içinde
 * gerçekleştirilir; bu sayede tüm inserts ya da hiçbiri başarısız olur.
 */
export async function yaziliSinavOlustur(
  input: {
    sinifId: string;
    ders: string;
    ad: string;
    tarih: string; // YYYY-MM-DD
    ogretmenId: string; // oturumdaki öğretmen ID
    ogrenciler: { id: string; toplamPuan: number }[]; // sınıfın tüm öğrencileri ve gerçek toplam puanlar
    mod: GirisModu; // soru puanı giriş modu: tek-tek | temsili | otomatik (bkz. lib/yazili-soru-puanlari.ts)
    temsiliOgrenciSkorlar: Record<string, number[]>; // ogrenciId -> [soru1Puan, soru2Puan, ...]
    maxPuanlar: number[]; // her sorunun maksimum puanı (sıra ile)
    kazanimlar: string[]; // her sorunun kazanımı (sıra ile)
  }
): Promise<{ error: string | null; sinavId: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açılmadı", sinavId: null };
  if (input.ogretmenId !== user.id) return { error: "Oturum öğretmen kimliğiyle eşleşmiyor", sinavId: null };

  // Yetkilendirme: öğretmenin ilgili sınıf/ders için ogretmen_dersleri'te kayıtlı olup olmadığını kontrol et
  const { data: ogretmenDersi, error: ogretmenDersiError } = await supabase
    .from("ogretmen_dersleri")
    .select("id")
    .eq("teacher_id", input.ogretmenId)
    .eq("class_id", input.sinifId)
    .eq("ders", input.ders)
    .single();

  if (ogretmenDersiError || !ogretmenDersi) {
    return { error: "Bu sınıf ve ders için yetkiniz yok", sinavId: null };
  }

  // Girdi doğrulamaları
  if (input.ogrenciler.length === 0) {
    return { error: "Öğrenci listesi boş", sinavId: null };
  }
  if (!GIRIS_MODLARI.includes(input.mod)) {
    return { error: "Geçersiz soru puanı giriş yöntemi", sinavId: null };
  }
  const m = input.maxPuanlar.length;
  if (m === 0) {
    return { error: "Soru listesi boş", sinavId: null };
  }
  if (input.kazanimlar.length !== m || input.kazanimlar.some((kazanim) => !kazanim.trim())) {
    return { error: "Her soru için bir kazanım girilmelidir", sinavId: null };
  }
  // Her öğrencinin toplam puanının 0 ve sınav maksimumu arasında olduğunu kontrol et
  const maxTotal = input.maxPuanlar.reduce((sum, max) => sum + max, 0);
  for (const ogr of input.ogrenciler) {
    if (!Number.isInteger(ogr.toplamPuan) || ogr.toplamPuan < 0 || ogr.toplamPuan > maxTotal) {
      return { error: `Öğrenci ${ogr.id} için toplam puan geçersiz`, sinavId: null };
    }
  }
  // Soru puanları: üç giriş modunun hepsi TEK kaynaktan (lib/yazili-soru-puanlari)
  // — önizlemede görülen ile kaydedilen birebir aynı. Hangi öğrencilerin puanının
  // "girilen" (actual) olduğunu istemcinin listesi değil, mod + toplamlar belirler.
  const ogrenciToplamlari = input.ogrenciler.map((ogr) => ({ id: ogr.id, toplam: ogr.toplamPuan }));
  const soruGirdisi = { mod: input.mod, ogrenciler: ogrenciToplamlari, temsiliSkorlar: input.temsiliOgrenciSkorlar, maxPuanlar: input.maxPuanlar };
  const soruHatasi = soruPuaniHatasi(soruGirdisi);
  if (soruHatasi) return { error: soruHatasi, sinavId: null };
  let hesap: ReturnType<typeof soruPuanlariniHesapla>;
  try {
    hesap = soruPuanlariniHesapla(soruGirdisi);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Soru puanları hesaplanamadı", sinavId: null };
  }
  const temsiliIdler = [...hesap.gercekIdler];

  // p_ogrencier: [{"id":"<uuid>","toplamPuan":<int>}, ...]
  const p_ogrencier = input.ogrenciler.map((ogr) => ({ id: ogr.id, toplamPuan: ogr.toplamPuan }));
  // p_soruSonuclari: [{"ogrenci_id":"<uuid>","sira":<int>,"puan":<int>,"kaynak":"actual|estimated","estimation_version":"v1|oransal-v1|null"}, ...]
  const p_soruSonuclari: Array<{
    ogrenci_id: string;
    sira: number;
    puan: number;
    kaynak: Kaynak;
    estimation_version: string | null;
  }> = [];
  for (const ogr of input.ogrenciler) {
    const skorlar = hesap.skorlar[ogr.id];
    if (!skorlar || skorlar.length !== m) {
      return { error: "Bir öğrencinin soru puanları hesaplanamadı", sinavId: null };
    }
    const gercek = hesap.gercekIdler.has(ogr.id);
    for (let j = 0; j < m; j++) {
      p_soruSonuclari.push({
        ogrenci_id: ogr.id,
        sira: j + 1,
        puan: skorlar[j],
        kaynak: gercek ? "actual" : "estimated",
        estimation_version: gercek ? null : hesap.tahminSurumu,
      });
    }
  }

  try {
    const rpcResult = await supabase
      .rpc("yazili_sinav_olustur", {
        p_sinifId: input.sinifId,
        p_ders: input.ders,
        p_ad: input.ad,
        p_tarih: input.tarih,
        p_ogretmenId: input.ogretmenId,
        p_ogrencier: p_ogrencier,
        p_temsiliOgrenciIds: temsiliIdler,
        p_temsiliOgrenciSkorlar: Object.fromEntries(temsiliIdler.map((id) => [id, input.temsiliOgrenciSkorlar[id]])),
        p_maxPuanlar: input.maxPuanlar,
        p_kazanimlar: input.kazanimlar.map((kazanim) => kazanim.trim()),
        p_soruSonuclari: p_soruSonuclari,
      });

    if (rpcResult.error) {
      throw rpcResult.error;
    }
    const sinavId = rpcResult.data as string | null;
    if (!sinavId) {
      throw new Error("RPC returned null sinavId");
    }
    return { error: null, sinavId };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu", sinavId: null };
  }
}

/**
 * Belirli bir sınavın analiz verisini getirir.
 * Sınavın sınıf ve ders bilgileriyle yetkilendirme kontrolü yapar.
 */
export async function yaziliSinavGetir(
  sinavId: string,
  ogretmenId: string
): Promise<{
  error: string | null;
  sinav: {
    id: string;
    ad: string;
    tarih: string;
    ders: string;
    ogretmenId: string | null;
  } | null;
  ogrenciler: { id: string; ad: string; toplamPuan: number; temsilciMi: boolean }[];
  sorular: { id: string; sira: number; maxPuan: number; kazanim: string }[];
  soruSonuclari: { ogrenciId: string; soruId: string; puan: number; kaynak: Kaynak; estimationVersion: string | null }[];
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açılmadı", sinav: null, ogrenciler: [], sorular: [], soruSonuclari: [] };

  // Sınavı getir
  const { data: sinavData, error: sinavError } = await supabase
    .from("yazili_sinavlar")
    .select("id, ad, tarih, ders, ogretmen_id, class_id")
    .eq("id", sinavId)
    .single();

  if (sinavError || !sinavData) {
    return { error: sinavError?.message ?? "Sınav bulunamadı", sinav: null, ogrenciler: [], sorular: [], soruSonuclari: [] };
  }

  // Yetkilendirme: öğretmenin bu sınavın sınıf/ders için ogretmen_dersleri'te kayıtlı olup olmadığını kontrol et
  const { data: ogretmenDersi, error: ogretmenDersiError } = await supabase
    .from("ogretmen_dersleri")
    .select("id")
    .eq("teacher_id", ogretmenId)
    .eq("class_id", sinavData.class_id)
    .eq("ders", sinavData.ders)
    .single();

  if (ogretmenDersiError || !ogretmenDersi) {
    return { error: "Bu sınavı görüntüleme yetkiniz yok", sinav: null, ogrenciler: [], sorular: [], soruSonuclari: [] };
  }

  const sinav = {
    id: sinavData.id,
    ad: sinavData.ad,
    tarih: sinavData.tarih,
    ders: sinavData.ders,
    ogretmenId: sinavData.ogretmen_id,
  };

  // Öğrencileri getir (sınıfın öğrencileri değil, bu sınavın öğrencileri)
  const { data: ogrencilerData, error: ogrencilerError } = await supabase
    .from("yazili_ogrenci_sonuclari")
    .select("id, ogrenci_id, toplam_puan, temsilci_mi, students!inner(profiles!students_id_fkey(ad))")
    .eq("yazili_sinav_id", sinavId);

  if (ogrencilerError) {
    return { error: ogrencilerError?.message ?? "Öğrenci sonuçları alınamadı", sinav, ogrenciler: [], sorular: [], soruSonuclari: [] };
  }

  const ogrenciler = ogrencilerData.map((ogr) => ({
    id: ogr.ogrenci_id,
    ad: tekIliski(tekIliski(ogr.students)?.profiles)?.ad?.trim() || "İsimsiz öğrenci",
    toplamPuan: ogr.toplam_puan,
    temsilciMi: ogr.temsilci_mi,
  }));

  // Soruları getir
  const { data: sorularData, error: sorularError } = await supabase
    .from("yazili_sorular")
    .select("id, sira, max_puan, kazanim")
    .eq("yazili_sinav_id", sinavId)
    .order("sira");

  if (sorularError) {
    return { error: sorularError?.message ?? "Sorular alınamadı", sinav, ogrenciler, sorular: [], soruSonuclari: [] };
  }

  const sorular = sorularData.map((s) => ({
    id: s.id,
    sira: s.sira,
    maxPuan: s.max_puan,
    kazanim: s.kazanim,
  }));

  // Soru sonuçlarını getir
  const { data: soruSonuclariData, error: soruSonuclariError } = await supabase
    .from("yazili_soru_sonuclari")
    .select("ogrenci_id, soru_id, puan, kaynak, estimation_version")
    .eq("yazili_sinav_id", sinavId);

  if (soruSonuclariError) {
    return { error: soruSonuclariError?.message ?? "Soru sonuçları alınamadı", sinav, ogrenciler, sorular, soruSonuclari: [] };
  }

  const soruSonuclari = soruSonuclariData.map((ss) => ({
    ogrenciId: ss.ogrenci_id,
    soruId: ss.soru_id,
    puan: ss.puan,
    kaynak: ss.kaynak as Kaynak,
    estimationVersion: ss.estimation_version,
  }));

  return {
    error: null,
    sinav,
    ogrenciler,
    sorular,
    soruSonuclari,
  };
}

/**
 * Öğretmenin verdiği derslere göre sınıflar ve ders listesi döndürür.
 */
export async function getOgretmenDersleri(
  ogretmenId: string
): Promise<{
  error: string | null;
  siniflar: { id: string; ad: string }[];
  dersler: string[];
}> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ogretmenId)) {
    return { error: null, siniflar: [], dersler: [] };
  }
  const supabase = await createClient();
  // Get teacher's class-subject mappings
  const { data: ogretmenDersleri, error: ogretmenDersleriError } = await supabase
    .from("ogretmen_dersleri")
    .select("class_id, ders, classes!inner(id, seviye, sube)")
    .eq("teacher_id", ogretmenId);

  if (ogretmenDersleriError) {
    return { error: ogretmenDersleriError.message, siniflar: [], dersler: [] };
  }

  // Build siniflar map (unique class_id with name)
  const sinifMap = new Map<string, string>();
  ogretmenDersleri?.forEach((od) => {
    const sinif = tekIliski(od.classes);
    if (!sinif) return;
    sinifMap.set(od.class_id, `${sinif.seviye}-${sinif.sube}`);
  });

  const siniflar: { id: string; ad: string }[] = Array.from(sinifMap.entries()).map(
    ([id, ad]) => ({ id, ad })
  );

  // Get unique dersler
  const dersler = Array.from(
    new Set(ogretmenDersleri?.map((od) => od.ders) ?? [])
  ).sort();

  return { error: null, siniflar, dersler };
}

/**
 * Belirli bir sınıfın öğrencilerini (id ve ad) döndürür.
 */
export async function getSinifOgrencileri(
  sinifId: string
): Promise<{
  error: string | null;
  ogrenciler: { id: string; ad: string }[];
}> {
  const supabase = await createClient();
  const { data: ogrencilerData, error: ogrencilerError } = await supabase
    .from("students")
    .select("id, profiles!students_id_fkey(ad)")
    .eq("class_id", sinifId);

  if (ogrencilerError) {
    return { error: ogrencilerError.message, ogrenciler: [] };
  }

  type OgrenciProfilSatiri = {
    id: string;
    profiles: { ad: string } | { ad: string }[] | null;
  };
  const ogrenciler = ((ogrencilerData ?? []) as unknown as OgrenciProfilSatiri[]).map((o) => {
    const profil = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    return {
      id: o.id,
      ad: profil?.ad?.trim() || "İsimsiz öğrenci",
    };
  });

  return { error: null, ogrenciler };
}
