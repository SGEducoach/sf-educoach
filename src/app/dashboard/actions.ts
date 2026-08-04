"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function denemeEkle(studentId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const tarih = String(formData.get("tarih"));
  const tytNet = Number(formData.get("tytNet"));
  const aytNet = Number(formData.get("aytNet"));
  const puan = Number(formData.get("puan"));

  if (!tarih || Number.isNaN(tytNet) || Number.isNaN(aytNet) || Number.isNaN(puan)) {
    return { error: "Lütfen tüm alanları doldurun." };
  }

  const { error } = await supabase.from("exams").insert({
    student_id: studentId,
    tarih,
    tyt_net: tytNet,
    ayt_net: aytNet,
    puan,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function calismaEkle(studentId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const tarih = String(formData.get("tarih"));
  const ders = String(formData.get("ders"));
  const dakika = Number(formData.get("dakika"));

  if (!tarih || !ders || Number.isNaN(dakika) || dakika <= 0) {
    return { error: "Lütfen tüm alanları doldurun." };
  }

  const { error } = await supabase.from("study_sessions").insert({
    student_id: studentId,
    tarih,
    ders,
    dakika,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function bildirimEkle(studentId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const mesaj = String(formData.get("mesaj") ?? "").trim();
  const tip = String(formData.get("tip") ?? "bilgi");

  if (!mesaj) return { error: "Mesaj boş olamaz." };

  const { error } = await supabase.from("notifications").insert({
    student_id: studentId,
    author_id: user.id,
    tip,
    mesaj,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function ogrenciBagla(kind: "coach" | "parent", email: string) {
  const { supabase, user } = await requireUser();

  const { data: bulunan, error: bulmaHatasi } = await supabase
    .rpc("find_student_by_email", { p_email: email.trim() })
    .single();

  if (bulmaHatasi || !bulunan) {
    return { error: "Bu e-postayla kayıtlı bir öğrenci bulunamadı." };
  }

  const table = kind === "coach" ? "coach_students" : "parent_students";
  const row =
    kind === "coach"
      ? { coach_id: user.id, student_id: bulunan.id }
      : { parent_id: user.id, student_id: bulunan.id };

  const { error } = await supabase.from(table).insert(row);
  if (error) {
    if (error.code === "23505") return { error: "Bu öğrenci zaten bağlı." };
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { error: null };
}
