"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { veriHatasiCevir } from "@/lib/veri-hata-mesaji";

type Sonuc = { error: string | null };

async function ogretmenOturumu() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profil }, { data: ogretmen }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("teachers").select("school_id").eq("id", user.id).maybeSingle(),
  ]);
  if (!(["ogretmen", "mudur"].includes(profil?.role ?? "")) || !ogretmen?.school_id) return null;
  return { supabase, userId: user.id, schoolId: ogretmen.school_id as string };
}

async function dersDogrula(oturum: NonNullable<Awaited<ReturnType<typeof ogretmenOturumu>>>, dersId: string) {
  const { data: ders } = await oturum.supabase.from("ortaokul_mufredat_dersleri")
    .select("id, sinif_seviyesi, surum_id").eq("id", dersId).maybeSingle();
  if (!ders || !["5", "6", "7", "8"].includes(ders.sinif_seviyesi)) return false;
  const { data: surum } = await oturum.supabase.from("ortaokul_mufredat_surumleri")
    .select("id").eq("id", ders.surum_id).eq("durum", "aktif").maybeSingle();
  return !!surum;
}

async function temaDogrula(oturum: NonNullable<Awaited<ReturnType<typeof ogretmenOturumu>>>, temaId: string) {
  const { data: tema } = await oturum.supabase.from("ortaokul_mufredat_temalari")
    .select("id, ders_id, school_id").eq("id", temaId).maybeSingle();
  if (!tema || (tema.school_id && tema.school_id !== oturum.schoolId)) return false;
  return dersDogrula(oturum, tema.ders_id);
}

export async function sinavaDogruKonuEkle(dersId: string, adGirdisi: string): Promise<Sonuc> {
  const oturum = await ogretmenOturumu();
  if (!oturum) return { error: "Bu işlem yalnızca kurum öğretmenine açıktır." };
  const ad = String(adGirdisi ?? "").trim();
  if (ad.length < 2 || ad.length > 120) return { error: "Konu adı 2–120 karakter olmalı." };
  if (!await dersDogrula(oturum, dersId)) return { error: "Geçerli bir ortaokul dersi seçin." };

  const { error } = await oturum.supabase.from("ortaokul_mufredat_temalari").insert({
    ders_id: dersId, kod: `KRM-${crypto.randomUUID()}`, ad,
    school_id: oturum.schoolId, sinava_dogru_eklemesi: true, tur: "tema", sira: 9999,
  });
  if (error) return { error: veriHatasiCevir(error.message) };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function sinavaDogruKonuDuzenle(
  temaId: string,
  degisiklik: { ad?: string; aktif?: boolean },
): Promise<Sonuc> {
  const oturum = await ogretmenOturumu();
  if (!oturum) return { error: "Bu işlem yalnızca kurum öğretmenine açıktır." };
  if (!await temaDogrula(oturum, temaId)) return { error: "Bu konu kurumunuza ait değil." };
  if (degisiklik.ad === undefined && degisiklik.aktif === undefined) return { error: "Değişiklik belirtilmedi." };
  const ad = degisiklik.ad === undefined ? undefined : String(degisiklik.ad).trim();
  if (ad !== undefined && (ad.length < 2 || ad.length > 120)) return { error: "Konu adı 2–120 karakter olmalı." };

  const { data: mevcut } = await oturum.supabase.from("ortaokul_sinava_dogru_konu_duzenlemeleri")
    .select("ad, aktif").eq("school_id", oturum.schoolId).eq("tema_id", temaId).maybeSingle();
  const { error } = await oturum.supabase.from("ortaokul_sinava_dogru_konu_duzenlemeleri").upsert({
    school_id: oturum.schoolId, tema_id: temaId,
    ad: ad === undefined ? (mevcut?.ad ?? null) : ad,
    aktif: degisiklik.aktif ?? mevcut?.aktif ?? true,
    guncelleyen_id: oturum.userId,
  }, { onConflict: "school_id,tema_id" });
  if (error) return { error: veriHatasiCevir(error.message) };
  revalidatePath("/dashboard");
  return { error: null };
}
