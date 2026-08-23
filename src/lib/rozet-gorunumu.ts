import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import type { OyunEtiketiSayaclari, RozetDurum } from "@/components/dashboard/Rozetlerim";

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
}

const BOS_DURUM: RozetDurum = { konu: "yok", soru: "yok", deneme: "yok", genel: "yok" };
const BOS_SAYACLAR: OyunEtiketiSayaclari = { konu: 0, soru: 0, deneme: 0 };
const CEKIRDEK_DERSLER = ["Türkçe", "Matematik", "Fizik", "Kimya", "Biyoloji"] as const;

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

function gunFarki(onceki: string, sonraki: string): number {
  return Math.round((Date.parse(`${sonraki}T12:00:00Z`) - Date.parse(`${onceki}T12:00:00Z`)) / 86_400_000);
}

function konuSeviyesi(tarihler: string[], bugun: string): RozetDurum["konu"] {
  const gunler = [...new Set(tarihler)].sort();
  if (!gunler.length) return "yok";

  let sonSeri: string[] = [];
  let seri: string[] = [];
  for (const tarih of gunler) {
    if (!seri.length || gunFarki(seri[seri.length - 1], tarih) <= 3) seri.push(tarih);
    else seri = [tarih];
    sonSeri = [...seri];
  }

  if (gunFarki(sonSeri[sonSeri.length - 1], bugun) > 3) return "yok";
  if (sonSeri.length >= 30) return "altin";
  if (sonSeri.length >= 20) return "gumus";
  if (sonSeri.length >= 15) return "bronz";
  return "yok";
}

function soruSeviyesi(kayitlar: { ders: string; dogru: number; yanlis: number }[]): RozetDurum["soru"] {
  const toplamlar = new Map<string, number>(CEKIRDEK_DERSLER.map((ders) => [ders, 0]));
  for (const kayit of kayitlar) {
    if (toplamlar.has(kayit.ders)) toplamlar.set(kayit.ders, (toplamlar.get(kayit.ders) ?? 0) + kayit.dogru + kayit.yanlis);
  }
  const enDusuk = Math.min(...toplamlar.values());
  if (enDusuk >= 50) return "altin";
  if (enDusuk >= 30) return "gumus";
  if (enDusuk >= 20) return "bronz";
  return "yok";
}

function denemeSeviyesi(sayi: number, sinifSeviyesi: string | null): RozetDurum["deneme"] {
  if (sinifSeviyesi === "9" || sinifSeviyesi === "10") {
    if (sayi >= 3) return "altin";
    if (sayi >= 2) return "gumus";
    if (sayi >= 1) return "bronz";
    return "yok";
  }
  if (sayi >= 8) return "altin";
  if (sayi >= 4) return "gumus";
  if (sayi >= 3) return "bronz";
  return "yok";
}

async function rozetleriHesapla(ogrenci: RozetOgrencisi): Promise<Pick<RozetGorunumu, "durum" | "oyunSayaclari">> {
  const admin = createAdminClient();
  const bugun = bugununTarihiTR();
  const [konuGuncel, soruGuncel, denemeGuncel, konuTum, soruTum, denemeTum] = await Promise.all([
    admin.from("konu_calismalar").select("tarih").eq("student_id", ogrenci.id).gte("tarih", tarihEkle(bugun, -30)).lte("tarih", bugun),
    admin.from("soru_cozumleri").select("ders, dogru, yanlis").eq("student_id", ogrenci.id).gte("tarih", tarihEkle(bugun, -3)).lte("tarih", bugun),
    admin.from("denemeler").select("id", { count: "exact", head: true }).eq("student_id", ogrenci.id).gte("tarih", tarihEkle(bugun, -30)).lte("tarih", bugun),
    admin.from("konu_calismalar").select("id", { count: "exact", head: true }).eq("student_id", ogrenci.id),
    admin.from("soru_cozumleri").select("dogru, yanlis, bos").eq("student_id", ogrenci.id),
    admin.from("denemeler").select("id", { count: "exact", head: true }).eq("student_id", ogrenci.id),
  ]);

  const konu = konuSeviyesi(((konuGuncel.data as { tarih: string }[] | null) ?? []).map((x) => x.tarih), bugun);
  const soru = soruSeviyesi((soruGuncel.data as { ders: string; dogru: number; yanlis: number }[] | null) ?? []);
  const deneme = denemeSeviyesi(denemeGuncel.count ?? 0, ogrenci.sinifSeviyesi);
  const altinSayisi = [konu, soru, deneme].filter((seviye) => seviye === "altin").length;
  const genel: RozetDurum["genel"] = altinSayisi === 3 ? "altin" : altinSayisi === 2 ? "gumus" : altinSayisi === 1 ? "bronz" : "yok";

  return {
    durum: { konu, soru, deneme, genel },
    oyunSayaclari: {
      konu: konuTum.count ?? 0,
      soru: ((soruTum.data as { dogru: number; yanlis: number; bos: number }[] | null) ?? [])
        .reduce((toplam, kayit) => toplam + kayit.dogru + kayit.yanlis + kayit.bos, 0),
      deneme: denemeTum.count ?? 0,
    },
  };
}

async function gorunumuOlustur(kurumAdi: string | null, ogrenciler: RozetOgrencisi[], istenenOgrenciId?: string, istenenSinifId?: string): Promise<RozetGorunumu> {
  const sirali = [...ogrenciler].sort(ogrencileriSirala);
  const sinifMap = new Map<string, string>();
  for (const ogrenci of sirali) if (ogrenci.sinifId) sinifMap.set(ogrenci.sinifId, ogrenci.sinifAdi);
  const siniflar = [...sinifMap].map(([id, ad]) => ({ id, ad })).sort((a, b) => a.ad.localeCompare(b.ad, "tr", { numeric: true }));
  const seciliSinifId = istenenSinifId && sinifMap.has(istenenSinifId) ? istenenSinifId : "tumu";
  const adaylar = seciliSinifId === "tumu" ? sirali : sirali.filter((ogrenci) => ogrenci.sinifId === seciliSinifId);
  const seciliOgrenci = adaylar.find((ogrenci) => ogrenci.id === istenenOgrenciId) ?? adaylar[0] ?? null;
  if (!seciliOgrenci) return { kurumAdi, ogrenciler: sirali, siniflar, seciliSinifId, seciliOgrenci: null, durum: BOS_DURUM, oyunSayaclari: BOS_SAYACLAR };
  const rozetler = await rozetleriHesapla(seciliOgrenci);
  return { kurumAdi, ogrenciler: sirali, siniflar, seciliSinifId, seciliOgrenci, ...rozetler };
}

export async function kurumRozetGorunumuGetir(schoolId: string, istenenOgrenciId?: string, istenenSinifId?: string): Promise<RozetGorunumu> {
  const admin = createAdminClient();
  const [{ data: okul }, { data: ogrenciler }] = await Promise.all([
    admin.from("schools").select("ad").eq("id", schoolId).maybeSingle(),
    admin.from("students")
      .select("id, okul_no, profiles!students_id_fkey(ad), classes(id, seviye, sube)")
      .eq("school_id", schoolId),
  ]);
  const liste = ((ogrenciler as unknown as OgrenciSatiri[]) ?? []).map(ogrenciyeDonustur);
  return gorunumuOlustur(okul?.ad ?? "Kurum", liste, istenenOgrenciId, istenenSinifId);
}

export async function veliRozetGorunumuGetir(parentId: string, istenenOgrenciId?: string, istenenSinifId?: string): Promise<RozetGorunumu> {
  const admin = createAdminClient();
  const { data } = await admin.from("parent_students")
    .select("students(id, okul_no, profiles!students_id_fkey(ad), classes(id, seviye, sube))")
    .eq("parent_id", parentId);
  type VeliSatiri = { students: OgrenciSatiri | null };
  const liste = ((data as unknown as VeliSatiri[]) ?? []).flatMap((satir) => satir.students ? [ogrenciyeDonustur(satir.students)] : []);
  return gorunumuOlustur(null, liste, istenenOgrenciId, istenenSinifId);
}
