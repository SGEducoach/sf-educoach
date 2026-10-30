// Konu Durumu veri katmanı — kapsam seçenekleri, kapsamdaki öğrenciler ve
// dört kaynağın toplu çekimi (öğrenci başına ayrı sorgu yok). Hesap saf
// fonksiyonda: konu-durumu.ts.
//
// Kapsam her zaman SUNUCUDA, öğretmen kaydından kurulur; URL'den yalnız
// seçilen seçeneğin anahtarı gelir ve listede yoksa yok sayılır. Bu yüzden
// veri service-role istemcisiyle çekilir (RLS'nin konu_calismalar /
// soru_cozumleri için öğretmene tanıdığı kapsam sınıf bazlı değil).
import type { SupabaseClient } from "@supabase/supabase-js";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import { sinifSiraKarsilastir } from "@/lib/types";
import type { HedefeYakinlik } from "@/lib/types";
import {
  bransinMufredatDersleri, konuDurumuHesapla,
  type KdBeyanSatiri, type KdDenemeSatiri, type KdOgrenci, type KdOturumSatiri, type KdSoruBilgisi, type KdSoruSatiri, type KonuDurumuVerisi,
} from "@/lib/konu-durumu";
import type { KonuAdEslesmesi, KonuHedefi } from "@/lib/konu-ad-eslesmesi";
import { bransKazanimBasligi, bransKazanimBasligiMi } from "@/lib/kazanim-konu-oneri";
import { kazanimSorulariniCikar, type OgrenciKarneVerisi } from "@/lib/kazanim-soru-cikarimi";
import type { KarneDersOrtalamasi, KarneTestCevaplari } from "@/lib/karne-birinci-sayfa";
import { GELISIM_TAKIP_GUNU, liseOgrenmeGelisimiHesapla, type GelisimGorevi } from "./lise-ogrenme-gelisimi";
import { bugununTarihiTR, tarihEkle } from "./tarih";

export interface KonuDurumuKapsami {
  anahtar: string;
  etiket: string;
  classIds: string[] | null; // null = tüm okul
  seviyeler: string[] | null;
  dersler: string[] | null; // null = bütün dersler
}

type Sinif = { id: string; seviye: string; sube: string };
const sinifAdi = (s: Sinif) => `${s.seviye}-${s.sube}`;

// Kullanıcı kararı (17.10.2026):
//  - müdür / yönetici / moderatör / dershane rehberi: tüm okul + tek tek sınıflar
//  - okul rehberi: atandığı seviyeler
//  - öğretmen: sınıf öğretmeni olduğu sınıf (bütün dersler) + ders verdiği
//    sınıflar (yalnız o ders); hiçbiri yoksa kendi branş dersi tüm okulda.
export function konuDurumuKapsamlari(girdi: {
  tur: "okul-geneli" | "okul-rehberi" | "ogretmen";
  siniflar: Sinif[];
  rehberSeviyeleri?: string[];
  sinifId?: string | null;
  dersAtamalari?: { classId: string; ders: string }[];
  brans?: string | null;
}): KonuDurumuKapsami[] {
  const siniflar = [...girdi.siniflar].sort(sinifSiraKarsilastir);
  if (girdi.tur === "okul-geneli") {
    return [
      { anahtar: "okul", etiket: "Tüm okul", classIds: null, seviyeler: null, dersler: null },
      ...siniflar.map((s) => ({ anahtar: s.id, etiket: sinifAdi(s), classIds: [s.id], seviyeler: null, dersler: null })),
    ];
  }
  if (girdi.tur === "okul-rehberi") {
    const seviyeler = girdi.rehberSeviyeleri ?? [];
    if (seviyeler.length === 0) return [];
    return [
      { anahtar: "okul", etiket: `Atandığım seviyeler (${seviyeler.join(", ")})`, classIds: null, seviyeler, dersler: null },
      ...siniflar.filter((s) => seviyeler.includes(s.seviye))
        .map((s) => ({ anahtar: s.id, etiket: sinifAdi(s), classIds: [s.id], seviyeler: null, dersler: null })),
    ];
  }
  const kapsamlar: KonuDurumuKapsami[] = [];
  const kendiSinifi = siniflar.find((s) => s.id === girdi.sinifId);
  if (kendiSinifi) kapsamlar.push({ anahtar: kendiSinifi.id, etiket: `${sinifAdi(kendiSinifi)} (sınıfım)`, classIds: [kendiSinifi.id], seviyeler: null, dersler: null });
  for (const a of girdi.dersAtamalari ?? []) {
    if (a.classId === kendiSinifi?.id) continue; // kendi sınıfında zaten bütün dersleri görüyor
    const s = siniflar.find((x) => x.id === a.classId);
    const dersler = bransinMufredatDersleri(a.ders);
    if (!s || dersler.length === 0) continue;
    const anahtar = `${s.id}~${a.ders}`;
    if (!kapsamlar.some((k) => k.anahtar === anahtar)) {
      kapsamlar.push({ anahtar, etiket: `${sinifAdi(s)} · ${a.ders}`, classIds: [s.id], seviyeler: null, dersler });
    }
  }
  // Sıra her zaman seviye (sayısal) + şube (alfabetik); kendi sınıfı öne
  // alınmaz, etiketinden tanınır (kullanıcı kararı 18.10.2026). Aynı sınıfta
  // birden çok ders varsa ders adına göre.
  const sira = new Map(siniflar.map((s, i) => [s.id, i]));
  kapsamlar.sort((a, c) => (sira.get(a.classIds![0]) ?? 0) - (sira.get(c.classIds![0]) ?? 0) || a.etiket.localeCompare(c.etiket, "tr"));
  if (kapsamlar.length > 0) return kapsamlar;
  const bransDersleri = bransinMufredatDersleri(girdi.brans);
  if (bransDersleri.length === 0) return [];
  return [
    { anahtar: "okul", etiket: `Tüm okul · ${girdi.brans}`, classIds: null, seviyeler: null, dersler: bransDersleri },
    ...siniflar.map((s) => ({ anahtar: s.id, etiket: `${sinifAdi(s)} · ${girdi.brans}`, classIds: [s.id], seviyeler: null, dersler: bransDersleri })),
  ];
}

const SAYFA = 1000;
const PARCA = 150;

async function hepsiniCek<T>(sorgu: (bas: number, son: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const satirlar: T[] = [];
  for (let bas = 0; ; bas += SAYFA) {
    const { data, error } = await sorgu(bas, bas + SAYFA - 1);
    if (error) throw new Error(error.message);
    const parca = (data as T[]) ?? [];
    satirlar.push(...parca);
    if (parca.length < SAYFA) return satirlar;
  }
}

// Kimlik listesini 150'lik parçalara böler; parçalar aynı anda en fazla
// ESZAMANLI tane çekilir (okul geneli sırayla çekilince ~16 sn sürüyordu).
const ESZAMANLI = 4;

async function parcaParcaCek<T>(idler: string[], sorgu: (parca: string[], bas: number, son: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const parcalar: string[][] = [];
  for (let i = 0; i < idler.length; i += PARCA) parcalar.push(idler.slice(i, i + PARCA));
  const sonuclar: T[][] = new Array(parcalar.length);
  let sira = 0;
  const isci = async () => {
    while (sira < parcalar.length) {
      const i = sira++;
      sonuclar[i] = await hepsiniCek<T>((bas, son) => sorgu(parcalar[i], bas, son));
    }
  };
  await Promise.all(Array.from({ length: Math.min(ESZAMANLI, parcalar.length) }, isci));
  return sonuclar.flat();
}

function tarihGoster(tarih: string): string {
  const [y, a, g] = tarih.split("-");
  return `${g}.${a}.${y}`;
}

// Faz 2 — "bu konu denemede hangi sorulardı". Karnenin soru soru cevapları
// (deneme_karne_ozetleri) ile konu D/Y sayıları karşılaştırılır
// (kazanim-soru-cikarimi.ts). Çıkarım kombinatoryal olduğu için sınırlı:
// kapsamdaki son SORU_DENEME_SAYISI deneme, her birinde en fazla
// SORU_OGRENCI_SAYISI öğrencinin karnesi. Hata olursa sessizce boş döner —
// soru numarası yardımcı bilgi, ekranın geri kalanını etkilemez.
const SORU_DENEME_SAYISI = 3;
const SORU_OGRENCI_SAYISI = 40;

async function sonDenemelerinSorulari(
  admin: SupabaseClient,
  denemeSatirlari: { id: string; tarih: string; tur: string; yayinevi: string | null }[],
  kazanimSatirlari: { deneme_id: string; ders: string; kazanim_metni: string; soru: number; dogru: number; yanlis: number }[],
): Promise<KdSoruBilgisi[]> {
  try {
    // Yalnız soru soru cevabı olan karneler işe yarar (SDS ve Maarif
    // karnelerinde cevap tablosu yok); "son 3" bunların arasından seçilir.
    const kazanimliIdler = [...new Set(kazanimSatirlari.map((k) => k.deneme_id))];
    const cevapliDenemeler = new Set((await parcaParcaCek<{ deneme_id: string }>(kazanimliIdler, (p, bas, son) => admin.from("deneme_karne_ozetleri")
      .select("deneme_id").in("deneme_id", p).neq("cevaplar", "[]").order("deneme_id").range(bas, son))).map((k) => k.deneme_id));
    const gruplar = new Map<string, { tarih: string; etiket: string; idler: string[] }>();
    for (const d of [...denemeSatirlari].sort((a, c) => c.tarih.localeCompare(a.tarih))) {
      if (!cevapliDenemeler.has(d.id)) continue;
      const yayinevi = (d.yayinevi ?? "").trim();
      const anahtar = `${d.tarih}|${d.tur}|${yayinevi.toLocaleUpperCase("tr-TR")}`;
      if (!gruplar.has(anahtar)) {
        if (gruplar.size >= SORU_DENEME_SAYISI) continue;
        gruplar.set(anahtar, { tarih: d.tarih, etiket: `${tarihGoster(d.tarih)} · ${d.tur === "BRANS" ? "Branş" : d.tur} · ${yayinevi}`, idler: [] });
      }
      const g = gruplar.get(anahtar)!;
      if (g.idler.length < SORU_OGRENCI_SAYISI) g.idler.push(d.id);
    }
    const idler = [...gruplar.values()].flatMap((g) => g.idler);
    if (idler.length === 0) return [];
    type KarneRow = { deneme_id: string; ders_ortalamalari: KarneDersOrtalamasi[] | null; cevaplar: KarneTestCevaplari[] | null };
    const karneler = new Map((await parcaParcaCek<KarneRow>(idler, (p, bas, son) => admin.from("deneme_karne_ozetleri")
      .select("deneme_id, ders_ortalamalari, cevaplar").in("deneme_id", p).order("deneme_id").range(bas, son))).map((k) => [k.deneme_id, k]));
    const kazanimlar = new Map<string, typeof kazanimSatirlari>();
    for (const k of kazanimSatirlari) if (karneler.has(k.deneme_id)) kazanimlar.set(k.deneme_id, [...(kazanimlar.get(k.deneme_id) ?? []), k]);

    const sonuc: KdSoruBilgisi[] = [];
    for (const g of gruplar.values()) {
      // Branş denemesi kazanımları "<Ders>_Branş_Deneme" diye yazılıyor; karnenin
      // ders tablosu ise "Tarih-1" gibi asıl adı taşıyor. Çıkarım karne adıyla
      // yapılır, sonuç yeniden kayıttaki ada çevrilir.
      const kayitAdi = new Map<string, string>();
      const ogrenciler: OgrenciKarneVerisi[] = [];
      for (const id of g.idler) {
        const karne = karneler.get(id);
        if (!karne?.ders_ortalamalari?.length || !karne.cevaplar?.length) continue;
        const bransAdi = new Map(karne.ders_ortalamalari.map((d) => [bransKazanimBasligi(d.ders), d.ders]));
        ogrenciler.push({
          ogrenciId: id, dersler: karne.ders_ortalamalari, testler: karne.cevaplar,
          kazanimlar: (kazanimlar.get(id) ?? []).map((k) => {
            const karneAdi = bransKazanimBasligiMi(k.ders) ? (bransAdi.get(k.ders) ?? k.ders) : k.ders;
            kayitAdi.set(karneAdi, k.ders);
            return { ders: karneAdi, kazanimMetni: k.kazanim_metni, soru: k.soru, dogru: k.dogru, yanlis: k.yanlis };
          }),
        });
      }
      if (ogrenciler.length === 0) continue;
      for (const s of kazanimSorulariniCikar(ogrenciler)) {
        if (s.sorular.length === 0) continue;
        sonuc.push({
          denemeEtiketi: g.etiket, tarih: g.tarih, ders: kayitAdi.get(s.ders) ?? s.ders, kazanimMetni: s.kazanimMetni,
          test: s.test, kitapcik: s.kitapcik, sorular: s.sorular, kesin: s.kesin,
        });
      }
    }
    return sonuc;
  } catch (e) {
    console.warn("[konu-durumu] soru numaraları çıkarılamadı:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function konuDurumuGetir(
  admin: SupabaseClient,
  schoolId: string,
  kapsam: KonuDurumuKapsami,
  // Yalnız sunucudaki aktif lise öğretmeninin kimliği; URL/formdan alınmaz.
  gelisimOgretmenId?: string,
): Promise<{ error: string | null; veri: KonuDurumuVerisi | null }> {
  try {
    type OgrRow = { id: string; class_id: string | null; profiles: { ad: string } | null; classes: { seviye: string; sube: string } | null };
    const ogrSatirlari = await hepsiniCek<OgrRow>((bas, son) => admin.from("students")
      .select("id, class_id, profiles!students_id_fkey(ad), classes(seviye, sube)")
      .eq("school_id", schoolId).order("id").range(bas, son));
    const ogrenciler: KdOgrenci[] = ogrSatirlari
      .filter((o) => o.profiles)
      .filter((o) => !kapsam.classIds || (o.class_id !== null && kapsam.classIds.includes(o.class_id)))
      .filter((o) => !kapsam.seviyeler || (!!o.classes && kapsam.seviyeler.includes(o.classes.seviye)))
      .map((o) => ({
        id: o.id, ad: o.profiles!.ad, classId: o.class_id,
        sinif: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : null, dersler: kapsam.dersler,
      }));
    const idler = ogrenciler.map((o) => o.id);

    type DenemeRow = { id: string; student_id: string; tarih: string; tur: string; yayinevi: string | null };
    type KazanimRow = { deneme_id: string; ders: string; kazanim_metni: string; soru: number; dogru: number; yanlis: number };
    type SoruRow = { student_id: string; ders: string; konu: string; dogru: number; yanlis: number };
    type BeyanRow = { student_id: string; ders: string; konu: string; hakimiyet_seviyesi: HedefeYakinlik; guncellenme_tarihi: string | null };
    type OturumRow = { student_id: string; ders: string; konu: string; hedefe_yakinlik: HedefeYakinlik };

    const bugun = bugununTarihiTR();
    const [denemeSatirlari, soruSatirlari, beyanSatirlari, oturumSatirlari, kazanimEslesmeleri, adEslesmeleri, altKonular, kurumAltKonulari, gelisimGorevleri] = await Promise.all([
      parcaParcaCek<DenemeRow>(idler, (p, bas, son) => admin.from("denemeler").select("id, student_id, tarih, tur, yayinevi").in("student_id", p).order("id").range(bas, son)),
      parcaParcaCek<SoruRow>(idler, (p, bas, son) => admin.from("soru_cozumleri").select("student_id, ders, konu, dogru, yanlis").in("student_id", p).not("konu", "is", null).order("id").range(bas, son)),
      parcaParcaCek<BeyanRow>(idler, (p, bas, son) => admin.from("ogrenci_konu_hakimiyeti").select("student_id, ders, konu, hakimiyet_seviyesi, guncellenme_tarihi").in("student_id", p).order("id").range(bas, son)),
      parcaParcaCek<OturumRow>(idler, (p, bas, son) => admin.from("konu_calismalar").select("student_id, ders, konu, hedefe_yakinlik").in("student_id", p).order("id").range(bas, son)),
      hepsiniCek<{ ders: string; kazanim_metni: string; konu: string }>((bas, son) => admin.from("kazanim_konu_eslesmeleri").select("ders, kazanim_metni, konu").order("id").range(bas, son)),
      hepsiniCek<KonuAdEslesmesi>((bas, son) => admin.from("konu_ad_eslesmeleri").select("ders, kaynak_konu, hedef_konu").order("id").range(bas, son)),
      hepsiniCek<{ ders: string; ust_konu: string; alt_baslik: string }>((bas, son) => admin.from("mufredat_alt_konular").select("ders, ust_konu, alt_baslik").order("sira").order("id").range(bas, son)),
      hepsiniCek<{ ders: string; ust_konu: string; alt_baslik: string }>((bas, son) => admin.from("kurum_mufredat_alt_konulari").select("ders, ust_konu, alt_baslik").eq("school_id", schoolId).order("id").range(bas, son)),
      gelisimOgretmenId ? liseGelisimiGorevleriniGetir(admin,
        ogrenciler.filter((o) => /^(9|10|11|12)-/.test(o.sinif ?? "")).map((o) => o.id), gelisimOgretmenId, bugun)
        : Promise.resolve({ gorevler: [] as GelisimGorevi[], hata: false }),
    ]);

    const denemeBilgisi = new Map(denemeSatirlari.map((d) => [d.id, d]));
    const kazanimSatirlari = await parcaParcaCek<KazanimRow>(denemeSatirlari.map((d) => d.id), (p, bas, son) => admin.from("deneme_kazanim_sonuclari")
      .select("deneme_id, ders, kazanim_metni, soru, dogru, yanlis").in("deneme_id", p).order("id").range(bas, son));

    const denemeler: KdDenemeSatiri[] = [];
    for (const k of kazanimSatirlari) {
      const d = denemeBilgisi.get(k.deneme_id);
      if (!d) continue;
      const yayinevi = (d.yayinevi ?? "").trim();
      denemeler.push({
        studentId: d.student_id, tarih: d.tarih, denemeId: d.id,
        denemeAnahtari: `${d.tarih}|${d.tur}|${yayinevi.toLocaleUpperCase("tr-TR")}`,
        denemeEtiketi: `${tarihGoster(d.tarih)} · ${d.tur === "BRANS" ? "Branş" : d.tur} · ${yayinevi}`,
        ders: k.ders, kazanimMetni: k.kazanim_metni, soru: k.soru, dogru: k.dogru, yanlis: k.yanlis,
      });
    }

    const hedefler: KonuHedefi[] = MUFREDAT_KONULARI.map((k) => ({ ders: k.ders, konu: k.konu, ustKonu: k.konu }));
    for (const a of [...altKonular, ...kurumAltKonulari]) hedefler.push({ ders: a.ders, konu: a.alt_baslik, ustKonu: a.ust_konu });

    const soruBilgileri = await sonDenemelerinSorulari(admin, denemeSatirlari, kazanimSatirlari);

    const ortakVeri = {
      ogrenciler,
      denemeler,
      sorular: soruSatirlari.map((r): KdSoruSatiri => ({ studentId: r.student_id, ders: r.ders, konu: r.konu, dogru: r.dogru, yanlis: r.yanlis })),
      beyanlar: beyanSatirlari.map((r): KdBeyanSatiri => ({ studentId: r.student_id, ders: r.ders, konu: r.konu, seviye: r.hakimiyet_seviyesi, guncellenme: r.guncellenme_tarihi })),
      oturumlar: oturumSatirlari.map((r): KdOturumSatiri => ({ studentId: r.student_id, ders: r.ders, konu: r.konu, seviye: r.hedefe_yakinlik })),
      adlandirma: {
        kazanimKonusu: new Map(kazanimEslesmeleri.map((e) => [`${e.ders}|${e.kazanim_metni}`, e.konu])),
        hedefler,
        adEslesmeleri,
      },
    };
    const veri = konuDurumuHesapla({ ...ortakVeri, soruBilgileri });
    if (gelisimOgretmenId) {
      veri.ogrenmeGelisimi = liseOgrenmeGelisimiHesapla({
        ...ortakVeri,
        gorevler: gelisimGorevleri.gorevler, bugun, takipHatasi: gelisimGorevleri.hata,
      });
    }
    return { error: null, veri };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), veri: null };
  }
}

// Ek sorgu yalnız lise öğretmeninde. Öğrenci/kurum kapsamı yukarıda
// doğrulanmış idler, sahiplik ise öğretmenin sunucudaki kimliği ile sınırlı.
// Hata sıfır ödevmiş gibi gösterilmez; mevcut Konu Durumu çalışmaya devam eder.
export async function liseGelisimiGorevleriniGetir(admin: SupabaseClient, idler: string[], ogretmenId: string, bugun: string) {
  type GorevRow = { id: string; student_id: string; durum: GelisimGorevi["durum"]; created_at: string;
    gorevler: { ders: string; konu: string | null; tur: "konu" | "soru"; tarih: string; son_tarih: string;
      hedef_soru_sayisi: number | null; hedef_dakika: number | null } };
  try {
    const baslangic = `${tarihEkle(bugun, -(GELISIM_TAKIP_GUNU - 1))}T00:00:00+03:00`;
    const bitis = `${tarihEkle(bugun, 1)}T00:00:00+03:00`;
    const satirlar = await parcaParcaCek<GorevRow>(idler, (p, bas, son) => admin.from("gorev_atamalari")
      .select("id, student_id, durum, created_at, gorevler!inner(ders, konu, tur, tarih, son_tarih, hedef_soru_sayisi, hedef_dakika)")
      .in("student_id", p).eq("gorevler.olusturan_ogretmen_id", ogretmenId)
      .in("gorevler.tur", ["konu", "soru"]).gte("created_at", baslangic).lt("created_at", bitis)
      .order("id").range(bas, son));
    const gunFormati = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" });
    const gorevler: GelisimGorevi[] = satirlar.map((s) => {
      const g = s.gorevler;
      // UTC tarihini kesmek gece 00–03 arası bir önceki günü verirdi.
      const parcalar = gunFormati.formatToParts(new Date(s.created_at));
      const parca = (tur: string) => parcalar.find((p) => p.type === tur)?.value ?? "";
      return { id: s.id, studentId: s.student_id, ders: g.ders, konu: g.konu, tur: g.tur, durum: s.durum,
        tarih: g.tarih, sonTarih: g.son_tarih, atamaTarihi: `${parca("year")}-${parca("month")}-${parca("day")}`,
        hedefSoru: g.hedef_soru_sayisi, hedefDakika: g.hedef_dakika };
    });
    return { gorevler, hata: false };
  } catch {
    return { gorevler: [] as GelisimGorevi[], hata: true };
  }
}
