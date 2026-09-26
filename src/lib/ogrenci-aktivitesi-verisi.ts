import type { SupabaseClient } from "@supabase/supabase-js";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import { netHesapla } from "@/lib/types";
import {
  aktifGunSiralamasi, hareketleriOlustur, veriGirisSiralamasi,
  type AktifGunSatiri, type HamDeneme, type HamKonu, type HamSoru, type Hareket, type OgrenciOzeti, type VeriSiralamaSatiri, type VeriTuru,
} from "@/lib/ogrenci-aktivitesi";

// Admin "Öğrenci Aktivitesi" verisi (kullanıcı isteği 26.09.2026). Service-role
// client ile çağrılır (yalnızca admin sayfasından). Kurum seçiliyse tüm
// sorgular students!inner(school_id) ile o kuruma daraltılır.
export const AKTIVITE_DONEMLERI = [7, 30, 90] as const;
export type AktiviteDonemi = (typeof AKTIVITE_DONEMLERI)[number];
export const VARSAYILAN_AKTIVITE_DONEMI: AktiviteDonemi = 30;

const HAREKET_SAYISI = 200;
// Toplu okul yüklemeleri tek harekete indiği için denemelerden daha çok satır çekilir.
const DENEME_SATIR_SAYISI = 800;

export interface OgrenciAktivitesiVerisi {
  error: string | null;
  kurumlar: { id: string; ad: string }[];
  veriSiralamasi: VeriSiralamaSatiri[];
  // null: migration 0124 henüz uygulanmamış.
  aktifGunSiralamasi: AktifGunSatiri[] | null;
  sonGorulenler: { ogrenci: OgrenciOzeti; sonGorulme: string }[];
  sonKayitlar: OgrenciOzeti[];
  hareketler: Hareket[];
}

async function sayfaSayfa<T>(sorgu: (bas: number, son: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<{ error: string | null; satirlar: T[] }> {
  const satirlar: T[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await sorgu(bas, bas + 999);
    if (error) return { error: error.message, satirlar };
    const parca = (data as T[]) ?? [];
    satirlar.push(...parca);
    if (parca.length < 1000) return { error: null, satirlar };
  }
}

type OgrenciRow = {
  id: string; created_at: string; school_id: string | null;
  profiles: { ad: string; son_gorulme: string | null } | null;
  classes: { seviye: string; sube: string } | null;
  schools: { ad: string } | null;
};

export async function ogrenciAktivitesiGetir(
  admin: SupabaseClient, secenek: { kurumId: string | null; gun: AktiviteDonemi },
): Promise<OgrenciAktivitesiVerisi> {
  const bos: OgrenciAktivitesiVerisi = { error: null, kurumlar: [], veriSiralamasi: [], aktifGunSiralamasi: null, sonGorulenler: [], sonKayitlar: [], hareketler: [] };
  const { kurumId, gun } = secenek;
  const baslangicZamani = new Date(Date.now() - gun * 86_400_000).toISOString();
  const baslangicGunu = tarihEkle(bugununTarihiTR(), -(gun - 1));

  const [{ data: kurumlarHam }, ogrenciSonucu] = await Promise.all([
    admin.from("schools").select("id, ad").order("ad"),
    sayfaSayfa<OgrenciRow>((bas, son) => {
      let q = admin.from("students")
        .select("id, created_at, school_id, profiles!students_id_fkey(ad, son_gorulme), classes(seviye, sube), schools(ad)")
        .order("id").range(bas, son);
      if (kurumId) q = q.eq("school_id", kurumId);
      return q;
    }),
  ]);
  if (ogrenciSonucu.error) return { ...bos, error: ogrenciSonucu.error };

  const ogrenciler = new Map<string, OgrenciOzeti>();
  const sonGorulmeler = new Map<string, string>();
  for (const o of ogrenciSonucu.satirlar) {
    ogrenciler.set(o.id, {
      id: o.id, ad: o.profiles?.ad ?? "İsimsiz",
      sinif: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
      kurum: o.schools?.ad ?? null, kurumId: o.school_id, kayitZamani: o.created_at,
    });
    if (o.profiles?.son_gorulme) sonGorulmeler.set(o.id, o.profiles.son_gorulme);
  }

  // Öğrenci tablosuna bağlı kayıt sorgusu; kurum seçiliyse ilişkili öğrenci
  // kaydı üzerinden (students!inner) o kuruma daraltılır.
  const kayitSorgusu = (tablo: "konu_calismalar" | "soru_cozumleri" | "denemeler", secim: string) => {
    const q = admin.from(tablo).select(kurumId ? `${secim}, students!inner(school_id)` : secim);
    return kurumId ? q.eq("students.school_id", kurumId) : q;
  };

  const [konuSayim, soruSayim, denemeSayim, aktifGunler, konular, sorular, denemeler] = await Promise.all([
    sayfaSayfa<{ student_id: string }>((bas, son) => kayitSorgusu("konu_calismalar", "student_id").gte("created_at", baslangicZamani).order("id").range(bas, son)),
    sayfaSayfa<{ student_id: string }>((bas, son) => kayitSorgusu("soru_cozumleri", "student_id").gte("created_at", baslangicZamani).order("id").range(bas, son)),
    sayfaSayfa<{ student_id: string }>((bas, son) => kayitSorgusu("denemeler", "student_id").eq("kaynak", "ogrenci").gte("created_at", baslangicZamani).order("id").range(bas, son)),
    sayfaSayfa<{ user_id: string; gun: string }>((bas, son) => admin.from("kullanici_aktif_gunler").select("user_id, gun").gte("gun", baslangicGunu).order("user_id").order("gun").range(bas, son)),
    kayitSorgusu("konu_calismalar", "id, student_id, ders, konu, sure_dakika, created_at").order("created_at", { ascending: false }).limit(HAREKET_SAYISI),
    kayitSorgusu("soru_cozumleri", "id, student_id, ders, dogru, yanlis, bos, created_at").order("created_at", { ascending: false }).limit(HAREKET_SAYISI),
    kayitSorgusu("denemeler", "id, student_id, tur, yayinevi, kaynak, tarih, created_at, deneme_ders_sonuclari(dogru, yanlis)").order("created_at", { ascending: false }).limit(DENEME_SATIR_SAYISI),
  ]);
  const hata = konuSayim.error ?? soruSayim.error ?? denemeSayim.error ?? konular.error?.message ?? sorular.error?.message ?? denemeler.error?.message ?? null;
  if (hata) return { ...bos, error: hata };

  const veriKayitlari: { studentId: string; tur: VeriTuru }[] = [
    ...konuSayim.satirlar.map((r) => ({ studentId: r.student_id, tur: "konu" as const })),
    ...soruSayim.satirlar.map((r) => ({ studentId: r.student_id, tur: "soru" as const })),
    ...denemeSayim.satirlar.map((r) => ({ studentId: r.student_id, tur: "deneme" as const })),
  ];

  type DenemeRow = Omit<HamDeneme, "net"> & { deneme_ders_sonuclari: { dogru: number; yanlis: number }[] | null };
  const hamDenemeler: HamDeneme[] = ((denemeler.data ?? []) as unknown as DenemeRow[]).map((d) => ({
    id: d.id, student_id: d.student_id, tur: d.tur, yayinevi: d.yayinevi, kaynak: d.kaynak, tarih: d.tarih, created_at: d.created_at,
    net: d.deneme_ders_sonuclari?.length
      ? Math.round(d.deneme_ders_sonuclari.reduce((t, s) => t + netHesapla(s.dogru, s.yanlis), 0) * 100) / 100
      : null,
  }));
  const kayitSirali = [...ogrenciler.values()].sort((a, b) => b.kayitZamani.localeCompare(a.kayitZamani));

  return {
    error: null,
    kurumlar: (kurumlarHam as { id: string; ad: string }[]) ?? [],
    veriSiralamasi: veriGirisSiralamasi(veriKayitlari, ogrenciler),
    aktifGunSiralamasi: aktifGunler.error ? null : aktifGunSiralamasi(aktifGunler.satirlar, ogrenciler),
    sonGorulenler: [...sonGorulmeler.entries()]
      .sort((a, b) => b[1].localeCompare(a[1])).slice(0, 5)
      .map(([id, sonGorulme]) => ({ ogrenci: ogrenciler.get(id)!, sonGorulme })),
    sonKayitlar: kayitSirali.slice(0, 5),
    hareketler: hareketleriOlustur({
      konular: (konular.data ?? []) as unknown as HamKonu[],
      sorular: (sorular.data ?? []) as unknown as HamSoru[],
      denemeler: hamDenemeler,
      kayitlar: kayitSirali.slice(0, HAREKET_SAYISI),
    }, ogrenciler, HAREKET_SAYISI),
  };
}
