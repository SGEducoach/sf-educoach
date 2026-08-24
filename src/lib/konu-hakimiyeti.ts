// Konu Hakimiyeti (Faz H) — öğrencinin müfredattaki HER konu için kalıcı
// hakimiyet beyanı verebildiği ekranın veri katmanı. Konu Çalışma'daki
// (hedefe_yakinlik, bir oturumun o anki değerlendirmesi) ile karıştırılmasın
// diye ayrı bir tablodan (ogrenci_konu_hakimiyeti, migration 0055) besleniyor.
import type { createClient } from "@/lib/supabase/server";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import { TYT_DERSLERI, AYT_DERSLERI, dokuzOnSinifMi } from "@/lib/types";
import type { AytAlan, HedefeYakinlik, OgrenmeSekli, TekrarDurumu } from "@/lib/types";

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
}

const BAYATLAMA_GUN_SINIRI = 90;

// students.classes.seviye "9. Sınıf" formatındaki seviye etiketinden
// sınıf numarasını çıkarır — TYT/AYT/Hazırlık gibi sınıfsız etiketler
// için null döner (bunlar her zaman dahil edilir, aşağıya bakınız).
function seviyeSinifNumarasi(seviye: string): number | null {
  const eslesme = /^(\d+)\. Sınıf$/.exec(seviye);
  return eslesme ? Number(eslesme[1]) : null;
}

// Maarif Modeli Türkçe'de ayrı konu başlığı vermiyor (tema/beceri bazlı,
// bkz. mufredat-konulari.ts'in kendi notu) — bu yüzden Türkçe'nin normal
// (TYT) listesi hiyerarşiye hiç girmiyor. Kullanıcı isteğiyle 9-10-11.
// sınıf için AYRI, taslak bir "Türkçe (Maarif)" dersi eklendi — sadece bu
// dosyada (Konu Hakimiyeti) kullanılıyor; TYT_DERSLERI'ne EKLENMEDİ ki
// deneme/veri girişi gibi başka hiçbir ekrana sızmasın (bkz. plan).
// Öğrenci ekranda hem bunu hem düz TYT Türkçe'yi ayrı ayrı görür.
const MAARIF_TURKCE_DERSI = "Türkçe (Maarif)";

export async function konuHakimiyetiGetir(
  supabase: SupabaseC,
  studentId: string,
  sinifSeviyesi: string | null,
  aytAlan: AytAlan,
  dokuzOnMu: boolean,
  dershaneMi: boolean,
): Promise<KonuHakimiyetiSatiri[]> {
  // 12. sınıf gibi ileri sınıflar, YKS'nin kümülatif doğası gereği kendi
  // sınıflarının YANI SIRA önceki sınıfların konularını da görür — sadece
  // "seviye" 9-12 arası bir sınıf etiketiyken ve öğrencinin KENDİ
  // sınıfından İLERİ bir sınıfa aitse elenir. TYT/AYT/Hazırlık etiketli
  // (sınıf numarası taşımayan) konular her zaman dahil.
  // (Önceki hata: burada çıplak Number(sinifSeviyesi) kullanılıyordu —
  // sinifSeviyesi "9. Sınıf" gibi bir METİN olduğundan Number(...) hep
  // NaN dönüyordu ve sınıf filtresi FİİLEN HİÇ ÇALIŞMIYORDU; herkes tüm
  // sınıfların konularını görüyordu. seviyeSinifNumarasi ile düzeltildi.)
  const kendiSinif = sinifSeviyesi ? (seviyeSinifNumarasi(sinifSeviyesi) ?? 12) : 12;
  // "Tam görünüm" — dershaneli öğrenciler (sınıfları ne olursa olsun) ve
  // 12. sınıf/mezun öğrenciler, Maarif'in kademeli 9-10-11 hiyerarşisini
  // DEĞİL, TYT/AYT'nin TAM (düz) konu listesini görür — kullanıcı isteği.
  const tamGorunum = dershaneMi || kendiSinif >= 12;
  const dersListesiTemel = (dokuzOnMu && !tamGorunum)
    ? [...TYT_DERSLERI]
    : [...TYT_DERSLERI, ...AYT_DERSLERI[aytAlan].filter((d) => !TYT_DERSLERI.includes(d as typeof TYT_DERSLERI[number]))];
  const dersListesi = tamGorunum ? dersListesiTemel : [...dersListesiTemel, MAARIF_TURKCE_DERSI];

  const { data: altKonularHam } = await supabase
    .from("mufredat_alt_konular")
    .select("ders, ust_konu, alt_baslik")
    .order("sira");
  type AltKonuRow = { ders: string; ust_konu: string; alt_baslik: string };
  const altKonularMap = new Map<string, string[]>();
  for (const r of (altKonularHam as AltKonuRow[]) ?? []) {
    const anahtar = `${r.ders}|${r.ust_konu}`;
    const liste = altKonularMap.get(anahtar) ?? [];
    liste.push(r.alt_baslik);
    altKonularMap.set(anahtar, liste);
  }

  const yaprakListesi: { ders: string; ustKonu: string; konu: string; seviye: string }[] = [];
  for (const k of MUFREDAT_KONULARI) {
    if (!dersListesi.includes(k.ders)) continue;
    const sinifNo = seviyeSinifNumarasi(k.seviye);
    if (tamGorunum) {
      // Tam görünümde Maarif'in 9./10./11. sınıfa özel konuları (grade
      // etiketli olan HER ŞEY — kendi 12.sınıf'ı dahil değil) tamamen
      // dışlanır; sadece TYT/AYT/Hazırlık (sınıfsız) + 12. sınıf konuları
      // kalır — gerçek TYT/AYT sınavının kapsadığı düz konu seti bu.
      if (sinifNo !== null && sinifNo !== 12) continue;
    } else if (sinifNo !== null && sinifNo > kendiSinif) continue;
    const altBasliklar = altKonularMap.get(`${k.ders}|${k.konu}`);
    if (altBasliklar && altBasliklar.length > 0) {
      for (const alt of altBasliklar) yaprakListesi.push({ ders: k.ders, ustKonu: k.konu, konu: alt, seviye: k.seviye });
    } else {
      yaprakListesi.push({ ders: k.ders, ustKonu: k.konu, konu: k.konu, seviye: k.seviye });
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

  const simdi = Date.now();
  return yaprakListesi.map((l) => {
    const h = hakimiyetMap.get(`${l.ders}|${l.konu}`);
    const guncellenmeTarihi = h?.guncellenme_tarihi ?? null;
    const bayat = guncellenmeTarihi !== null
      && (simdi - new Date(guncellenmeTarihi).getTime()) / (1000 * 3600 * 24) > BAYATLAMA_GUN_SINIRI;
    return {
      ders: l.ders, ustKonu: l.ustKonu, konu: l.konu, seviye: l.seviye,
      hakimiyetSeviyesi: h?.hakimiyet_seviyesi ?? null,
      ogrenmeSekli: h?.ogrenme_sekli ?? [],
      tekrarDurumu: h?.tekrar_durumu ?? null,
      guncellenmeTarihi,
      bayat,
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
export async function konuHakimiyetiOzetiGetir(supabase: SupabaseC, studentId: string): Promise<KonuHakimiyetiSatiri[]> {
  const { data } = await supabase
    .from("students")
    .select("ayt_alan, classes(seviye), schools(tur)")
    .eq("id", studentId)
    .single();
  type Row = { ayt_alan: AytAlan; classes: { seviye: string } | null; schools: { tur: string } | null };
  const s = data as unknown as Row | null;
  if (!s) return [];
  const dokuzOnMu = dokuzOnSinifMi(s.classes?.seviye ?? null);
  const dershaneMi = s.schools?.tur === "dershane";
  return konuHakimiyetiGetir(supabase, studentId, s.classes?.seviye ?? null, s.ayt_alan, dokuzOnMu, dershaneMi);
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
