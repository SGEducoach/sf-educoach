import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { konuHakimiyetiOzetiGetir } from "@/lib/konu-hakimiyeti";
import { dogrulukRozetSeviyesiHesapla } from "@/lib/analiz-motoru";
import type { RozetDurum, OyunEtiketiSayaclari } from "@/components/dashboard/Rozetlerim";
import type { RozetSeviye } from "@/lib/types";

export interface RozetOgrencisi {
  id: string;
  ad: string;
  okulNo: string;
  sinifId: string | null;
  sinifAdi: string;
  sinifSeviyesi: string | null;
}

export interface RozetGorunumu {
  kurumAdi: string | null;
  ogrenciler: RozetOgrencisi[];
  siniflar: { id: string; ad: string }[];
  seciliSinifId: string;
  seciliOgrenci: RozetOgrencisi | null;
  durum: RozetDurum;
  oyunSayaclari: OyunEtiketiSayaclari;
  // Analiz Motoru Faz D — Katman 2'nin (bileşik mastery skoru) rozet
  // sistemine EKLENMESİ, ama mevcut hacim bazlı seviyeleri (durum.*)
  // GERİYE DÖNÜK DÜŞÜRMEDEN. Bkz. analiz-motoru.ts, dogrulukRozetSeviyesiHesapla.
  dogrulukSeviyesi: RozetSeviye;
}

const BOS_DURUM: RozetDurum = { konu: "yok", soru: "yok", deneme: "yok", genel: "yok" };
const BOS_SAYACLAR: OyunEtiketiSayaclari = { konu: 0, soru: 0, deneme: 0 };

type OgrenciSatiri = {
  id: string;
  okul_no: string;
  profiles: { ad: string } | null;
  classes: { id: string; seviye: string; sube: string } | null;
};

function ogrenciyeDonustur(satir: OgrenciSatiri): RozetOgrencisi {
  return {
    id: satir.id,
    ad: satir.profiles?.ad ?? "İsimsiz öğrenci",
    okulNo: satir.okul_no,
    sinifId: satir.classes?.id ?? null,
    sinifAdi: satir.classes ? `${satir.classes.seviye}-${satir.classes.sube}` : "Sınıfsız",
    sinifSeviyesi: satir.classes?.seviye ?? null,
  };
}

function ogrencileriSirala(a: RozetOgrencisi, b: RozetOgrencisi): number {
  const sinif = a.sinifAdi.localeCompare(b.sinifAdi, "tr", { numeric: true });
  return sinif || a.ad.localeCompare(b.ad, "tr");
}

// Analiz Motoru Faz D — bu fonksiyon ÖNCEDEN "genel"/"konu"/"soru"/"deneme"
// eşiklerini burada TEKRAR uyguluyordu (SQL'deki ogrenci_konu_seviyesi /
// ogrenci_soru_seviyesi / ogrenci_deneme_seviyesi / ogrenci_rozet_durumu
// fonksiyonlarının birebir TypeScript kopyası) — iki yerde bakım
// gerektiren, sessizce sapabilecek bir risk. KÖK NEDEN: bu fonksiyon
// admin (service-role) client kullanıyordu ve ogrenci_rozet_durumu RPC'sinin
// yetki kontrolü admin/moderatörü kapsamıyordu (migration 0062 ile
// düzeltildi) — artık kanonik RPC'yi ÇAĞIRIYORUZ, formülü TEKRAR
// YAZMIYORUZ. `supabase` (RLS-scoped, çağıranın oturumu) bu RPC için,
// `admin` (service-role) ise oyun sayaçları + doğruluk rozeti verisi
// için (basit sayımlar, yetki riski yok) kullanılıyor.
async function rozetleriHesapla(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ogrenci: RozetOgrencisi,
): Promise<Pick<RozetGorunumu, "durum" | "oyunSayaclari" | "dogrulukSeviyesi">> {
  const admin = createAdminClient();
  const [{ data: durumHam }, konuTumSonuc, { data: soruTum }, denemeTumSonuc, konuHakimiyetiOzeti] = await Promise.all([
    supabase.rpc("ogrenci_rozet_durumu", { p_student_id: ogrenci.id }),
    admin.from("konu_calismalar").select("id", { count: "exact", head: true }).eq("student_id", ogrenci.id),
    admin.from("soru_cozumleri").select("dogru, yanlis, bos").eq("student_id", ogrenci.id),
    admin.from("denemeler").select("id", { count: "exact", head: true }).eq("student_id", ogrenci.id),
    // Analiz Motoru Faz D — doğruluk rozeti (Katman 2'nin çıktısı, bkz.
    // analiz-motoru.ts). konuHakimiyetiOzetiGetir zaten admin/regular
    // her iki client tipini de kabul ediyor (analizVerisiGetir ile aynı desen).
    konuHakimiyetiOzetiGetir(admin as Parameters<typeof konuHakimiyetiOzetiGetir>[0], ogrenci.id),
  ]);

  const durum = (durumHam as RozetDurum | null) ?? BOS_DURUM;
  const masterySkorlari = konuHakimiyetiOzeti.satirlar
    .map((s) => s.masterySkoru)
    .filter((s): s is number => s !== null);

  return {
    durum,
    oyunSayaclari: {
      konu: konuTumSonuc.count ?? 0,
      soru: ((soruTum as { dogru: number; yanlis: number; bos: number }[] | null) ?? [])
        .reduce((toplam, kayit) => toplam + kayit.dogru + kayit.yanlis + kayit.bos, 0),
      deneme: denemeTumSonuc.count ?? 0,
    },
    dogrulukSeviyesi: dogrulukRozetSeviyesiHesapla(masterySkorlari),
  };
}

async function gorunumuOlustur(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kurumAdi: string | null, ogrenciler: RozetOgrencisi[], istenenOgrenciId?: string, istenenSinifId?: string,
): Promise<RozetGorunumu> {
  const sirali = [...ogrenciler].sort(ogrencileriSirala);
  const sinifMap = new Map<string, string>();
  for (const ogrenci of sirali) if (ogrenci.sinifId) sinifMap.set(ogrenci.sinifId, ogrenci.sinifAdi);
  const siniflar = [...sinifMap].map(([id, ad]) => ({ id, ad })).sort((a, b) => a.ad.localeCompare(b.ad, "tr", { numeric: true }));
  const seciliSinifId = istenenSinifId && sinifMap.has(istenenSinifId) ? istenenSinifId : "tumu";
  const adaylar = seciliSinifId === "tumu" ? sirali : sirali.filter((ogrenci) => ogrenci.sinifId === seciliSinifId);
  const seciliOgrenci = adaylar.find((ogrenci) => ogrenci.id === istenenOgrenciId) ?? adaylar[0] ?? null;
  if (!seciliOgrenci) return { kurumAdi, ogrenciler: sirali, siniflar, seciliSinifId, seciliOgrenci: null, durum: BOS_DURUM, oyunSayaclari: BOS_SAYACLAR, dogrulukSeviyesi: "yok" };
  const rozetler = await rozetleriHesapla(supabase, seciliOgrenci);
  return { kurumAdi, ogrenciler: sirali, siniflar, seciliSinifId, seciliOgrenci, ...rozetler };
}

export async function kurumRozetGorunumuGetir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string, istenenOgrenciId?: string, istenenSinifId?: string,
): Promise<RozetGorunumu> {
  const admin = createAdminClient();
  const [{ data: okul }, { data: ogrenciler }] = await Promise.all([
    admin.from("schools").select("ad").eq("id", schoolId).maybeSingle(),
    admin.from("students")
      .select("id, okul_no, profiles!students_id_fkey(ad), classes(id, seviye, sube)")
      .eq("school_id", schoolId),
  ]);
  const liste = ((ogrenciler as unknown as OgrenciSatiri[]) ?? []).map(ogrenciyeDonustur);
  return gorunumuOlustur(supabase, okul?.ad ?? "Kurum", liste, istenenOgrenciId, istenenSinifId);
}

export async function veliRozetGorunumuGetir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string, istenenOgrenciId?: string, istenenSinifId?: string,
): Promise<RozetGorunumu> {
  const admin = createAdminClient();
  const { data } = await admin.from("parent_students")
    .select("students(id, okul_no, profiles!students_id_fkey(ad), classes(id, seviye, sube))")
    .eq("parent_id", parentId);
  type VeliSatiri = { students: OgrenciSatiri | null };
  const liste = ((data as unknown as VeliSatiri[]) ?? []).flatMap((satir) => satir.students ? [ogrenciyeDonustur(satir.students)] : []);
  return gorunumuOlustur(supabase, null, liste, istenenOgrenciId, istenenSinifId);
}
