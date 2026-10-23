import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { netHesapla, type NetKademesi } from "@/lib/types";
import { bugununTarihiTR } from "@/lib/tarih";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { rehberlikUyeligiGetir } from "@/lib/rehberlik-servisi";
import { takipOlaylariniBul, type TakipDenemesi, type TakipDurumu, type TakipTuru } from "@/lib/rehber-takip";

// Rehber Takip Bildirimleri'nin veritabanı tarafı (migration 0171).
// Kapsam: okul rehberi atandığı sınıf düzeyleri (Rehberlik Servisi,
// 0144); dershane rehberi ve grup koçu kurumun bütün öğrencileri. Tablo
// RLS'li ve politikasız: her okuma/yazma yetki doğrulandıktan sonra
// servis anahtarıyla yapılır.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export interface TakipKapsami {
  schoolId: string;
  // null = kurumun bütün öğrencileri; [] = düzey atanmamış, hiçbir öğrenci.
  seviyeler: string[] | null;
  kademe: NetKademesi;
  // Öğrenci bağlantısı: okul rehberi öğrenci analizine, dershane rehberi ve
  // grup koçu Öğrenci Takibi'ne gider.
  ogrenciBaglantisi: "analiz" | "takip";
}

export interface TakipBildirimi {
  id: string;
  studentId: string;
  ogrenciAd: string;
  sinifId: string | null;
  sinifAdi: string;
  tur: TakipTuru;
  baslik: string;
  ayrinti: Record<string, unknown>;
  olayTarihi: string;
  durum: TakipDurumu;
  notMetni: string | null;
  kapatanAdi: string | null;
  kapatilmaAt: string | null;
}

const PARCA = 150;
function parcalara<T>(liste: T[]): T[][] {
  const sonuc: T[][] = [];
  for (let i = 0; i < liste.length; i += PARCA) sonuc.push(liste.slice(i, i + PARCA));
  return sonuc;
}
const tekil = <T,>(v: T | T[] | null | undefined): T | null => (v == null ? null : Array.isArray(v) ? v[0] ?? null : v);

// Oturumdaki kullanıcının takip kapsamı; rehberlik rolü değilse null.
export async function takipKapsamiGetir(admin: Istemci, userId: string): Promise<TakipKapsami | null> {
  const [{ data: profil }, { data: ogretmen }, uyelik] = await Promise.all([
    admin.from("profiles").select("role").eq("id", userId).maybeSingle(),
    admin.from("teachers").select("school_id, brans").eq("id", userId).maybeSingle(),
    rehberlikUyeligiGetir(admin, userId),
  ]);
  if (profil?.role !== "ogretmen" || !ogretmen?.school_id) return null;
  const { data: okul } = await admin.from("schools").select("tur, kademe, grup_kapasitesi").eq("id", ogretmen.school_id).maybeSingle();
  const kademe: NetKademesi = okul?.kademe === "ortaokul" ? "ortaokul" : "lise";
  if (uyelik && uyelik.schoolId === ogretmen.school_id) {
    return { schoolId: ogretmen.school_id, seviyeler: uyelik.sinifDuzeyleri, kademe, ogrenciBaglantisi: "analiz" };
  }
  const grupMu = okul?.grup_kapasitesi !== null && okul?.grup_kapasitesi !== undefined;
  if (ogretmen.brans === REHBER_BRANSI && (okul?.tur === "dershane" || grupMu)) {
    return { schoolId: ogretmen.school_id, seviyeler: null, kademe, ogrenciBaglantisi: "takip" };
  }
  return null;
}

export async function oturumTakipKapsami(): Promise<{ admin: Istemci; userId: string; kapsam: TakipKapsami } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const kapsam = await takipKapsamiGetir(admin, user.id);
  return kapsam ? { admin, userId: user.id, kapsam } : null;
}

type OgrenciRow = { id: string; profiles: { ad: string } | { ad: string }[] | null; classes: { id: string; seviye: string; sube: string } | { id: string; seviye: string; sube: string }[] | null };

async function kapsamOgrencileri(admin: Istemci, k: TakipKapsami) {
  if (k.seviyeler && k.seviyeler.length === 0) return [];
  let sorgu = admin.from("students")
    .select(`id, profiles!students_id_fkey(ad), classes${k.seviyeler ? "!inner" : ""}(id, seviye, sube)`)
    .eq("school_id", k.schoolId);
  if (k.seviyeler) sorgu = sorgu.in("classes.seviye", k.seviyeler);
  const { data } = await sorgu;
  return ((data ?? []) as unknown as OgrenciRow[]).map((o) => {
    const s = tekil(o.classes);
    return { id: o.id, ad: tekil(o.profiles)?.ad ?? "İsimsiz", sinifId: s?.id ?? null, seviye: s?.seviye ?? null, sinifAdi: s ? `${s.seviye}-${s.sube}` : "—" };
  });
}

// Kapsamdaki öğrencilerin olaylarını hesaplar, yenilerini kaydeder.
// Var olan kayıt (aynı öğrenci + anahtar) değişmez; kapatılmış olay geri açılmaz.
export async function takipBildirimleriniUret(admin: Istemci, k: TakipKapsami): Promise<number> {
  const ogrenciler = await kapsamOgrencileri(admin, k);
  if (ogrenciler.length === 0) return 0;
  const bugun = bugununTarihiTR();

  const sonHareket = new Map<string, string>();
  const denemeler = new Map<string, TakipDenemesi[]>();
  const gorev = new Map<string, { acik: number; toplam: number }>();
  const hareket = (id: string, t: string | null) => { if (t && (!sonHareket.get(id) || t > sonHareket.get(id)!)) sonHareket.set(id, t); };

  for (const idler of parcalara(ogrenciler.map((o) => o.id))) {
    const [konu, soru, ortaokul, den, gor] = await Promise.all([
      admin.from("konu_calismalar").select("student_id, tarih").in("student_id", idler),
      admin.from("soru_cozumleri").select("student_id, tarih").in("student_id", idler),
      admin.from("ortaokul_calismalar").select("student_id, tarih").in("student_id", idler),
      admin.from("denemeler").select("id, student_id, tarih, tur, deneme_ders_sonuclari(ders, dogru, yanlis)").in("student_id", idler),
      admin.from("gorev_atamalari").select("student_id, durum").in("student_id", idler),
    ]);
    for (const r of [...(konu.data ?? []), ...(soru.data ?? []), ...(ortaokul.data ?? [])] as { student_id: string; tarih: string | null }[]) hareket(r.student_id, r.tarih);
    type DenemeRow = { id: string; student_id: string; tarih: string; tur: string; deneme_ders_sonuclari: { ders: string; dogru: number; yanlis: number }[] | null };
    for (const d of (den.data ?? []) as unknown as DenemeRow[]) {
      hareket(d.student_id, d.tarih);
      const liste = denemeler.get(d.student_id) ?? [];
      liste.push({ id: d.id, tarih: d.tarih, tur: String(d.tur), dersler: (d.deneme_ders_sonuclari ?? []).map((s) => ({ ders: s.ders, net: netHesapla(s.dogru, s.yanlis, k.kademe) })) });
      denemeler.set(d.student_id, liste);
    }
    for (const g of (gor.data ?? []) as { student_id: string; durum: string }[]) {
      const m = gorev.get(g.student_id) ?? { acik: 0, toplam: 0 };
      m.toplam += 1;
      if (g.durum === "bekliyor") m.acik += 1;
      gorev.set(g.student_id, m);
    }
  }

  const satirlar = ogrenciler.flatMap((o) => takipOlaylariniBul({
    bugun, denemeler: denemeler.get(o.id) ?? [], sonHareket: sonHareket.get(o.id) ?? null,
    acikGorev: gorev.get(o.id)?.acik ?? 0, gorevToplam: gorev.get(o.id)?.toplam ?? 0,
  }).map((olay) => ({
    school_id: k.schoolId, student_id: o.id, sinif_seviyesi: o.seviye, tur: olay.tur, anahtar: olay.anahtar,
    baslik: olay.baslik, ayrinti: olay.ayrinti, olay_tarihi: olay.olayTarihi,
  })));
  let eklenen = 0;
  for (const parca of parcalara(satirlar)) {
    const { data } = await admin.from("rehber_takip_bildirimleri")
      .upsert(parca, { onConflict: "student_id,anahtar", ignoreDuplicates: true }).select("id");
    eklenen += data?.length ?? 0;
  }
  return eklenen;
}

export async function yeniTakipSayisi(admin: Istemci, k: TakipKapsami): Promise<number> {
  if (k.seviyeler && k.seviyeler.length === 0) return 0;
  let sorgu = admin.from("rehber_takip_bildirimleri").select("id", { count: "exact", head: true })
    .eq("school_id", k.schoolId).eq("durum", "yeni");
  if (k.seviyeler) sorgu = sorgu.in("sinif_seviyesi", k.seviyeler);
  const { count } = await sorgu;
  return count ?? 0;
}

export async function takipBildirimleriniGetir(admin: Istemci, k: TakipKapsami): Promise<{ bildirimler: TakipBildirimi[]; hazir: boolean }> {
  if (k.seviyeler && k.seviyeler.length === 0) return { bildirimler: [], hazir: true };
  let sorgu = admin.from("rehber_takip_bildirimleri")
    .select("id, student_id, tur, baslik, ayrinti, olay_tarihi, durum, not_metni, kapatilma_at, kapatan:profiles!rehber_takip_bildirimleri_kapatan_id_fkey(ad), students!inner(classes(id, seviye, sube), profiles!students_id_fkey(ad))")
    .eq("school_id", k.schoolId);
  if (k.seviyeler) sorgu = sorgu.in("sinif_seviyesi", k.seviyeler);
  const { data, error } = await sorgu.order("olay_tarihi", { ascending: false }).order("created_at", { ascending: false }).limit(600);
  // Tablo yoksa (migration 0171 uygulanmamış) ekran uyarı gösterir.
  if (error) return { bildirimler: [], hazir: false };
  type Row = {
    id: string; student_id: string; tur: TakipTuru; baslik: string; ayrinti: Record<string, unknown> | null; olay_tarihi: string; durum: TakipDurumu;
    not_metni: string | null; kapatilma_at: string | null; kapatan: { ad: string } | { ad: string }[] | null;
    students: { classes: OgrenciRow["classes"]; profiles: OgrenciRow["profiles"] } | { classes: OgrenciRow["classes"]; profiles: OgrenciRow["profiles"] }[] | null;
  };
  return {
    hazir: true,
    bildirimler: ((data ?? []) as unknown as Row[]).map((r) => {
      const ogrenci = tekil(r.students);
      const sinif = tekil(ogrenci?.classes);
      return {
        id: r.id, studentId: r.student_id, ogrenciAd: tekil(ogrenci?.profiles)?.ad ?? "İsimsiz",
        sinifId: sinif?.id ?? null, sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "—",
        tur: r.tur, baslik: r.baslik, ayrinti: r.ayrinti ?? {}, olayTarihi: r.olay_tarihi, durum: r.durum,
        notMetni: r.not_metni, kapatanAdi: tekil(r.kapatan)?.ad ?? null, kapatilmaAt: r.kapatilma_at,
      };
    }),
  };
}
