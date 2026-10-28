// Yalnız sunucuda: SMS modülünün okuma tarafı. Yetki çağıranda (sms-erisim.ts)
// doğrulanır; burada service-role ile okunur. Telefon numaraları istemciye
// DÖNMEZ — yalnız "geçerli numarası var mı" bilgisi gider.
import type { SupabaseClient } from "@supabase/supabase-js";
import { smsSaglayiciBilgisi, type SmsSaglayiciKodu } from "@/lib/sms-saglayici-bilgi";
import { smsSeviyeKapsamdaMi } from "@/lib/sms-erisim";
import { telefonuNormallestir } from "@/lib/sms-telefon";
import { sinifSiraKarsilastir } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export interface SmsAyarOzeti {
  saglayici: SmsSaglayiciKodu;
  saglayiciAdi: string;
  basliklar: string[];
  seciliBaslik: string | null;
  bakiye: string | null;
  sonDogrulama: string | null;
}

export interface SmsSablonu { id: string; ad: string; icerik: string }

export interface SmsGecmisKaydi {
  id: string;
  tarih: string;
  baslik: string;
  icerik: string;
  hedef: string | null;
  aliciSayisi: number;
  gecersizSayisi: number;
  durum: "gonderildi" | "zamanlandi" | "kismen" | "hata";
  zamanlanmis: string | null;
  hata: string | null;
  gonderen: string | null;
}

export interface SmsSinifi {
  id: string;
  seviye: string;
  sube: string;
  ogrenciSayisi: number;
  /** Veli numarası geçerli olan öğrenci sayısı. */
  ulasilabilir: number;
}

export interface SmsOgrencisi {
  id: string;
  ad: string;
  okulNo: string | null;
  sinifId: string;
  /** Telefon değil: yalnız geçerli bir veli numarası olup olmadığı. */
  gecerli: boolean;
}

/** Supabase istekleri `max_rows = 1000` ile keser; sayfa sayfa toplanır. */
async function tumSatirlar<T>(sorgu: (bas: number, son: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const tum: T[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await sorgu(bas, bas + 999);
    if (error) throw new Error(error.message);
    const parca = data ?? [];
    tum.push(...parca);
    if (parca.length < 1000) return tum;
  }
}

export async function smsAyarOzetiGetir(admin: Istemci, schoolId: string): Promise<SmsAyarOzeti | null> {
  const { data } = await admin.from("kurum_sms_ayarlari")
    .select("saglayici, basliklar, secili_baslik, bakiye, son_dogrulama_at").eq("school_id", schoolId).maybeSingle();
  const bilgi = smsSaglayiciBilgisi(data?.saglayici as string | undefined);
  if (!data || !bilgi) return null;
  return {
    saglayici: bilgi.kod,
    saglayiciAdi: bilgi.ad,
    basliklar: Array.isArray(data.basliklar) ? (data.basliklar as string[]) : [],
    seciliBaslik: (data.secili_baslik as string | null) ?? null,
    bakiye: (data.bakiye as string | null) ?? null,
    sonDogrulama: (data.son_dogrulama_at as string | null) ?? null,
  };
}

export async function smsSablonlariGetir(admin: Istemci, schoolId: string): Promise<SmsSablonu[]> {
  const { data } = await admin.from("sms_sablonlari").select("id, ad, icerik").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as SmsSablonu[];
}

/** gonderenId verilirse yalnız o kişinin gönderimleri (müdür dışındakiler yalnız kendi geçmişini görür). */
export async function smsGecmisiGetir(admin: Istemci, schoolId: string, sinir = 50, gonderenId?: string): Promise<SmsGecmisKaydi[]> {
  let sorgu = admin.from("sms_gonderimleri")
    .select("id, created_at, baslik, icerik, hedef_ozeti, alici_sayisi, gecersiz_sayisi, durum, zamanlanmis_at, hata, gonderen_id")
    .eq("school_id", schoolId);
  if (gonderenId) sorgu = sorgu.eq("gonderen_id", gonderenId);
  const { data } = await sorgu.order("created_at", { ascending: false }).limit(sinir);
  const satirlar = (data ?? []) as {
    id: string; created_at: string; baslik: string; icerik: string; hedef_ozeti: string | null; alici_sayisi: number;
    gecersiz_sayisi: number; durum: SmsGecmisKaydi["durum"]; zamanlanmis_at: string | null; hata: string | null; gonderen_id: string | null;
  }[];
  const idler = [...new Set(satirlar.map((s) => s.gonderen_id).filter((x): x is string => !!x))];
  const adlar = new Map<string, string>();
  if (idler.length > 0) {
    const { data: profiller } = await admin.from("profiles").select("id, ad").in("id", idler);
    for (const p of (profiller ?? []) as { id: string; ad: string }[]) adlar.set(p.id, p.ad);
  }
  return satirlar.map((s) => ({
    id: s.id, tarih: s.created_at, baslik: s.baslik, icerik: s.icerik, hedef: s.hedef_ozeti,
    aliciSayisi: s.alici_sayisi, gecersizSayisi: s.gecersiz_sayisi, durum: s.durum,
    zamanlanmis: s.zamanlanmis_at, hata: s.hata, gonderen: s.gonderen_id ? adlar.get(s.gonderen_id) ?? null : null,
  }));
}

/** Kişinin kapsamındaki sınıflar ve her birinde ulaşılabilir veli sayısı. */
export async function smsSiniflariGetir(admin: Istemci, schoolId: string, sinifDuzeyleri: string[] | null): Promise<SmsSinifi[]> {
  const { data } = await admin.from("classes").select("id, seviye, sube").eq("school_id", schoolId);
  const siniflar = ((data ?? []) as { id: string; seviye: string; sube: string }[])
    .filter((s) => smsSeviyeKapsamdaMi(sinifDuzeyleri, s.seviye))
    .sort(sinifSiraKarsilastir);
  if (siniflar.length === 0) return [];
  const idler = siniflar.map((s) => s.id);
  const ogrenciler = await tumSatirlar<{ class_id: string; veli_telefon: string | null }>((bas, son) =>
    admin.from("students").select("class_id, veli_telefon").eq("school_id", schoolId).in("class_id", idler).order("id").range(bas, son));
  const sayac = new Map<string, { toplam: number; ulasilabilir: number }>();
  for (const o of ogrenciler) {
    const s = sayac.get(o.class_id) ?? { toplam: 0, ulasilabilir: 0 };
    s.toplam++;
    if (telefonuNormallestir(o.veli_telefon)) s.ulasilabilir++;
    sayac.set(o.class_id, s);
  }
  return siniflar.map((s) => ({
    id: s.id, seviye: s.seviye, sube: s.sube,
    ogrenciSayisi: sayac.get(s.id)?.toplam ?? 0, ulasilabilir: sayac.get(s.id)?.ulasilabilir ?? 0,
  }));
}

export interface SmsAliciSatiri extends SmsOgrencisi { telefon: string | null }

/** Seçili sınıfların öğrencileri; sunucu içi (telefon dahil). İstemciye gitmeden önce `smsOgrencisiyeIndir`. */
export async function smsAlicilariCoz(admin: Istemci, schoolId: string, sinifIdleri: string[]): Promise<SmsAliciSatiri[]> {
  if (sinifIdleri.length === 0) return [];
  const satirlar = await tumSatirlar<{
    id: string; class_id: string; okul_no: string | null; veli_telefon: string | null;
    profiles: { ad: string } | { ad: string }[] | null;
  }>((bas, son) =>
    admin.from("students").select("id, class_id, okul_no, veli_telefon, profiles!students_id_fkey(ad)")
      .eq("school_id", schoolId).in("class_id", sinifIdleri).order("id").range(bas, son));
  return satirlar.map((s) => {
    const profil = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    const telefon = telefonuNormallestir(s.veli_telefon);
    return { id: s.id, ad: profil?.ad ?? "—", okulNo: s.okul_no, sinifId: s.class_id, gecerli: telefon !== null, telefon };
  });
}

export function smsOgrencisiyeIndir(a: SmsAliciSatiri): SmsOgrencisi {
  return { id: a.id, ad: a.ad, okulNo: a.okulNo, sinifId: a.sinifId, gecerli: a.gecerli };
}
