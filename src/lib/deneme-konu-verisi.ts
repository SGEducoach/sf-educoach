import type { SupabaseClient } from "@supabase/supabase-js";
import { denemeAnahtari, konuAnaliziOzetle, type KazanimSatiriGirdi, type KonuAnaliziOzeti } from "@/lib/deneme-konu-analizi";

// Deneme konu analizi için veri (bkz. deneme-konu-analizi.ts). Önce
// öğrencilerin denemeleri, sonra yalnızca son N denemenin (tarih + tür +
// yayınevi) konu satırları çekilir — okul geneli yüzlerce öğrenci × onlarca
// konu satırı olabildiği için sorgular sayfalı (PostgREST 1000 satır sınırı).
const SAYFA = 1000;
const ID_PARCASI = 150;

type Deneme = { id: string; student_id: string; tarih: string; tur: string; yayinevi: string | null };
type KazanimRow = { deneme_id: string; ders: string; kazanim_metni: string; soru: number; dogru: number; yanlis: number };

async function hepsiniCek<T>(sorgu: (bas: number, son: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<{ error: string | null; satirlar: T[] }> {
  const satirlar: T[] = [];
  for (let bas = 0; ; bas += SAYFA) {
    const { data, error } = await sorgu(bas, bas + SAYFA - 1);
    if (error) return { error: error.message, satirlar };
    const parca = (data as T[]) ?? [];
    satirlar.push(...parca);
    if (parca.length < SAYFA) return { error: null, satirlar };
  }
}

export async function denemeKonuAnaliziGetir(
  supabase: SupabaseClient,
  studentIds: string[],
  sonDenemeSayisi: number,
): Promise<{ error: string | null; ozet: KonuAnaliziOzeti }> {
  const bos: KonuAnaliziOzeti = { denemeler: [], tumu: [], denemeBazli: {} };
  if (studentIds.length === 0) return { error: null, ozet: bos };

  const denemeler: Deneme[] = [];
  for (let i = 0; i < studentIds.length; i += ID_PARCASI) {
    const parca = studentIds.slice(i, i + ID_PARCASI);
    const { error, satirlar } = await hepsiniCek<Deneme>((bas, son) => supabase.from("denemeler")
      .select("id, student_id, tarih, tur, yayinevi").in("student_id", parca)
      .order("tarih", { ascending: false }).order("id").range(bas, son));
    if (error) return { error, ozet: bos };
    denemeler.push(...satirlar);
  }

  const denemeBilgisi = new Map(denemeler.map((d) => [d.id, d]));
  const anahtar = (d: Deneme) => denemeAnahtari({ tarih: d.tarih, tur: d.tur, yayinevi: d.yayinevi ?? "" });
  const sonAnahtarlar = new Set([...new Set(
    [...denemeler].sort((a, b) => b.tarih.localeCompare(a.tarih)).map(anahtar),
  )].slice(0, sonDenemeSayisi));
  const hedefIdler = denemeler.filter((d) => sonAnahtarlar.has(anahtar(d))).map((d) => d.id);

  const satirlar: KazanimSatiriGirdi[] = [];
  for (let i = 0; i < hedefIdler.length; i += ID_PARCASI) {
    const parca = hedefIdler.slice(i, i + ID_PARCASI);
    const { error, satirlar: kazanimlar } = await hepsiniCek<KazanimRow>((bas, son) => supabase.from("deneme_kazanim_sonuclari")
      .select("deneme_id, ders, kazanim_metni, soru, dogru, yanlis").in("deneme_id", parca)
      .order("id").range(bas, son));
    if (error) return { error, ozet: bos };
    for (const k of kazanimlar) {
      const d = denemeBilgisi.get(k.deneme_id);
      if (!d) continue;
      satirlar.push({
        denemeId: d.id, studentId: d.student_id, tarih: d.tarih, tur: d.tur, yayinevi: d.yayinevi ?? "",
        ders: k.ders, kazanimMetni: k.kazanim_metni, soru: k.soru, dogru: k.dogru, yanlis: k.yanlis,
      });
    }
  }
  return { error: null, ozet: konuAnaliziOzetle(satirlar) };
}
