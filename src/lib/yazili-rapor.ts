import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { raporuOlustur, type YaziliRapor } from "@/lib/yazili-rapor-hesap";

// Supabase çok-bire / bire-bir gömmeleri NESNE döndürür, tip ise dizi der
// (bkz. yazili-analizi-actions.ts tekIliski).
function tek<T>(deger: T | T[] | null | undefined): T | null {
  if (deger == null) return null;
  return Array.isArray(deger) ? (deger[0] ?? null) : deger;
}

// Rapor verisi. ERİŞİM: yazılı tabloları RLS ile yalnızca o sınıfın o
// dersine kayıtlı öğretmene açık — sınav satırı normal (oturumlu) client ile
// okunamıyorsa rapor yok (null → sayfa 404). Okul/öğretmen/müdür adı gibi
// yardımcı bilgiler erişim bu şekilde doğrulandıktan SONRA servis anahtarıyla
// okunur (öğretmenin RLS'i müdürün profilini göstermeyebilir).
export async function yaziliRaporuGetir(sinavId: string): Promise<YaziliRapor | null> {
  const supabase = await createClient();
  const { data: sinav } = await supabase
    .from("yazili_sinavlar")
    .select("id, ad, tarih, ders, class_id, ogretmen_id")
    .eq("id", sinavId)
    .maybeSingle();
  if (!sinav) return null;

  const [{ data: sorular }, { data: sonuclar }, { data: soruSonuclari }] = await Promise.all([
    supabase.from("yazili_sorular").select("id, sira, max_puan, kazanim").eq("yazili_sinav_id", sinavId),
    supabase.from("yazili_ogrenci_sonuclari").select("ogrenci_id, toplam_puan").eq("yazili_sinav_id", sinavId),
    supabase.from("yazili_soru_sonuclari").select("ogrenci_id, soru_id, puan, kaynak, estimation_version").eq("yazili_sinav_id", sinavId),
  ]);

  const admin = createAdminClient();
  const ogrenciIdleri = (sonuclar ?? []).map((s) => s.ogrenci_id as string);
  const [{ data: sinif }, { data: ogretmen }, { data: ogretmenProfili }, { data: ogrenciSatirlari }] = await Promise.all([
    admin.from("classes").select("seviye, sube, school_id, schools(ad)").eq("id", sinav.class_id).maybeSingle(),
    admin.from("teachers").select("brans").eq("id", sinav.ogretmen_id).maybeSingle(),
    admin.from("profiles").select("ad").eq("id", sinav.ogretmen_id).maybeSingle(),
    ogrenciIdleri.length
      ? admin.from("students").select("id, okul_no, profiles!students_id_fkey(ad)").in("id", ogrenciIdleri)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // Okul müdürü: okulun öğretmen kayıtlarından rolü "mudur" olan profil
  // (müdür hesabı teachers'a brans "Müdür" ile de yazılıyor — bkz. handle_new_user).
  let mudurAdi: string | null = null;
  if (sinif?.school_id) {
    const { data: okulKadrosu } = await admin.from("teachers").select("id, brans").eq("school_id", sinif.school_id);
    const kadroIdleri = (okulKadrosu ?? []).map((t) => t.id as string);
    if (kadroIdleri.length) {
      const { data: mudurler } = await admin.from("profiles").select("id, ad").in("id", kadroIdleri).eq("role", "mudur").limit(1);
      const mudurId = mudurler?.[0]?.id ?? (okulKadrosu ?? []).find((t) => t.brans === "Müdür")?.id;
      if (mudurler?.[0]?.ad) mudurAdi = mudurler[0].ad as string;
      else if (mudurId) {
        const { data: p } = await admin.from("profiles").select("ad").eq("id", mudurId).maybeSingle();
        mudurAdi = (p?.ad as string | undefined) ?? null;
      }
    }
  }

  type OgrenciSatiri = { id: string; okul_no: string | null; profiles: { ad: string | null } | { ad: string | null }[] | null };
  const ogrenciBilgisi = new Map(
    ((ogrenciSatirlari ?? []) as OgrenciSatiri[]).map((o) => [o.id, { okulNo: (o.okul_no ?? "").trim(), ad: tek(o.profiles)?.ad?.trim() || "İsimsiz öğrenci" }])
  );
  const okul = tek((sinif as { schools?: { ad: string } | { ad: string }[] | null } | null)?.schools);

  return raporuOlustur({
    sinav: { id: sinav.id, ad: sinav.ad, tarih: sinav.tarih, ders: sinav.ders },
    sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "-",
    okulAdi: okul?.ad ?? "-",
    ogretmenAdi: (ogretmenProfili?.ad as string | undefined) ?? "-",
    ogretmenBransi: (ogretmen?.brans as string | undefined) ?? null,
    mudurAdi,
    sorular: (sorular ?? []).map((s) => ({ id: s.id, sira: s.sira, maxPuan: s.max_puan, kazanim: s.kazanim })),
    ogrenciler: (sonuclar ?? []).map((s) => {
      const bilgi = ogrenciBilgisi.get(s.ogrenci_id);
      return { id: s.ogrenci_id, ad: bilgi?.ad ?? "İsimsiz öğrenci", okulNo: bilgi?.okulNo ?? "", toplam: s.toplam_puan };
    }),
    soruSonuclari: (soruSonuclari ?? []).map((r) => ({
      ogrenciId: r.ogrenci_id, soruId: r.soru_id, puan: r.puan, kaynak: r.kaynak, surum: r.estimation_version,
    })),
  });
}
