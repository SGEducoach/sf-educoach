"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import { konuHedefiniBul } from "@/lib/konu-ad-eslesmesi";
import type { KonuAdEslesmesi, KonuHedefi } from "@/lib/konu-ad-eslesmesi";
import { konuOnerileri } from "@/lib/kazanim-konu-oneri";
import { BRANS_DENEMESI_KONUSU } from "@/lib/types";

async function adminGerekli() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") redirect("/");
  return { user, admin: createAdminClient() };
}

type AdminClient = ReturnType<typeof createAdminClient>;
type KaynakSatiri = { ders: string; konu: string | null };

async function tumKaynaklariGetir(
  admin: AdminClient, tablo: "konu_calismalar" | "soru_cozumleri",
): Promise<{ satirlar: KaynakSatiri[]; error: string | null }> {
  const satirlar: KaynakSatiri[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await admin.from(tablo).select("ders, konu").order("id").range(bas, bas + 999);
    if (error) return { satirlar: [], error: error.message };
    satirlar.push(...((data as KaynakSatiri[]) ?? []));
    if ((data ?? []).length < 1000) return { satirlar, error: null };
  }
}

async function hedefleriGetir(admin: AdminClient): Promise<{ hedefler: KonuHedefi[]; error: string | null }> {
  const { data, error } = await admin.from("mufredat_alt_konular").select("ders, ust_konu, alt_baslik").order("sira");
  if (error) return { hedefler: [], error: error.message };
  const altMap = new Map<string, string[]>();
  for (const r of (data as { ders: string; ust_konu: string; alt_baslik: string }[]) ?? []) {
    const anahtar = `${r.ders}|${r.ust_konu}`;
    altMap.set(anahtar, [...(altMap.get(anahtar) ?? []), r.alt_baslik]);
  }
  const hedefler: KonuHedefi[] = [];
  for (const k of MUFREDAT_KONULARI) {
    for (const konu of altMap.get(`${k.ders}|${k.konu}`) ?? [k.konu]) {
      if (!hedefler.some((h) => h.ders === k.ders && h.konu === konu))
        hedefler.push({ ders: k.ders, konu, ustKonu: k.konu });
    }
  }
  return { hedefler, error: null };
}

export interface KonuAdIncelemeSatiri {
  ders: string;
  kaynakKonu: string;
  calismaSayisi: number;
  soruSayisi: number;
  hedefKonu: string | null;
  durum: "dogrudan" | "yonetici" | "belirsiz" | "yok";
  oneriler: { konu: string; etiket: string }[];
}

export async function konuAdIncelemeVerisiGetir(): Promise<{
  error: string | null;
  satirlar: KonuAdIncelemeSatiri[];
  hedefler: KonuHedefi[];
}> {
  const { admin } = await adminGerekli();
  const [calismalar, sorular, hedefSonucu, eslesmeSonucu] = await Promise.all([
    tumKaynaklariGetir(admin, "konu_calismalar"),
    tumKaynaklariGetir(admin, "soru_cozumleri"),
    hedefleriGetir(admin),
    admin.from("konu_ad_eslesmeleri").select("ders, kaynak_konu, hedef_konu"),
  ]);
  const error = calismalar.error ?? sorular.error ?? hedefSonucu.error ?? eslesmeSonucu.error?.message ?? null;
  if (error) return { error, satirlar: [], hedefler: [] };
  const hedefler = hedefSonucu.hedefler;
  const eslesmeler = (eslesmeSonucu.data as KonuAdEslesmesi[]) ?? [];
  const sayac = new Map<string, KonuAdIncelemeSatiri>();
  for (const [tur, liste] of [["calisma", calismalar.satirlar], ["soru", sorular.satirlar]] as const) {
    for (const r of liste) {
      if (!r.konu?.trim() || r.konu.trim() === BRANS_DENEMESI_KONUSU) continue;
      const anahtar = `${r.ders}|${r.konu}`;
      const s = sayac.get(anahtar) ?? {
        ders: r.ders, kaynakKonu: r.konu, calismaSayisi: 0, soruSayisi: 0,
        hedefKonu: null, durum: "yok" as const, oneriler: [],
      };
      if (tur === "calisma") s.calismaSayisi++;
      else s.soruSayisi++;
      sayac.set(anahtar, s);
    }
  }
  const satirlar = [...sayac.values()].map((s) => {
    const eslesme = konuHedefiniBul(s.ders, s.kaynakKonu, hedefler, eslesmeler);
    const adaylar = hedefler.filter((h) => h.ders === s.ders).map((h) => ({ konu: h.konu, etiket: h.ustKonu === h.konu ? h.konu : `${h.ustKonu} › ${h.konu}` }));
    const oneriler = eslesme.hedef ? [] : konuOnerileri(s.kaynakKonu, adaylar, 3, 0.35)
      .map((o) => adaylar.find((a) => a.konu === o.konu))
      .filter((a): a is { konu: string; etiket: string } => Boolean(a));
    return { ...s, hedefKonu: eslesme.hedef?.konu ?? null, durum: eslesme.yol, oneriler };
  }).sort((a, b) => Number(a.hedefKonu !== null) - Number(b.hedefKonu !== null)
    || b.calismaSayisi + b.soruSayisi - a.calismaSayisi - a.soruSayisi);
  return { error: null, satirlar, hedefler };
}

export async function konuAdEslesmesiKaydet(input: {
  ders: string; kaynakKonu: string; hedefKonu: string;
}): Promise<{ error: string | null }> {
  const { user, admin } = await adminGerekli();
  const { hedefler, error: hedefHatasi } = await hedefleriGetir(admin);
  if (hedefHatasi) return { error: hedefHatasi };
  if (!input.kaynakKonu.trim() || input.kaynakKonu.trim() === BRANS_DENEMESI_KONUSU
    || !hedefler.some((h) => h.ders === input.ders && h.konu === input.hedefKonu))
    return { error: "Geçerli bir müfredat alt konusu seçin." };
  const { error } = await admin.from("konu_ad_eslesmeleri").upsert({
    ders: input.ders, kaynak_konu: input.kaynakKonu.trim(), hedef_konu: input.hedefKonu,
    created_by: user.id,
  }, { onConflict: "ders,kaynak_konu" });
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({
    actor_id: user.id, eylem: "konu_ad_eslesmesi_kaydet",
    detay: { ders: input.ders, kaynak_konu: input.kaynakKonu, hedef_konu: input.hedefKonu },
  });
  revalidatePath("/yonetici", "layout");
  revalidatePath("/dashboard");
  return { error: null };
}
