import type { SupabaseClient } from "@supabase/supabase-js";
import { bugununTarihiTR } from "@/lib/tarih";
import { kademeBul } from "@/lib/kademe";
import { denemeToplamNeti, TREND_PENCERESI, AKTIFLIK_PENCERESI, type AnalizOgrencisi } from "@/lib/sinif-analizi";

// Sınıf Analizi veri katmanı — rehber-kapsam-listesi.ts ile AYNI desen:
// öğrenci başına sorgu YOK, birkaç toplu in() sorgusu + JS'de eşleştirme.
//
// Trend ve aktiflik `tarih` (çalışma günü) üzerinden ölçülüyor, created_at
// değil. Gerekçe: "son hareket" tanımı projede zaten `tarih` ile kurulu
// (bkz. rehber-kapsam-listesi.ts) ve öğrencinin geçmiş bir güne toplu kayıt
// girmesi "o gün çalıştı" demektir. Canlı veride iki ölçüt AYNI sonucu
// veriyor (09.10.2026: 6 gerileyen, 3 bırakan, her iki ölçütte de), bu
// yüzden anlamca doğru olan seçildi.

// Projedeki diğer veri modülleriyle aynı imza (bkz. rehber-kapsam-listesi.ts):
// createAdminClient() jenerik parametreleri `any` ile dönüyor.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export interface DenemeSecenegi {
  anahtar: string; // "yayinevi|tarih|tur"
  yayinevi: string;
  tarih: string;
  tur: string;
  katilan: number;
}

export interface KayipNesilKaydi {
  adSoyad: string;
  okulNo: string | null;
  sinifAdi: string;
  hesabiVarMi: boolean;
}

/**
 * Öğrencinin TÜM denemelerindeki toplam netleri (anahtar → net). Tek net
 * yerine harita dönüyor çünkü deneme seçimi, sınıf filtresi ve sayfalama
 * istemcide yapılıyor: altı görünüm arasında gezinmek için sunucuya
 * dönülmesi gerekmiyor (kurum geneli en fazla ~200 öğrenci).
 */
export interface AnalizOgrencisiHam extends Omit<AnalizOgrencisi, "secilenDenemeNeti"> {
  denemeNetleri: Record<string, number>;
}

export interface SinifAnaliziVerisi {
  ogrenciler: AnalizOgrencisiHam[];
  denemeSecenekleri: DenemeSecenegi[];
  kayipNesil: KayipNesilKaydi[];
}

// Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür (proje notu).
const tekil = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

function gunOnce(gunSayisi: number): string {
  const d = new Date(`${bugununTarihiTR()}T00:00:00`);
  d.setDate(d.getDate() - gunSayisi);
  return d.toISOString().slice(0, 10);
}

export async function sinifAnaliziGetir(
  admin: Istemci,
  params: {
    schoolId: string;
    /** null = kurumun tamamı. Boş dizi = hiçbir şey (yetkisiz kapsam). */
    sinifIdleri: string[] | null;
  },
): Promise<SinifAnaliziVerisi> {
  const bos: SinifAnaliziVerisi = { ogrenciler: [], denemeSecenekleri: [], kayipNesil: [] };
  if (params.sinifIdleri !== null && params.sinifIdleri.length === 0) return bos;

  let ogrenciSorgusu = admin
    .from("students")
    .select("id, okul_no, class_id, profiles!students_id_fkey(ad), classes(id, seviye, sube)")
    .eq("school_id", params.schoolId);
  if (params.sinifIdleri !== null) ogrenciSorgusu = ogrenciSorgusu.in("class_id", params.sinifIdleri);
  const { data: ogrencilerHam } = await ogrenciSorgusu;

  type OgrenciRow = {
    id: string; okul_no: string | null; class_id: string | null;
    profiles: { ad: string } | { ad: string }[] | null;
    classes: { id: string; seviye: string; sube: string } | { id: string; seviye: string; sube: string }[] | null;
  };

  const temel = ((ogrencilerHam ?? []) as unknown as OgrenciRow[]).map((o) => {
    const sinif = tekil(o.classes);
    return {
      ogrenciId: o.id,
      ad: tekil(o.profiles)?.ad ?? "İsimsiz",
      okulNo: o.okul_no,
      sinifId: sinif?.id ?? o.class_id ?? null,
      sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "—",
      // Ortaokul kapsama alındı: yanlış katsayısı farklı, kademe ŞART.
      kademe: (kademeBul(sinif?.seviye) === "ortaokul" ? "ortaokul" : "lise") as AnalizOgrencisi["kademe"],
    };
  });
  if (temel.length === 0) return bos;

  const idler = temel.map((o) => o.ogrenciId);
  const aktiflikBasi = gunOnce(AKTIFLIK_PENCERESI);
  const sonDonemBasi = gunOnce(TREND_PENCERESI);
  const oncekiDonemBasi = gunOnce(TREND_PENCERESI * 2);

  const [soru, konu, denemeler, gorevler, girisler, resmiListe] = await Promise.all([
    admin.from("soru_cozumleri").select("student_id, tarih").in("student_id", idler).gte("tarih", oncekiDonemBasi),
    admin.from("konu_calismalar").select("student_id, tarih").in("student_id", idler).gte("tarih", oncekiDonemBasi),
    admin.from("denemeler").select("student_id, tarih, tur, yayinevi, deneme_ders_sonuclari(dogru, yanlis)").in("student_id", idler),
    admin.from("gorev_atamalari").select("student_id, durum").in("student_id", idler),
    admin.from("kullanici_aktif_gunler").select("user_id").in("user_id", idler),
    admin.from("okul_ogrenci_listesi").select("ad_soyad, okul_no, student_id, classes(seviye, sube)").eq("school_id", params.schoolId),
  ]);

  // "Hiç verisi var mı" sorusu PENCEREDEN BAĞIMSIZ: yukarıdaki sorgular
  // tarihe göre süzüldüğü için ayrıca sorulur, yoksa 30 günden eski verisi
  // olan öğrenci yanlışlıkla "hiç veri girmemiş" sayılır.
  const [soruVarMi, konuVarMi] = await Promise.all([
    admin.from("soru_cozumleri").select("student_id").in("student_id", idler),
    admin.from("konu_calismalar").select("student_id").in("student_id", idler),
  ]);

  type HareketRow = { student_id: string; tarih: string | null };
  const aktiflik = new Map<string, number>();
  const sonDonem = new Map<string, number>();
  const oncekiDonem = new Map<string, number>();
  const artir = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const tablo of [soru, konu]) {
    for (const r of ((tablo.data ?? []) as HareketRow[])) {
      if (!r.tarih) continue;
      if (r.tarih >= aktiflikBasi) artir(aktiflik, r.student_id);
      if (r.tarih >= sonDonemBasi) artir(sonDonem, r.student_id);
      else if (r.tarih >= oncekiDonemBasi) artir(oncekiDonem, r.student_id);
    }
  }

  const verisiOlanlar = new Set<string>();
  for (const tablo of [soruVarMi, konuVarMi]) {
    for (const r of ((tablo.data ?? []) as { student_id: string }[])) verisiOlanlar.add(r.student_id);
  }

  // Denemeler: hem seçenek listesi hem seçili denemenin netleri.
  type DenemeRow = {
    student_id: string; tarih: string; tur: string; yayinevi: string | null;
    deneme_ders_sonuclari: { dogru: number; yanlis: number }[] | null;
  };
  const denemeSatirlari = (denemeler.data ?? []) as unknown as DenemeRow[];
  const kademeMap = new Map(temel.map((o) => [o.ogrenciId, o.kademe]));

  const secenekSayaci = new Map<string, DenemeSecenegi>();
  for (const d of denemeSatirlari) {
    const yayinevi = d.yayinevi ?? "—";
    const anahtar = `${yayinevi}|${d.tarih}|${d.tur}`;
    const mevcut = secenekSayaci.get(anahtar);
    if (mevcut) mevcut.katilan += 1;
    else secenekSayaci.set(anahtar, { anahtar, yayinevi, tarih: d.tarih, tur: d.tur, katilan: 1 });
  }
  const denemeSecenekleri = [...secenekSayaci.values()]
    // En yeni önce; aynı günde birden çok deneme varsa katılımı yüksek olan.
    .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.katilan - a.katilan);

  // Her öğrenci için TÜM denemelerin netleri — seçim istemcide yapılıyor.
  const netler = new Map<string, Record<string, number>>();
  for (const d of denemeSatirlari) {
    const anahtar = `${d.yayinevi ?? "—"}|${d.tarih}|${d.tur}`;
    const kademe = kademeMap.get(d.student_id) ?? "lise";
    const mevcut = netler.get(d.student_id) ?? {};
    mevcut[anahtar] = denemeToplamNeti(d.deneme_ders_sonuclari ?? [], kademe);
    netler.set(d.student_id, mevcut);
  }

  const gorevToplam = new Map<string, number>();
  const gorevTamam = new Map<string, number>();
  const gorevBekle = new Map<string, number>();
  const gorevOlmadi = new Map<string, number>();
  for (const g of ((gorevler.data ?? []) as { student_id: string; durum: string }[])) {
    artir(gorevToplam, g.student_id);
    if (g.durum === "tamamlandi") artir(gorevTamam, g.student_id);
    else if (g.durum === "bekliyor") artir(gorevBekle, g.student_id);
    else artir(gorevOlmadi, g.student_id);
  }

  const girisYapanlar = new Set(((girisler.data ?? []) as { user_id: string }[]).map((g) => g.user_id));
  const denemesiOlanlar = new Set(denemeSatirlari.map((d) => d.student_id));

  type ListeRow = {
    ad_soyad: string; okul_no: string | number | null; student_id: string | null;
    classes: { seviye: string; sube: string } | { seviye: string; sube: string }[] | null;
  };
  const gorunenSiniflar = params.sinifIdleri === null ? null : new Set(temel.map((o) => o.sinifAdi));
  const kayipNesil: KayipNesilKaydi[] = ((resmiListe.data ?? []) as unknown as ListeRow[])
    .map((l) => {
      const s = tekil(l.classes);
      return {
        adSoyad: l.ad_soyad,
        okulNo: l.okul_no === null ? null : String(l.okul_no),
        sinifAdi: s ? `${s.seviye}-${s.sube}` : "—",
        hesabiVarMi: l.student_id !== null,
      };
    })
    // Kapsam dışı sınıflar sızmasın: sınıf öğretmeni yalnız kendi sınıfını görür.
    .filter((k) => gorunenSiniflar === null || gorunenSiniflar.has(k.sinifAdi));

  const ogrenciler: AnalizOgrencisiHam[] = temel.map((o) => ({
    ...o,
    denemeNetleri: netler.get(o.ogrenciId) ?? {},
    denemeSayisi: Object.keys(netler.get(o.ogrenciId) ?? {}).length,
    aktiflik: aktiflik.get(o.ogrenciId) ?? 0,
    gorevToplam: gorevToplam.get(o.ogrenciId) ?? 0,
    gorevTamamlanan: gorevTamam.get(o.ogrenciId) ?? 0,
    gorevBekleyen: gorevBekle.get(o.ogrenciId) ?? 0,
    gorevTamamlanmayan: gorevOlmadi.get(o.ogrenciId) ?? 0,
    sonDonem: sonDonem.get(o.ogrenciId) ?? 0,
    oncekiDonem: oncekiDonem.get(o.ogrenciId) ?? 0,
    girisYapmisMi: girisYapanlar.has(o.ogrenciId),
    verisiVarMi: verisiOlanlar.has(o.ogrenciId) || denemesiOlanlar.has(o.ogrenciId),
  }));

  return { ogrenciler, denemeSecenekleri, kayipNesil };
}
