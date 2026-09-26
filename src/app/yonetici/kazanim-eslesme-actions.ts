"use server";

// Deneme konu eşleştirme (kullanıcı isteği, 25.09.2026) — karnelerden gelen
// yayınevi konu/kazanım metinlerini müfredat konularına bağlar
// (kazanim_konu_eslesmeleri, migration 0063). Bu eşleşme Analiz Motoru'nun
// konu hakimiyeti "ölçüm" sinyaline deneme sonuçlarını ekler (bkz.
// konu-hakimiyeti.ts). requireAdmin() pdf-eslesme-actions.ts'teki gerekçeyle
// burada da yeniden tanımlı.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import { kazanimDersiniKanoniklestir, konuOnerileri, konuOnerisi, type KonuAdayi } from "@/lib/kazanim-konu-oneri";
import { kazanimSorulariniCikar, type OgrenciKarneVerisi } from "@/lib/kazanim-soru-cikarimi";
import type { KarneDersOrtalamasi, KarneTestCevaplari } from "@/lib/karne-birinci-sayfa";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { supabase, user, admin: createAdminClient() };
}

export interface KazanimSoruBilgisi {
  deneme: string;
  kitapcik: string | null;
  test: string;
  soruSayisi: number;
  sorular: number[];
  kesin: boolean;
}

export interface KazanimEslesmeSatiri {
  ders: string;
  kazanimMetni: string;
  // Bu metnin geçtiği sonuç satırı sayısı (kaç öğrenci × deneme).
  satirSayisi: number;
  oneri: { konu: string; puan: number } | null;
  // Güçlü öneri çıkmayanlar için sıralı zayıf adaylar (kullanıcı isteği
  // 25.09.2026: eşleşmeyenlere de aday gösterilsin). Seçili GELMEZ; tıklanınca
  // yalnızca seçiciye yazılır.
  zayifOneriler: { konu: string; puan: number }[];
  mevcutKonu: string | null;
  // Karnedeki soru soru cevaplardan çıkarılan soru numaraları (kullanıcı
  // isteği 25.09.2026) — bkz. kazanim-soru-cikarimi.ts.
  sorular: KazanimSoruBilgisi[];
}

export interface KazanimEslesmeVerisi {
  error: string | null;
  satirlar: KazanimEslesmeSatiri[];
  adaylar: Record<string, KonuAdayi[]>;
}

async function mufredatAdaylari(admin: ReturnType<typeof createAdminClient>): Promise<Record<string, KonuAdayi[]>> {
  const { data: altKonular } = await admin.from("mufredat_alt_konular").select("ders, ust_konu, alt_baslik").order("sira");
  const adaylar: Record<string, KonuAdayi[]> = {};
  const ekle = (ders: string, aday: KonuAdayi) => {
    const liste = (adaylar[ders] ??= []);
    if (!liste.some((a) => a.konu === aday.konu)) liste.push(aday);
  };
  for (const k of MUFREDAT_KONULARI) ekle(k.ders, { konu: k.konu, etiket: k.konu });
  for (const a of (altKonular as { ders: string; ust_konu: string; alt_baslik: string }[]) ?? []) {
    ekle(a.ders, { konu: a.alt_baslik, etiket: `${a.ust_konu} › ${a.alt_baslik}` });
  }
  return adaylar;
}

type KazanimRow = { deneme_id: string; ders: string; kazanim_metni: string; soru: number; dogru: number; yanlis: number };

async function sayfaSayfaCek<T>(sorgu: (bas: number, son: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<{ error: string | null; satirlar: T[] }> {
  const satirlar: T[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await sorgu(bas, bas + 999);
    if (error) return { error: error.message, satirlar };
    satirlar.push(...((data as T[]) ?? []));
    if (((data as T[]) ?? []).length < 1000) return { error: null, satirlar };
  }
}

// Karnesi (deneme_karne_ozetleri) olan denemelerde her konunun hangi soru(lar)
// olduğunu çıkarır. Anahtar: "<müfredat dersi>|<kazanım metni>".
async function soruBilgileriniCikar(
  admin: ReturnType<typeof createAdminClient>, kazanimlar: KazanimRow[],
): Promise<Map<string, KazanimSoruBilgisi[]>> {
  const sonuc = new Map<string, KazanimSoruBilgisi[]>();
  const { error, satirlar: karneler } = await sayfaSayfaCek<{ deneme_id: string; ders_ortalamalari: KarneDersOrtalamasi[]; cevaplar: KarneTestCevaplari[] }>(
    (bas, son) => admin.from("deneme_karne_ozetleri").select("deneme_id, ders_ortalamalari, cevaplar").order("deneme_id").range(bas, son));
  if (error || karneler.length === 0) return sonuc; // migration yoksa ya da karne yoksa soru bilgisi yok
  const karneMap = new Map(karneler.map((k) => [k.deneme_id, k]));

  const denemeIdleri = [...karneMap.keys()];
  const denemeBilgisi = new Map<string, { student_id: string; tarih: string; tur: string; yayinevi: string | null }>();
  for (let i = 0; i < denemeIdleri.length; i += 150) {
    const { data } = await admin.from("denemeler").select("id, student_id, tarih, tur, yayinevi").in("id", denemeIdleri.slice(i, i + 150));
    for (const d of (data as { id: string; student_id: string; tarih: string; tur: string; yayinevi: string | null }[]) ?? []) denemeBilgisi.set(d.id, d);
  }

  // Aynı deneme (tarih + tür + yayınevi) altındaki öğrencileri grupla.
  const gruplar = new Map<string, { etiket: string; ogrenciler: Map<string, OgrenciKarneVerisi> }>();
  for (const k of kazanimlar) {
    const karne = karneMap.get(k.deneme_id);
    const d = denemeBilgisi.get(k.deneme_id);
    if (!karne || !d) continue;
    const grupAnahtari = `${d.tarih}|${d.tur}|${(d.yayinevi ?? "").toLocaleUpperCase("tr-TR")}`;
    const [y, a, g] = d.tarih.split("-");
    const grup = gruplar.get(grupAnahtari) ?? { etiket: `${g}.${a}.${y} · ${d.tur} · ${d.yayinevi ?? ""}`, ogrenciler: new Map() };
    const ogr = grup.ogrenciler.get(k.deneme_id)
      ?? { ogrenciId: d.student_id, dersler: karne.ders_ortalamalari ?? [], testler: karne.cevaplar ?? [], kazanimlar: [] };
    ogr.kazanimlar.push({ ders: k.ders, kazanimMetni: k.kazanim_metni, soru: k.soru, dogru: k.dogru, yanlis: k.yanlis });
    grup.ogrenciler.set(k.deneme_id, ogr);
    gruplar.set(grupAnahtari, grup);
  }

  for (const grup of gruplar.values()) {
    for (const s of kazanimSorulariniCikar([...grup.ogrenciler.values()])) {
      const ders = kazanimDersiniKanoniklestir(s.ders);
      if (!ders) continue;
      const anahtar = `${ders}|${s.kazanimMetni}`;
      sonuc.set(anahtar, [...(sonuc.get(anahtar) ?? []), { deneme: grup.etiket, kitapcik: s.kitapcik, test: s.test, soruSayisi: s.soruSayisi, sorular: s.sorular, kesin: s.kesin }]);
    }
  }
  return sonuc;
}

export async function kazanimEslesmeVerisiGetir(): Promise<KazanimEslesmeVerisi> {
  const { admin } = await requireAdmin();
  const sayac = new Map<string, { ders: string; kazanimMetni: string; satirSayisi: number }>();
  const { error: kazanimHatasi, satirlar: kazanimlar } = await sayfaSayfaCek<KazanimRow>((bas, son) => admin.from("deneme_kazanim_sonuclari")
    .select("deneme_id, ders, kazanim_metni, soru, dogru, yanlis").order("id").range(bas, son));
  if (kazanimHatasi) return { error: kazanimHatasi, satirlar: [], adaylar: {} };
  for (const r of kazanimlar) {
    const ders = kazanimDersiniKanoniklestir(r.ders);
    if (!ders) continue;
    const anahtar = `${ders}|${r.kazanim_metni}`;
    const mevcut = sayac.get(anahtar) ?? { ders, kazanimMetni: r.kazanim_metni, satirSayisi: 0 };
    mevcut.satirSayisi++;
    sayac.set(anahtar, mevcut);
  }
  const soruBilgileri = await soruBilgileriniCikar(admin, kazanimlar);

  const [{ data: eslesmeler, error: eslesmeHatasi }, adaylar] = await Promise.all([
    admin.from("kazanim_konu_eslesmeleri").select("ders, kazanim_metni, konu"),
    mufredatAdaylari(admin),
  ]);
  if (eslesmeHatasi) return { error: eslesmeHatasi.message, satirlar: [], adaylar: {} };
  const eslesmeMap = new Map(((eslesmeler as { ders: string; kazanim_metni: string; konu: string }[]) ?? [])
    .map((e) => [`${e.ders}|${e.kazanim_metni}`, e.konu]));

  const satirlar = [...sayac.entries()].map(([anahtar, s]) => ({
    ...s,
    mevcutKonu: eslesmeMap.get(anahtar) ?? null,
    oneri: konuOnerisi(s.kazanimMetni, adaylar[s.ders] ?? []),
    zayifOneriler: konuOnerileri(s.kazanimMetni, adaylar[s.ders] ?? []),
    sorular: soruBilgileri.get(anahtar) ?? [],
  }))
    // Önce eşleştirilmemişler, sonra ders ve sık geçen önce.
    .sort((a, b) => Number(a.mevcutKonu !== null) - Number(b.mevcutKonu !== null)
      || a.ders.localeCompare(b.ders, "tr") || b.satirSayisi - a.satirSayisi);
  return { error: null, satirlar, adaylar };
}

export async function kazanimEslesmeKaydet(
  kayitlar: { ders: string; kazanimMetni: string; konu: string }[],
): Promise<{ error: string | null; kaydedilen: number }> {
  const { user, admin } = await requireAdmin();
  const adaylar = await mufredatAdaylari(admin);
  // Yalnızca müfredatta gerçekten olan konular kaydedilir.
  const gecerli = kayitlar.filter((k) => (adaylar[k.ders] ?? []).some((a) => a.konu === k.konu) && k.kazanimMetni.trim());
  if (gecerli.length === 0) return { error: "Kaydedilecek geçerli eşleşme yok.", kaydedilen: 0 };
  const { error } = await admin.from("kazanim_konu_eslesmeleri").upsert(
    gecerli.map((k) => ({ ders: k.ders, kazanim_metni: k.kazanimMetni, konu: k.konu, created_by: user.id })),
    { onConflict: "ders,kazanim_metni" },
  );
  if (error) return { error: error.message, kaydedilen: 0 };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "kazanim_konu_eslesme_kaydet", detay: { adet: gecerli.length } });
  revalidatePath("/yonetici", "layout");
  revalidatePath("/dashboard");
  return { error: null, kaydedilen: gecerli.length };
}

export async function kazanimEslesmeSil(ders: string, kazanimMetni: string): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  const { error } = await admin.from("kazanim_konu_eslesmeleri").delete().eq("ders", ders).eq("kazanim_metni", kazanimMetni);
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "kazanim_konu_eslesme_sil", detay: { ders, kazanim_metni: kazanimMetni } });
  revalidatePath("/yonetici", "layout");
  revalidatePath("/dashboard");
  return { error: null };
}
