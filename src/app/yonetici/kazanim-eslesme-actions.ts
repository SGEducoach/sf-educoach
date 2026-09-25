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
import { kazanimDersiniKanoniklestir, konuOnerisi, type KonuAdayi } from "@/lib/kazanim-konu-oneri";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { supabase, user, admin: createAdminClient() };
}

export interface KazanimEslesmeSatiri {
  ders: string;
  kazanimMetni: string;
  // Bu metnin geçtiği sonuç satırı sayısı (kaç öğrenci × deneme).
  satirSayisi: number;
  oneri: { konu: string; puan: number } | null;
  mevcutKonu: string | null;
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

export async function kazanimEslesmeVerisiGetir(): Promise<KazanimEslesmeVerisi> {
  const { admin } = await requireAdmin();
  const sayac = new Map<string, { ders: string; kazanimMetni: string; satirSayisi: number }>();
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await admin.from("deneme_kazanim_sonuclari")
      .select("ders, kazanim_metni").order("id").range(bas, bas + 999);
    if (error) return { error: error.message, satirlar: [], adaylar: {} };
    for (const r of (data as { ders: string; kazanim_metni: string }[]) ?? []) {
      const ders = kazanimDersiniKanoniklestir(r.ders);
      if (!ders) continue;
      const anahtar = `${ders}|${r.kazanim_metni}`;
      const mevcut = sayac.get(anahtar) ?? { ders, kazanimMetni: r.kazanim_metni, satirSayisi: 0 };
      mevcut.satirSayisi++;
      sayac.set(anahtar, mevcut);
    }
    if ((data ?? []).length < 1000) break;
  }

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
