import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { netHesapla, type NetKademesi } from "@/lib/types";
import { bugununTarihiTR } from "@/lib/tarih";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { rehberlikUyeligiGetir } from "@/lib/rehberlik-servisi";
import { ogrenciAktiviteOzetleriGetir } from "@/lib/ogrenci-aktivite";
import { kademeBul } from "@/lib/kademe";
import { ortaokulSonHareketleriGetir, sonHareketiBirlestir } from "@/lib/ortaokul-aktivite-ekle";
import { sonTaramaZamani, takipOlaylariniBul, taramaKapsamAnahtari, type TakipDenemesi, type TakipDurumu, type TakipTuru } from "@/lib/rehber-takip";
import { SINIF_TAKIP_TURLERI, kisiDurumunuUygula, sinifTakipKapsamiVarMi, sinifTaramaAnahtari, type KisiDurumu } from "@/lib/sinif-takip";

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
  // SINIF ÖĞRETMENİ kapsamı (migration 0176): yalnız bu sınıfın öğrencileri,
  // yalnız SINIF_TAKIP_TURLERI; durum/not kişiye özel (takip_ogretmen_durumlari).
  // Doluysa seviyeler = [sınıfın düzeyi].
  sinifId?: string;
  ogretmenId?: string;
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
  // Yalnız REHBER görünümünde: sınıf öğretmeninin "ele alındı" işareti ve
  // değerlendirmesi (kullanıcı kararı 24.10.2026). Rehberin durumunu
  // değiştirmez; kayıt rehber kapatana kadar listede kalır.
  sinifOgretmeniDegerlendirmeleri?: SinifOgretmeniDegerlendirmesi[];
}

export interface SinifOgretmeniDegerlendirmesi { ogretmenAdi: string; notMetni: string | null; tarih: string }

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
    admin.from("teachers").select("school_id, brans, class_id").eq("id", userId).maybeSingle(),
    rehberlikUyeligiGetir(admin, userId),
  ]);
  if (profil?.role !== "ogretmen" || !ogretmen?.school_id) return null;
  const [{ data: okul }, { data: sinifSatiri }] = await Promise.all([
    admin.from("schools").select("tur, kademe, grup_kapasitesi").eq("id", ogretmen.school_id).maybeSingle(),
    ogretmen.class_id ? admin.from("classes").select("seviye").eq("id", ogretmen.class_id).eq("school_id", ogretmen.school_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const kademe: NetKademesi = okul?.kademe === "ortaokul" ? "ortaokul" : "lise";
  if (uyelik && uyelik.schoolId === ogretmen.school_id) {
    return { schoolId: ogretmen.school_id, seviyeler: uyelik.sinifDuzeyleri, kademe, ogrenciBaglantisi: "analiz" };
  }
  const grupMu = okul?.grup_kapasitesi !== null && okul?.grup_kapasitesi !== undefined;
  if (ogretmen.brans === REHBER_BRANSI && (okul?.tur === "dershane" || grupMu)) {
    return { schoolId: ogretmen.school_id, seviyeler: null, kademe, ogrenciBaglantisi: "takip" };
  }
  // Sınıf öğretmeni: rehber/koç değilse kendi sınıfı için (ilkokul ve grup hariç).
  const sinifSeviyesi = (sinifSatiri as { seviye: string } | null)?.seviye ?? null;
  if (sinifTakipKapsamiVarMi({ sinifId: ogretmen.class_id ?? null, sinifSeviyesi, grupMu })) {
    return { schoolId: ogretmen.school_id, seviyeler: [sinifSeviyesi!], kademe, ogrenciBaglantisi: "analiz", sinifId: ogretmen.class_id!, ogretmenId: userId };
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
  if (k.sinifId) sorgu = sorgu.eq("class_id", k.sinifId);
  const { data } = await sorgu;
  return ((data ?? []) as unknown as OgrenciRow[]).map((o) => {
    const s = tekil(o.classes);
    return { id: o.id, ad: tekil(o.profiles)?.ad ?? "İsimsiz", sinifId: s?.id ?? null, seviye: s?.seviye ?? null, sinifAdi: s ? `${s.seviye}-${s.sube}` : "—" };
  });
}

// Son başarılı tarama zamanı (migration 0172). Kurumun kayıtlarından,
// bu kapsamı tamamen içerenlerin en yenisi. Tablo yoksa ya da okunamazsa
// null döner: sayfa eski davranışa (açılışta tarama) düşer.
export async function takipSonTaramaGetir(admin: Istemci, k: TakipKapsami): Promise<string | null> {
  const { data, error } = await admin.from("rehber_takip_taramalari")
    .select("kapsam, son_tarama_at").eq("school_id", k.schoolId);
  if (error || !data) return null;
  const kayitlar = data as { kapsam: string; son_tarama_at: string }[];
  const genel = sonTaramaZamani(kayitlar, k.seviyeler);
  if (!k.sinifId) return genel;
  // Sınıf öğretmeni: düzeyini kapsayan rehber taraması ya da sınıfın kendi taraması.
  const kendi = kayitlar.find((x) => x.kapsam === sinifTaramaAnahtari(k.sinifId!))?.son_tarama_at ?? null;
  if (!genel) return kendi;
  if (!kendi) return genel;
  return Date.parse(kendi) > Date.parse(genel) ? kendi : genel;
}

async function taramaKaydet(admin: Istemci, k: TakipKapsami, eklenen: number) {
  // Kayıt hatası taramayı bozmasın (0172 uygulanmamış olabilir).
  if (k.seviyeler && k.seviyeler.length === 0) return;
  await admin.from("rehber_takip_taramalari").upsert(
    { school_id: k.schoolId, kapsam: k.sinifId ? sinifTaramaAnahtari(k.sinifId) : taramaKapsamAnahtari(k.seviyeler), son_tarama_at: new Date().toISOString(), eklenen },
    { onConflict: "school_id,kapsam" },
  ).then(() => undefined, () => undefined);
}

// Kapsamdaki öğrencilerin olaylarını hesaplar, yenilerini kaydeder.
// Var olan kayıt (aynı öğrenci + anahtar) değişmez; kapatılmış olay geri açılmaz.
// Başarıyla biterse tarama zamanı kaydedilir (cron, "Şimdi tara" ve sayfa).
export async function takipBildirimleriniUret(admin: Istemci, k: TakipKapsami): Promise<number> {
  const eklenen = await olaylariHesaplaKaydet(admin, k);
  await taramaKaydet(admin, k, eklenen);
  return eklenen;
}

async function olaylariHesaplaKaydet(admin: Istemci, k: TakipKapsami): Promise<number> {
  const ogrenciler = await kapsamOgrencileri(admin, k);
  if (ogrenciler.length === 0) return 0;
  const bugun = bugununTarihiTR();

  // Son hareket (pencere sınırsız) ve görev açık/toplam (SON 30 GÜN, kullanıcı
  // kararı 23.10.2026) veritabanında hesaplanır (migration 0174, Faz 1 · Adım 4).
  // Eskiden konu/soru/görev satırları çekilip JS'te toplanıyordu; max_rows = 1000
  // sınırında sessizce kesiliyor ve yanlış sessizlik/görev bildirimi üretiyordu.
  // RPC hata verirse tarama başarısız sayılır (eksik veriyle bildirim üretilmez).
  const aktivite = await ogrenciAktiviteOzetleriGetir(admin, ogrenciler.map((o) => o.id), bugun);
  // RPC ortaokul_calismalar'ı saymıyor (migration 0132): ortaokul öğrencisi "sessiz" bildirimi almasın.
  const ortaokulHareketi = await ortaokulSonHareketleriGetir(admin, ogrenciler.filter((o) => kademeBul(o.seviye) === "ortaokul").map((o) => o.id));
  const denemeler = new Map<string, TakipDenemesi[]>();

  for (const idler of parcalara(ogrenciler.map((o) => o.id))) {
    const { data: den } = await admin.from("denemeler")
      .select("id, student_id, tarih, tur, deneme_ders_sonuclari(ders, dogru, yanlis)").in("student_id", idler);
    type DenemeRow = { id: string; student_id: string; tarih: string; tur: string; deneme_ders_sonuclari: { ders: string; dogru: number; yanlis: number }[] | null };
    for (const d of (den ?? []) as unknown as DenemeRow[]) {
      const liste = denemeler.get(d.student_id) ?? [];
      liste.push({ id: d.id, tarih: d.tarih, tur: String(d.tur), dersler: (d.deneme_ders_sonuclari ?? []).map((s) => ({ ders: s.ders, net: netHesapla(s.dogru, s.yanlis, k.kademe) })) });
      denemeler.set(d.student_id, liste);
    }
  }

  const satirlar = ogrenciler.flatMap((o) => takipOlaylariniBul({
    bugun, denemeler: denemeler.get(o.id) ?? [], sonHareket: sonHareketiBirlestir(aktivite.get(o.id)?.sonHareket, ortaokulHareketi.get(o.id)),
    acikGorev: aktivite.get(o.id)?.acikGorev ?? 0, gorevToplam: aktivite.get(o.id)?.gorevToplam ?? 0,
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
  if (k.sinifId) {
    const { bildirimler, hazir } = await takipBildirimleriniGetir(admin, k);
    return hazir ? bildirimler.filter((b) => b.durum === "yeni").length : 0;
  }
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
  if (k.sinifId) sorgu = sorgu.eq("students.class_id", k.sinifId).in("tur", [...SINIF_TAKIP_TURLERI]);
  const { data, error } = await sorgu.order("olay_tarihi", { ascending: false }).order("created_at", { ascending: false }).limit(600);
  // Tablo yoksa (migration 0171 uygulanmamış) ekran uyarı gösterir.
  if (error) return { bildirimler: [], hazir: false };
  type Row = {
    id: string; student_id: string; tur: TakipTuru; baslik: string; ayrinti: Record<string, unknown> | null; olay_tarihi: string; durum: TakipDurumu;
    not_metni: string | null; kapatilma_at: string | null; kapatan: { ad: string } | { ad: string }[] | null;
    students: { classes: OgrenciRow["classes"]; profiles: OgrenciRow["profiles"] } | { classes: OgrenciRow["classes"]; profiles: OgrenciRow["profiles"] }[] | null;
  };
  const hamListe = ((data ?? []) as unknown as Row[]);
  // Sınıf öğretmeni: kişiye özel durum/not (0176). Tablo yoksa ekran "hazır değil" der.
  let kisiDurumlari: Map<string, KisiDurumu> | null = null;
  if (k.sinifId && k.ogretmenId) {
    kisiDurumlari = new Map();
    const idler = hamListe.map((r) => r.id);
    for (const parca of parcalara(idler)) {
      const { data: d, error: e } = await admin.from("takip_ogretmen_durumlari").select("bildirim_id, durum, not_metni")
        .eq("teacher_id", k.ogretmenId).in("bildirim_id", parca);
      if (e) return { bildirimler: [], hazir: false };
      for (const x of (d ?? []) as { bildirim_id: string; durum: "goruldu" | "ele_alindi"; not_metni: string | null }[]) {
        kisiDurumlari.set(x.bildirim_id, { durum: x.durum, notMetni: x.not_metni });
      }
    }
  }
  const sonuc: TakipBildirimi[] = hamListe.map((r) => {
      const ogrenci = tekil(r.students);
      const sinif = tekil(ogrenci?.classes);
      return {
        id: r.id, studentId: r.student_id, ogrenciAd: tekil(ogrenci?.profiles)?.ad ?? "İsimsiz",
        sinifId: sinif?.id ?? null, sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "—",
        tur: r.tur, baslik: r.baslik, ayrinti: r.ayrinti ?? {}, olayTarihi: r.olay_tarihi, durum: r.durum,
        notMetni: r.not_metni, kapatanAdi: tekil(r.kapatan)?.ad ?? null, kapatilmaAt: r.kapatilma_at,
      };
  });
  if (kisiDurumlari) return { hazir: true, bildirimler: kisiDurumunuUygula(sonuc, kisiDurumlari) };
  return { hazir: true, bildirimler: await sinifOgretmeniDegerlendirmeleriniEkle(admin, sonuc) };
}

// Rehber görünümü: sınıf öğretmenlerinin "ele alındı" kayıtları (0176) bilgi
// olarak eklenir. Tablo yoksa ya da okunamazsa liste bilgisiz döner.
async function sinifOgretmeniDegerlendirmeleriniEkle(admin: Istemci, bildirimler: TakipBildirimi[]): Promise<TakipBildirimi[]> {
  const harita = new Map<string, SinifOgretmeniDegerlendirmesi[]>();
  for (const parca of parcalara(bildirimler.map((b) => b.id))) {
    const { data, error } = await admin.from("takip_ogretmen_durumlari")
      .select("bildirim_id, not_metni, guncellenme_at, ogretmen:profiles!takip_ogretmen_durumlari_teacher_id_fkey(ad)")
      .eq("durum", "ele_alindi").in("bildirim_id", parca);
    if (error) return bildirimler;
    type Row = { bildirim_id: string; not_metni: string | null; guncellenme_at: string; ogretmen: { ad: string } | { ad: string }[] | null };
    for (const r of (data ?? []) as unknown as Row[]) {
      const liste = harita.get(r.bildirim_id) ?? [];
      liste.push({ ogretmenAdi: tekil(r.ogretmen)?.ad ?? "Sınıf öğretmeni", notMetni: r.not_metni, tarih: r.guncellenme_at });
      harita.set(r.bildirim_id, liste);
    }
  }
  return bildirimler.map((b) => (harita.has(b.id) ? { ...b, sinifOgretmeniDegerlendirmeleri: harita.get(b.id) } : b));
}
