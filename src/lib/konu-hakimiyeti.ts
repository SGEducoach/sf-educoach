// Konu Hakimiyeti (Faz H) — öğrencinin müfredattaki HER konu için kalıcı
// hakimiyet beyanı verebildiği ekranın veri katmanı. Konu Çalışma'daki
// (hedefe_yakinlik, bir oturumun o anki değerlendirmesi) ile karıştırılmasın
// diye ayrı bir tablodan (ogrenci_konu_hakimiyeti, migration 0055) besleniyor.
import type { createClient } from "@/lib/supabase/server";
import { MUFREDAT_KONULARI, konuOgrenciyeUygunMu, konuSeviyesi, konuSinavi } from "@/lib/mufredat-konulari";
import { AYT_MUFREDAT_DERSLERI, dokuzOnSinifMi } from "@/lib/types";
import type { AytAlan, HedefeYakinlik, OgrenmeSekli, TekrarDurumu } from "@/lib/types";
import { oturumOrtalamasiHesapla, dogrulukOraniHesapla, bilesikMasterySkoruHesapla } from "@/lib/analiz-motoru";
import type { MasteryKaynagi } from "@/lib/analiz-motoru";
import { kazanimDersiniKanoniklestir } from "@/lib/kazanim-konu-oneri";
import { beyanOlcumOnerisi, konuHedefiniBul, konuOlcumuYeterliMi } from "@/lib/konu-ad-eslesmesi";
import type { KonuAdEslesmesi } from "@/lib/konu-ad-eslesmesi";

type SupabaseC = Awaited<ReturnType<typeof createClient>>;

export interface KonuHakimiyetiSatiri {
  ders: string;
  // Hiyerarşisi olan (9-10-11. sınıf, Türkçe hariç) dersler için alt
  // başlıkları gruplamada kullanılıyor — hiyerarşisi olmayan derslerde
  // ustKonu === konu (kendi kendinin grubu).
  ustKonu: string;
  konu: string;
  seviye: string;
  hakimiyetSeviyesi: HedefeYakinlik | null;
  ogrenmeSekli: OgrenmeSekli[];
  tekrarDurumu: TekrarDurumu | null;
  guncellenmeTarihi: string | null;
  // Sunucuda hesaplanıyor (client'ta Date.now() çağırmak render'ı
  // saf-olmayan yapardı) — 90+ gündür güncellenmemiş bir hakimiyet
  // beyanı "gözden geçir" rozetiyle işaretlenir.
  bayat: boolean;
  // Analiz Motoru Faz A1 (Katman 2) — konu_calismalar (oturum), soru_cozumleri
  // (ölçüm) ve ogrenci_konu_hakimiyeti (kalıcı beyan) sinyallerinin ağırlıklı
  // bileşimi, 0-100. Hiçbir sinyal yoksa null (bu konuya hiç dokunulmamış).
  // Bkz. src/lib/analiz-motoru.ts. "hakim/toplam" yüzdesi hâlâ öğrencinin
  // beyanına dayanır. Ekran skoru yalnız yeterli doğrudan ölçüm varken
  // gösterir; mevcut planlama motorunun ham skoru değişmez.
  masterySkoru: number | null;
  masteryKaynaklari: MasteryKaynagi[];
  olcumSoruSayisi: number;
  olcumKayitSayisi: number;
  olcumYeterli: boolean;
  olcumOnerisi: "gozden_gecir" | "ilerleme" | null;
}

const BAYATLAMA_GUN_SINIRI = 90;

// Öğrencinin sınıfı veritabanında "9"/"10"/"11"/"12" olarak tutulur.
// Sınıfsız mezun profillerinde tam YKS kapsamı gösterilir.
function ogrenciSinifNumarasi(sinifSeviyesi: string | null): number {
  if (!sinifSeviyesi) return 12;
  const sayi = Number(sinifSeviyesi);
  return Number.isFinite(sayi) ? sayi : 12;
}

// Eski ekran çağıranlarının kullandığı bayrak; kurum türü kapsamı değiştirmez.
export function tamGorunumMu(sinifSeviyesi: string | null, dershaneMi: boolean): boolean {
  void dershaneMi;
  return ogrenciSinifNumarasi(sinifSeviyesi) >= 12;
}

// TYT ve AYT listeleri ayrıdır: 9-10 TYT, 11-12 AYT.
export function satirTytdeGosterilsinMi(satir: KonuHakimiyetiSatiri): boolean {
  return konuSinavi(satir) === "TYT";
}
// Kullanıcı geri bildirimi (24.08.2026): "bir SAY öğrencisi AYT İnkılap
// Tarihi görmesin" — AYT sekmesi öğrencinin GERÇEK alanına (SAY/EA/SÖZ)
// göre daraltılmalı, sadece Türkçe'yi dışlamak yetmiyordu (TYT_DERSLERI
// unconditional dahil edildiğinden Tarih/Coğrafya/Felsefe/Din Kültürü/
// Edebiyat alan fark etmeksizin sızıyordu). AYT_MUFREDAT_DERSLERI ile
// (bkz. types.ts) dersin bu alanın GERÇEK AYT kapsamında olup olmadığı
// kontrol ediliyor.
export function satirAytdeGosterilsinMi(satir: KonuHakimiyetiSatiri, aytAlan: AytAlan): boolean {
  return konuSinavi(satir) === "AYT" && AYT_MUFREDAT_DERSLERI[aytAlan].includes(satir.ders);
}

// Deneme konu sonuçlarını (deneme_kazanim_sonuclari) yönetici onaylı
// eşleşmeyle (kazanim_konu_eslesmeleri) müfredat konusuna çevirir —
// kullanıcı isteği 25.09.2026. Eşleşmesi olmayan kazanımlar atlanır.
async function denemeKonuOlcumleriGetir(
  supabase: SupabaseC, studentId: string,
): Promise<{ ders: string; konu: string; dogru: number; yanlis: number }[]> {
  const { data: eslesmelerHam } = await supabase.from("kazanim_konu_eslesmeleri").select("ders, kazanim_metni, konu");
  const eslesmeler = new Map(((eslesmelerHam as { ders: string; kazanim_metni: string; konu: string }[]) ?? [])
    .map((e) => [`${e.ders}|${e.kazanim_metni}`, e.konu]));
  if (eslesmeler.size === 0) return [];

  const sonuc: { ders: string; konu: string; dogru: number; yanlis: number }[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await supabase.from("deneme_kazanim_sonuclari")
      .select("ders, kazanim_metni, dogru, yanlis, denemeler!inner(student_id)")
      .eq("denemeler.student_id", studentId).order("id").range(bas, bas + 999);
    if (error) return sonuc;
    for (const r of (data as { ders: string; kazanim_metni: string; dogru: number; yanlis: number }[]) ?? []) {
      const ders = kazanimDersiniKanoniklestir(r.ders);
      const konu = ders ? eslesmeler.get(`${ders}|${r.kazanim_metni}`) : undefined;
      if (ders && konu) sonuc.push({ ders, konu, dogru: r.dogru, yanlis: r.yanlis });
    }
    if ((data ?? []).length < 1000) return sonuc;
  }
}

async function konuCalismalariniGetir(supabase: SupabaseC, studentId: string) {
  const satirlar: { ders: string; konu: string; hedefe_yakinlik: HedefeYakinlik }[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await supabase.from("konu_calismalar")
      .select("ders, konu, hedefe_yakinlik").eq("student_id", studentId).order("id").range(bas, bas + 999);
    if (error) return satirlar;
    satirlar.push(...((data as typeof satirlar) ?? []));
    if ((data ?? []).length < 1000) return satirlar;
  }
}

async function soruCozumleriniGetir(supabase: SupabaseC, studentId: string) {
  const satirlar: { ders: string; konu: string | null; dogru: number; yanlis: number }[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await supabase.from("soru_cozumleri")
      .select("ders, konu, dogru, yanlis").eq("student_id", studentId).order("id").range(bas, bas + 999);
    if (error) return satirlar;
    satirlar.push(...((data as typeof satirlar) ?? []));
    if ((data ?? []).length < 1000) return satirlar;
  }
}

export async function konuHakimiyetiGetir(
  supabase: SupabaseC,
  studentId: string,
  sinifSeviyesi: string | null,
  aytAlan: AytAlan,
  dokuzOnMu: boolean,
  dershaneMi: boolean,
): Promise<KonuHakimiyetiSatiri[]> {
  void dokuzOnMu;
  void dershaneMi;

  const { data: altKonularHam } = await supabase
    .from("mufredat_alt_konular")
    .select("ders, ust_konu, alt_baslik")
    .order("sira");
  const { data: ogrenci } = await supabase.from("students").select("school_id").eq("id", studentId).single();
  const { data: kurumAltKonularHam } = ogrenci?.school_id
    ? await supabase.from("kurum_mufredat_alt_konulari").select("ders, ust_konu, alt_baslik").eq("school_id", ogrenci.school_id)
    : { data: [] };
  type AltKonuRow = { ders: string; ust_konu: string; alt_baslik: string };
  const altKonularMap = new Map<string, string[]>();
  for (const r of ([...(altKonularHam ?? []), ...(kurumAltKonularHam ?? [])] as AltKonuRow[])) {
    const anahtar = `${r.ders}|${r.ust_konu}`;
    const liste = altKonularMap.get(anahtar) ?? [];
    if (!liste.includes(r.alt_baslik)) liste.push(r.alt_baslik);
    altKonularMap.set(anahtar, liste);
  }

  const yaprakListesi: { ders: string; ustKonu: string; konu: string; seviye: string }[] = [];
  for (const k of MUFREDAT_KONULARI) {
    if (!konuOgrenciyeUygunMu(k, sinifSeviyesi, aytAlan)) continue;
    const seviye = konuSeviyesi(k.seviye);
    yaprakListesi.push({ ders: k.ders, ustKonu: k.konu, konu: k.konu, seviye });
    const altBasliklar = altKonularMap.get(`${k.ders}|${k.konu}`);
    for (const alt of altBasliklar ?? []) {
      if (alt !== k.konu) yaprakListesi.push({ ders: k.ders, ustKonu: k.konu, konu: alt, seviye });
    }
  }

  const { data: hakimiyetHam } = await supabase
    .from("ogrenci_konu_hakimiyeti")
    .select("ders, konu, hakimiyet_seviyesi, ogrenme_sekli, tekrar_durumu, guncellenme_tarihi")
    .eq("student_id", studentId);
  type HakimiyetRow = {
    ders: string; konu: string; hakimiyet_seviyesi: HedefeYakinlik;
    ogrenme_sekli: OgrenmeSekli[]; tekrar_durumu: TekrarDurumu | null; guncellenme_tarihi: string;
  };
  const hakimiyetMap = new Map<string, HakimiyetRow>();
  for (const r of (hakimiyetHam as HakimiyetRow[]) ?? []) hakimiyetMap.set(`${r.ders}|${r.konu}`, r);

  // Analiz Motoru Faz A1 (Katman 2) — bileşik skor için iki EK sinyal:
  // "oturum" (konu_calismalar'daki tüm hedefe_yakinlik'lerin ortalaması)
  // ve "ölçüm" (soru_cozumleri'ndeki gerçek dogru/yanlis oranı). İkisi de
  // TARİH SINIRI OLMADAN, öğrencinin o konudaki tüm geçmişini kapsar —
  // bkz. analiz-motoru.ts'teki formül gerekçesi.
  const [oturumHam, olcumHam, denemeOlcumleri, { data: adEslesmeleriHam }] = await Promise.all([
    konuCalismalariniGetir(supabase, studentId),
    soruCozumleriniGetir(supabase, studentId),
    denemeKonuOlcumleriGetir(supabase, studentId),
    supabase.from("konu_ad_eslesmeleri").select("ders, kaynak_konu, hedef_konu"),
  ]);
  const adEslesmeleri = (adEslesmeleriHam as KonuAdEslesmesi[] | null) ?? [];
  const oturumSeviyeleriMap = new Map<string, HedefeYakinlik[]>();
  for (const r of oturumHam) {
    const hedef = konuHedefiniBul(r.ders, r.konu, yaprakListesi, adEslesmeleri).hedef;
    if (!hedef) continue;
    const anahtar = `${hedef.ders}|${hedef.konu}`;
    const liste = oturumSeviyeleriMap.get(anahtar) ?? [];
    liste.push(r.hedefe_yakinlik);
    oturumSeviyeleriMap.set(anahtar, liste);
  }
  const olcumToplamMap = new Map<string, { dogru: number; yanlis: number; kayitSayisi: number }>();
  for (const r of olcumHam) {
    if (!r.konu) continue; // soru_cozumleri'nde konu zorunlu değil — boşsa katkı veremez
    const hedef = konuHedefiniBul(r.ders, r.konu, yaprakListesi, adEslesmeleri).hedef;
    if (!hedef) continue;
    const anahtar = `${hedef.ders}|${hedef.konu}`;
    const mevcut = olcumToplamMap.get(anahtar) ?? { dogru: 0, yanlis: 0, kayitSayisi: 0 };
    mevcut.dogru += r.dogru;
    mevcut.yanlis += r.yanlis;
    if (r.dogru + r.yanlis > 0) mevcut.kayitSayisi++;
    olcumToplamMap.set(anahtar, mevcut);
  }
  // Üst konu kazanımını bütün alt başlıklara dağıtmak, ölçülmemiş alt
  // başlıklarda sahte bir hâkimiyet üretir. Yalnız doğrudan yaprak konuya
  // eşlenen deneme sonuçları bu öneriye kanıt sayılır.
  const yaprakAnahtarlari = new Set(yaprakListesi.map((l) => `${l.ders}|${l.konu}`));
  for (const o of denemeOlcumleri) {
    const anahtar = `${o.ders}|${o.konu}`;
    if (!yaprakAnahtarlari.has(anahtar)) continue;
    const mevcut = olcumToplamMap.get(anahtar) ?? { dogru: 0, yanlis: 0, kayitSayisi: 0 };
    mevcut.dogru += o.dogru;
    mevcut.yanlis += o.yanlis;
    if (o.dogru + o.yanlis > 0) mevcut.kayitSayisi++;
    olcumToplamMap.set(anahtar, mevcut);
  }

  const simdi = Date.now();
  return yaprakListesi.map((l) => {
    const anahtar = `${l.ders}|${l.konu}`;
    const h = hakimiyetMap.get(anahtar);
    const guncellenmeTarihi = h?.guncellenme_tarihi ?? null;
    const gunFarkiSonGuncelleme = guncellenmeTarihi === null
      ? null
      : (simdi - new Date(guncellenmeTarihi).getTime()) / (1000 * 3600 * 24);
    const bayat = gunFarkiSonGuncelleme !== null && gunFarkiSonGuncelleme > BAYATLAMA_GUN_SINIRI;

    const olcumToplam = olcumToplamMap.get(anahtar);
    const olcumYeterli = olcumToplam ? konuOlcumuYeterliMi(olcumToplam.dogru, olcumToplam.yanlis, olcumToplam.kayitSayisi) : false;
    const { skor, kaynaklar: masteryKaynaklari } = bilesikMasterySkoruHesapla({
      olcumDogrulukOrani: olcumToplam ? dogrulukOraniHesapla(olcumToplam.dogru, olcumToplam.yanlis) : null,
      kaliciBeyan: h?.hakimiyet_seviyesi ?? null,
      oturumOrtalamasi: oturumOrtalamasiHesapla(oturumSeviyeleriMap.get(anahtar) ?? []),
      gunFarkiSonGuncelleme,
    });

    return {
      ders: l.ders, ustKonu: l.ustKonu, konu: l.konu, seviye: l.seviye,
      hakimiyetSeviyesi: h?.hakimiyet_seviyesi ?? null,
      ogrenmeSekli: h?.ogrenme_sekli ?? [],
      tekrarDurumu: h?.tekrar_durumu ?? null,
      guncellenmeTarihi,
      bayat,
      masterySkoru: skor,
      masteryKaynaklari,
      olcumSoruSayisi: (olcumToplam?.dogru ?? 0) + (olcumToplam?.yanlis ?? 0),
      olcumKayitSayisi: olcumToplam?.kayitSayisi ?? 0,
      olcumYeterli,
      olcumOnerisi: olcumToplam
        ? beyanOlcumOnerisi(h?.hakimiyet_seviyesi ?? null, olcumToplam.dogru, olcumToplam.yanlis, olcumToplam.kayitSayisi)
        : null,
    };
  });
}

// Analiz Paneli'nde (öğrenci/öğretmen-müdür/veli/admin — 4 ayrı çağrı
// noktası) Konu Hakimiyeti özetini göstermek için — çağıranın öğrencinin
// sınıf/ayt_alan/kurum türü bilgisini ZATEN elinde bulundurmasını
// beklemeden, kendi içinde küçük bir sorguyla çekip konuHakimiyetiGetir'i
// çağırır. Öğrencinin kendi dashboard'ında (H2 ekranının kendisi) bu
// bilgiler zaten sayfa genelinde mevcut olduğundan orada konuHakimiyetiGetir
// doğrudan çağrılmaya devam ediyor — bu sarmalayıcı sadece DİĞER 3 çağrı
// noktası (öğretmen/müdür, veli, admin) için.
export async function konuHakimiyetiOzetiGetir(
  supabase: SupabaseC,
  studentId: string,
): Promise<{ satirlar: KonuHakimiyetiSatiri[]; tamGorunum: boolean; aytAlan: AytAlan }> {
  const { data } = await supabase
    .from("students")
    .select("ayt_alan, classes(seviye), schools(tur)")
    .eq("id", studentId)
    .single();
  type Row = { ayt_alan: AytAlan; classes: { seviye: string } | null; schools: { tur: string } | null };
  const s = data as unknown as Row | null;
  if (!s) return { satirlar: [], tamGorunum: false, aytAlan: "SAY" };
  const dokuzOnMu = dokuzOnSinifMi(s.classes?.seviye ?? null);
  const dershaneMi = s.schools?.tur === "dershane";
  const satirlar = await konuHakimiyetiGetir(supabase, studentId, s.classes?.seviye ?? null, s.ayt_alan, dokuzOnMu, dershaneMi);
  return { satirlar, tamGorunum: tamGorunumMu(s.classes?.seviye ?? null, dershaneMi), aytAlan: s.ayt_alan };
}

// "Gerek yok" onayı (Faz H3, Plan Yap + Konu Çalışma girişi) için —
// sadece tekrar_durumu='gerek_yok' işaretli (ders,konu) çiftlerinin
// hafif bir haritası, tam satır listesini taşımaya gerek yok.
export async function gerekYokHaritasiGetir(supabase: SupabaseC, studentId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("ogrenci_konu_hakimiyeti")
    .select("ders, konu")
    .eq("student_id", studentId)
    .eq("tekrar_durumu", "gerek_yok");
  return new Set(((data as { ders: string; konu: string }[]) ?? []).map((r) => `${r.ders}|${r.konu}`));
}
