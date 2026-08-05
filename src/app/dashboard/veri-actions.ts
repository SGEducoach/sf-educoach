"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { HedefeYakinlik, VeriGirisSikligi, VerimlilikDuzeyi } from "@/lib/types";

async function requireStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function verimlilikSorulsunMu(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
): Promise<boolean> {
  const [{ data: sayi }, { data: student }] = await Promise.all([
    supabase.rpc("ogrenci_giris_sayisi", { p_student_id: studentId }),
    supabase.from("students").select("veri_giris_sikligi").eq("id", studentId).single(),
  ]);
  const count = (sayi as number) ?? 0;
  const siklik = (student?.veri_giris_sikligi as VeriGirisSikligi) ?? "haftalik";
  if (count === 0) return false;
  if (siklik === "gunluk") return count % 7 === 0;
  if (siklik === "3gunluk") return count % 3 === 0;
  return true; // haftalik: her girişte
}

export async function konuCalismaEkle(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const ders = String(formData.get("ders"));
  const konu = String(formData.get("konu") ?? "").trim();
  const sureDakika = Number(formData.get("sureDakika"));
  const hedefeYakinlik = String(formData.get("hedefeYakinlik")) as HedefeYakinlik;

  if (!ders || !konu || !sureDakika || sureDakika <= 0 || !hedefeYakinlik) {
    return { error: "Lütfen tüm alanları doldurun.", verimlilikSorulsunMu: false };
  }

  const { error } = await supabase.from("konu_calismalar").insert({
    student_id: user.id, ders, konu, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik,
  });
  if (error) return { error: error.message, verimlilikSorulsunMu: false };

  const sorulsunMu = await verimlilikSorulsunMu(supabase, user.id);
  revalidatePath("/dashboard");
  return { error: null, verimlilikSorulsunMu: sorulsunMu };
}

export async function soruCozumuEkle(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const ders = String(formData.get("ders"));
  const dogru = Number(formData.get("dogru"));
  const yanlis = Number(formData.get("yanlis"));
  const sureDakika = Number(formData.get("sureDakika"));
  const hedefeYakinlik = String(formData.get("hedefeYakinlik")) as HedefeYakinlik;

  if (!ders || Number.isNaN(dogru) || Number.isNaN(yanlis) || !sureDakika || sureDakika <= 0 || !hedefeYakinlik) {
    return { error: "Lütfen tüm alanları doldurun.", verimlilikSorulsunMu: false };
  }

  const { error } = await supabase.from("soru_cozumleri").insert({
    student_id: user.id, ders, dogru, yanlis, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik,
  });
  if (error) return { error: error.message, verimlilikSorulsunMu: false };

  const sorulsunMu = await verimlilikSorulsunMu(supabase, user.id);
  revalidatePath("/dashboard");
  return { error: null, verimlilikSorulsunMu: sorulsunMu };
}

export async function denemeEkle(
  tur: "TYT" | "AYT",
  sureDakika: number,
  hedefeYakinlik: HedefeYakinlik,
  dersSonuclari: { ders: string; dogru: number; yanlis: number }[],
) {
  const { supabase, user } = await requireStudent();

  if (!sureDakika || sureDakika <= 0 || !hedefeYakinlik || dersSonuclari.length === 0) {
    return { error: "Lütfen tüm alanları doldurun.", verimlilikSorulsunMu: false };
  }

  const { data: deneme, error } = await supabase
    .from("denemeler")
    .insert({ student_id: user.id, tur, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik, kaynak: "ogrenci" })
    .select("id")
    .single();

  if (error || !deneme) return { error: error?.message ?? "Deneme kaydedilemedi.", verimlilikSorulsunMu: false };

  const { error: sonucError } = await supabase.from("deneme_ders_sonuclari").insert(
    dersSonuclari.map((d) => ({ deneme_id: deneme.id, ders: d.ders, dogru: d.dogru, yanlis: d.yanlis }))
  );
  if (sonucError) return { error: sonucError.message, verimlilikSorulsunMu: false };

  const sorulsunMu = await verimlilikSorulsunMu(supabase, user.id);
  revalidatePath("/dashboard");
  return { error: null, verimlilikSorulsunMu: sorulsunMu };
}

export async function haftalikVerimlilikEkle(duzey: VerimlilikDuzeyi) {
  const { supabase, user } = await requireStudent();
  const { error } = await supabase.from("haftalik_verimlilikler").insert({ student_id: user.id, duzey });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function veriGirisSikligiGuncelle(siklik: VeriGirisSikligi) {
  const { supabase, user } = await requireStudent();
  const { error } = await supabase.from("students").update({ veri_giris_sikligi: siklik }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}
