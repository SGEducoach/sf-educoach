"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OGRENME_SEKLI_LISTESI } from "@/lib/types";
import type { HedefeYakinlik, OgrenmeSekli, TekrarDurumu } from "@/lib/types";

async function requireStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const GECERLI_TEKRAR_DURUMU = new Set<TekrarDurumu>(["tekrar_edebilirim", "yuzeysel_bakarim", "gerek_yok"]);

function girdiDogrula(input: {
  hakimiyetSeviyesi: HedefeYakinlik; ogrenmeSekli: OgrenmeSekli[]; tekrarDurumu: TekrarDurumu;
}): string | null {
  if (!["uzak", "belirsiz", "yakin"].includes(input.hakimiyetSeviyesi)) return "Hakimiyet seviyesi geçersiz.";
  if (!input.ogrenmeSekli.every((s) => OGRENME_SEKLI_LISTESI.includes(s))) return "Öğrenme şekli geçersiz.";
  if (!GECERLI_TEKRAR_DURUMU.has(input.tekrarDurumu)) return "Tekrar durumu geçersiz.";
  return null;
}

// Tek bir konuyu işaretler/günceller — Konu Hakimiyeti ekranındaki
// satır-genişletme formunun "Kaydet"i.
export async function konuHakimiyetiKaydet(input: {
  ders: string; konu: string; hakimiyetSeviyesi: HedefeYakinlik;
  ogrenmeSekli: OgrenmeSekli[]; tekrarDurumu: TekrarDurumu;
}): Promise<{ error: string | null }> {
  const { supabase, user } = await requireStudent();
  const ders = input.ders.trim();
  const konu = input.konu.trim();
  if (!ders || !konu) return { error: "Ders/konu geçersiz." };
  const hataVarMi = girdiDogrula(input);
  if (hataVarMi) return { error: hataVarMi };

  const { error } = await supabase.from("ogrenci_konu_hakimiyeti").upsert(
    {
      student_id: user.id, ders, konu,
      hakimiyet_seviyesi: input.hakimiyetSeviyesi,
      ogrenme_sekli: input.ogrenmeSekli,
      tekrar_durumu: input.tekrarDurumu,
      guncellenme_tarihi: new Date().toISOString(),
    },
    { onConflict: "student_id,ders,konu" },
  );
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

// Bir üst başlığın altındaki TÜM alt konuları tek seferde aynı seviyeyle
// işaretler ("Hepsini [seviye] yap" — Faz H2 toplu işaretleme).
export async function konuHakimiyetiTopluKaydet(input: {
  ders: string; konular: string[]; hakimiyetSeviyesi: HedefeYakinlik;
  ogrenmeSekli: OgrenmeSekli[]; tekrarDurumu: TekrarDurumu;
}): Promise<{ error: string | null }> {
  const { supabase, user } = await requireStudent();
  const ders = input.ders.trim();
  const konular = input.konular.map((k) => k.trim()).filter(Boolean);
  if (!ders || konular.length === 0) return { error: "Ders/konu listesi geçersiz." };
  const hataVarMi = girdiDogrula(input);
  if (hataVarMi) return { error: hataVarMi };

  const simdi = new Date().toISOString();
  const satirlar = konular.map((konu) => ({
    student_id: user.id, ders, konu,
    hakimiyet_seviyesi: input.hakimiyetSeviyesi,
    ogrenme_sekli: input.ogrenmeSekli,
    tekrar_durumu: input.tekrarDurumu,
    guncellenme_tarihi: simdi,
  }));
  const { error } = await supabase.from("ogrenci_konu_hakimiyeti").upsert(satirlar, { onConflict: "student_id,ders,konu" });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}
