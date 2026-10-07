import type { SupabaseClient } from "@supabase/supabase-js";
import { netHesapla } from "@/lib/types";
import { bugununTarihiTR } from "@/lib/tarih";
import { bayraklariBelirle, type Bayrak } from "@/lib/rehber-bayrak";

// Rehber Radarı Adım 2 (kullanıcı onayı 07.10.2026) — "tek kapsam listesi".
//
// SORUN: rehber kapsamındaki öğrencileri yalnız TEK SINIF halinde görüyordu
// (dashboard "ozet" tek bir gorunecekSinifId ile çalışıyor) ve listede
// sadece ad + okul no vardı. Elbistan'da 190 öğrenci, 4 düzey, bir düzine
// şube: hangi öğrencinin durduğunu anlamanın yolu tek tek açmaktı.
//
// Bu modül sorumlu olunan TÜM düzeylerin öğrencilerini tek tabloda,
// yanlarında karar vermeye yetecek kadar ham gerçekle döndürür. YORUM YOK:
// gerekçeli bayraklar ("net düşüyor", "hiç giriş yapmamış") Adım 3'e ait.
//
// Öğrenci başına sorgu YOK — birkaç toplu in() sorgusu + JS'de eşleştirme
// (dershane-ana-sayfa.ts ile aynı desen).

// "Son hareket" kullanıcı kararı: konu çalışması + soru çözümü + deneme,
// KAYNAĞI NE OLURSA OLSUN. Yani "bu öğrenciden en son ne zaman bir iz geldi".
const HAREKET_TABLOLARI = ["konu_calismalar", "soru_cozumleri", "denemeler"] as const;

// Net yönü için son kaç deneme karşılaştırılır (3 = son deneme ile ondan
// önceki ikisinin ortalaması).
const YON_PENCERESI = 3;

export type NetYonu = "yukari" | "asagi" | "sabit";

export interface KapsamSatiri {
  ogrenciId: string;
  ad: string;
  okulNo: string | null;
  sinifId: string | null;
  sinifAdi: string;
  seviye: string;
  sonHareket: string | null; // YYYY-MM-DD; null = hiç iz yok
  sonHareketGun: number | null; // kaç gün önce; null = hiç iz yok
  denemeSayisi: number;
  sonDenemeNeti: number | null;
  yon: NetYonu | null; // null = yön için yeterli deneme yok
  // Son net ile ondan önceki denemelerin ortalaması arasındaki fark.
  // Eksi = düşüş. Adım 3 bayrağı büyüklük tabanı için bunu kullanıyor
  // (yön oku yönü söyler, bayrak EYLEM talep ettiği için büyüklük ister).
  netDegisimi: number | null;
  acikGorev: number; // durum = 'bekliyor'
  gorevToplam: number; // oran için payda — min sayı tabanı olmadan yanıltır
  // Adım 3: "hesabını hiç açmamış" bayrağı. Veri varlığından BAĞIMSIZ —
  // Elbistan'da 88 öğrenci hiç giriş yapmamış ama veri yoklar 46, yani bir
  // kısmının verisi öğretmen girişinden/deneme PDF eşleştirmesinden geliyor.
  girisYapmisMi: boolean;
  bayraklar: Bayrak[];
}

export function gunFarki(bugun: string, tarih: string): number {
  const a = new Date(`${bugun}T12:00:00Z`).getTime();
  const b = new Date(`${tarih}T12:00:00Z`).getTime();
  return Math.round((a - b) / (1000 * 3600 * 24));
}

// Son denemenin neti, ondan önceki denemelerin ortalamasıyla kıyaslanır.
// Tek denemede yön YOKTUR (null) — iki noktadan az veriyle eğilim uydurmak
// rehberi yanlış yönlendirir, Adım 1'in kapsam dürüstlüğüyle aynı ilke.
export function yonBelirle(netlerYeniden: number[]): NetYonu | null {
  const son = netlerYeniden.slice(0, YON_PENCERESI);
  if (son.length < 2) return null;
  const [guncel, ...oncekiler] = son;
  const ortalama = oncekiler.reduce((t, n) => t + n, 0) / oncekiler.length;
  const fark = guncel - ortalama;
  // ±%2 bant: küçük dalgalanma "düşüyor" diye okunmasın.
  const bant = Math.max(1, Math.abs(ortalama) * 0.02);
  if (fark > bant) return "yukari";
  if (fark < -bant) return "asagi";
  return "sabit";
}

// Son net ile ondan onceki (en fazla YON_PENCERESI-1) denemenin ortalamasi
// arasindaki fark. Tek denemede null — iki noktadan az veriyle degisim
// uydurulmaz (yonBelirle ile ayni ilke).
export function netDegisimiHesapla(netlerYeniden: number[]): number | null {
  const son = netlerYeniden.slice(0, YON_PENCERESI);
  if (son.length < 2) return null;
  const [guncel, ...oncekiler] = son;
  const ortalama = oncekiler.reduce((t, n) => t + n, 0) / oncekiler.length;
  return Math.round((guncel - ortalama) * 100) / 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export async function rehberKapsamListesiGetir(
  admin: Istemci,
  schoolId: string,
  seviyeler: string[],
): Promise<KapsamSatiri[]> {
  // Düzey atanmamış rehber hiçbir öğrenciyi görmez (0143/0144 kararı).
  if (seviyeler.length === 0) return [];

  const { data: ogrencilerHam } = await admin
    .from("students")
    .select("id, okul_no, class_id, profiles!students_id_fkey(ad), classes!inner(id, seviye, sube)")
    .eq("school_id", schoolId)
    .in("classes.seviye", seviyeler);

  type OgrenciRow = {
    id: string; okul_no: string | null; class_id: string | null;
    // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür (proje notu).
    profiles: { ad: string } | { ad: string }[] | null;
    classes: { id: string; seviye: string; sube: string } | { id: string; seviye: string; sube: string }[] | null;
  };
  const tekil = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const ogrenciler = ((ogrencilerHam ?? []) as unknown as OgrenciRow[]).map((o) => {
    const sinif = tekil(o.classes);
    return {
      ogrenciId: o.id,
      ad: tekil(o.profiles)?.ad ?? "İsimsiz",
      okulNo: o.okul_no,
      sinifId: sinif?.id ?? o.class_id ?? null,
      sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "—",
      seviye: sinif?.seviye ?? "",
    };
  });
  if (ogrenciler.length === 0) return [];

  const ogrenciIdleri = ogrenciler.map((o) => o.ogrenciId);
  const bugun = bugununTarihiTR();

  const [konu, soru, denemeler, gorevler, girisler] = await Promise.all([
    admin.from("konu_calismalar").select("student_id, tarih").in("student_id", ogrenciIdleri),
    admin.from("soru_cozumleri").select("student_id, tarih").in("student_id", ogrenciIdleri),
    admin.from("denemeler").select("student_id, tarih, deneme_ders_sonuclari(dogru, yanlis)").in("student_id", ogrenciIdleri),
    // Durum SÜZÜLMÜYOR: oran için hem açık hem toplam gerekiyor.
    admin.from("gorev_atamalari").select("student_id, durum").in("student_id", ogrenciIdleri),
    // Tek bir satır bile varsa öğrenci sisteme en az bir kez girmiş demektir.
    admin.from("kullanici_aktif_gunler").select("user_id").in("user_id", ogrenciIdleri),
  ]);

  // Son hareket: üç tablonun en büyük tarihi.
  const sonHareket = new Map<string, string>();
  const hareketEkle = (studentId: string, tarih: string | null) => {
    if (!tarih) return;
    const mevcut = sonHareket.get(studentId);
    if (!mevcut || tarih > mevcut) sonHareket.set(studentId, tarih);
  };
  for (const tablo of [konu, soru, denemeler]) {
    for (const r of ((tablo.data ?? []) as { student_id: string; tarih: string | null }[])) {
      hareketEkle(r.student_id, r.tarih);
    }
  }

  // Denemeler öğrenci başına YENİDEN ESKİYE sıralanır; net = ders netleri toplamı.
  type DenemeRow = { student_id: string; tarih: string; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] | null };
  const denemeNetleri = new Map<string, { tarih: string; net: number }[]>();
  for (const d of ((denemeler.data ?? []) as unknown as DenemeRow[])) {
    const net = (d.deneme_ders_sonuclari ?? []).reduce((t, s) => t + netHesapla(s.dogru, s.yanlis), 0);
    const liste = denemeNetleri.get(d.student_id) ?? [];
    liste.push({ tarih: d.tarih, net });
    denemeNetleri.set(d.student_id, liste);
  }
  for (const liste of denemeNetleri.values()) liste.sort((a, b) => b.tarih.localeCompare(a.tarih));

  const acikGorevSayisi = new Map<string, number>();
  const gorevToplamSayisi = new Map<string, number>();
  for (const g of ((gorevler.data ?? []) as { student_id: string; durum: string }[])) {
    gorevToplamSayisi.set(g.student_id, (gorevToplamSayisi.get(g.student_id) ?? 0) + 1);
    if (g.durum === "bekliyor") acikGorevSayisi.set(g.student_id, (acikGorevSayisi.get(g.student_id) ?? 0) + 1);
  }

  const girisYapanlar = new Set(((girisler.data ?? []) as { user_id: string }[]).map((g) => g.user_id));

  return ogrenciler.map((o) => {
    const hareket = sonHareket.get(o.ogrenciId) ?? null;
    const netler = denemeNetleri.get(o.ogrenciId) ?? [];
    const temel = {
      ...o,
      sonHareket: hareket,
      sonHareketGun: hareket ? gunFarki(bugun, hareket) : null,
      denemeSayisi: netler.length,
      sonDenemeNeti: netler.length > 0 ? Math.round(netler[0].net * 100) / 100 : null,
      yon: yonBelirle(netler.map((n) => n.net)),
      netDegisimi: netDegisimiHesapla(netler.map((n) => n.net)),
      acikGorev: acikGorevSayisi.get(o.ogrenciId) ?? 0,
      gorevToplam: gorevToplamSayisi.get(o.ogrenciId) ?? 0,
      girisYapmisMi: girisYapanlar.has(o.ogrenciId),
    };
    return { ...temel, bayraklar: bayraklariBelirle(temel) };
  }).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
}

export const HAREKET_KAYNAKLARI = HAREKET_TABLOLARI;
