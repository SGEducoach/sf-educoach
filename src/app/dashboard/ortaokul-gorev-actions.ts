"use server";

// Ortaokul görev teslimi: "tamamlandı işareti" (tasarım belgesi §8.4 —
// teslim türleri arasında en sadesi, Faz 1'de yalnız bu var).
//
// NEDEN AYRI BİR EYLEM: lise tarafında bir görev, karşılığı olan veri girişi
// yapıldığında kapanıyor (bkz. veri-actions.ts gorevTamamlaIsaretle). Ortaokul
// panelinde YKS veri girişi ekranı hiç yok, dolayısıyla o yol kapalı. Bu
// eylem yalnız ORTAOKUL öğrencisine açık — aksi hâlde lise öğrencisi veri
// girmeden görevini "yaptım" diye kapatabilirdi.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { panelKademesi } from "@/lib/ortaokul-ayar";
import { veriHatasiCevir } from "@/lib/veri-hata-mesaji";

async function ortaokulOgrencisi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: ogrenci } = await supabase.from("students").select("classes(seviye)").eq("id", user.id).maybeSingle();
  // Gömülü ilişki çalışma anında NESNE döner (bkz. proje notu).
  const sinif = (ogrenci as unknown as { classes: { seviye: string } | null } | null)?.classes;
  const kademe = await panelKademesi(supabase, profile?.role ?? "", sinif?.seviye);
  return { supabase, userId: user.id, kademe };
}

async function durumYaz(atamaId: string, durum: "tamamlandi" | "bekliyor"): Promise<{ error: string | null }> {
  const { supabase, userId, kademe } = await ortaokulOgrencisi();
  if (kademe !== "ortaokul") return { error: "Bu işlem sana açık değil." };

  // `.eq("student_id", userId)` RLS'in üstüne ikinci bir kemer: politika da
  // yalnız kendi atamasını güncellemeye izin veriyor.
  const { error, count } = await supabase
    .from("gorev_atamalari")
    .update({ durum }, { count: "exact" })
    .eq("id", atamaId)
    .eq("student_id", userId);

  if (error) return { error: veriHatasiCevir(error.message) };
  if (!count) return { error: "Bu görev bulunamadı." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/gorevler");
  revalidatePath("/dashboard/planlar");
  return { error: null };
}

export async function ortaokulGoreviTamamla(atamaId: string) {
  return durumYaz(atamaId, "tamamlandi");
}

// Yanlışlıkla işaretleyen öğrenci geri alabilsin. Öğretmen onayı gereken
// teslim türleri Faz 2'de gelecek; o zaman geri alma onaydan sonra kapanır.
export async function ortaokulGoreviGeriAl(atamaId: string) {
  return durumYaz(atamaId, "bekliyor");
}
