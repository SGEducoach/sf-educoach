"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GorevTuru } from "@/lib/types";
import { saatiDakikayaCevir, saatAraliklariCakisiyor } from "@/lib/saat-araligi";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Öğretmen bir veya birden çok öğrenciye (toplu görev) aynı görevi verir —
// tek bir `gorevler` satırı + öğrenci başına bir `gorev_atamalari` satırı.
// Yetki kontrolü RLS'te (gorev_atamalari_insert_own, bkz. migration 0047):
// öğretmen sadece kendi sınıfındaki veya `ogretmen_dersleri` ile ilişkili
// olduğu bir sınıftaki öğrencilere görev atayabilir.
export async function gorevVer(input: {
  studentIds: string[];
  tur: GorevTuru;
  ders: string;
  konu?: string;
  hedefSoruSayisi?: number;
  hedefDakika?: number;
  tarih: string;
  sonTarih?: string;
  baslangicSaat?: string;
  bitisSaat?: string;
  aciklama?: string;
}) {
  const { supabase, user } = await requireUser();
  const ders = input.ders.trim();

  if (input.studentIds.length === 0) return { error: "En az bir öğrenci seçin." };
  if (!ders) return { error: "Ders seçin." };
  if (!input.tarih) return { error: "Tarih seçin." };
  const sonTarih = input.sonTarih && input.sonTarih >= input.tarih ? input.sonTarih : input.tarih;

  const { data: gorev, error } = await supabase.from("gorevler").insert({
    olusturan_ogretmen_id: user.id,
    tur: input.tur,
    ders,
    konu: input.konu?.trim() || null,
    hedef_soru_sayisi: input.hedefSoruSayisi || null,
    hedef_dakika: input.hedefDakika || null,
    tarih: input.tarih,
    son_tarih: sonTarih,
    baslangic_saat: input.baslangicSaat || null,
    bitis_saat: input.bitisSaat || null,
    aciklama: input.aciklama?.trim() || null,
  }).select("id").single();
  if (error || !gorev) return { error: error?.message ?? "Görev oluşturulamadı." };

  const atamalar = input.studentIds.map((studentId) => ({ gorev_id: gorev.id, student_id: studentId }));
  const { error: atamaError } = await supabase.from("gorev_atamalari").insert(atamalar);
  if (atamaError) {
    // Atama başarısızsa (ör. yetkisiz bir öğrenci seçildiyse) yetim görev
    // kalmasın diye geri alınıyor.
    await supabase.from("gorevler").delete().eq("id", gorev.id);
    if (atamaError.message?.includes("row-level security")) {
      return { error: "Seçilen öğrencilerden bazıları size ait değil." };
    }
    return { error: atamaError.message };
  }

  revalidatePath("/dashboard");
  return { error: null, ogrenciSayisi: input.studentIds.length };
}

// Öğrenci kendi planını ekler — aynı Görevlerim takvimine, öğretmen
// görevleriyle birlikte görünür (bkz. migration 0049). Öğretmen görevinden
// farklı olarak saat aralığı ZORUNLU ve aynı gün çakışan bir saat aralığına
// izin verilmiyor (o günkü TÜM görevlerle — hem öğretmenin verdiği hem
// kendi eklediği planlarla — karşılaştırılıyor).
export async function planEkle(input: {
  tur: GorevTuru;
  ders: string;
  konu?: string;
  hedefSoruSayisi?: number;
  hedefDakika?: number;
  tarih: string;
  baslangicSaat: string;
  bitisSaat: string;
  aciklama?: string;
}) {
  const { supabase, user } = await requireUser();
  const ders = input.ders.trim();

  if (!ders) return { error: "Ders seçin." };
  if (!input.tarih) return { error: "Tarih seçin." };
  if (!input.baslangicSaat || !input.bitisSaat) return { error: "Başlangıç ve bitiş saati zorunludur." };
  const baslangicDakika = saatiDakikayaCevir(input.baslangicSaat);
  const bitisDakika = saatiDakikayaCevir(input.bitisSaat);
  if (baslangicDakika === null || bitisDakika === null || bitisDakika <= baslangicDakika) {
    return { error: "Bitiş saati başlangıçtan sonra olmalı." };
  }

  const { data: gununGorevleriHam, error: sorguHatasi } = await supabase
    .from("gorev_atamalari")
    .select("gorevler!inner(baslangic_saat, bitis_saat, tarih)")
    .eq("student_id", user.id)
    .eq("gorevler.tarih", input.tarih);
  if (sorguHatasi) return { error: sorguHatasi.message };

  type GunGorevRow = { gorevler: { baslangic_saat: string | null; bitis_saat: string | null } | null };
  const cakisiyor = ((gununGorevleriHam as unknown as GunGorevRow[]) ?? []).some((r) => {
    const g = r.gorevler;
    if (!g?.baslangic_saat || !g.bitis_saat) return false;
    return saatAraliklariCakisiyor(
      g.baslangic_saat,
      g.bitis_saat,
      input.baslangicSaat,
      input.bitisSaat,
    );
  });
  if (cakisiyor) return { error: "Bu saat aralığında zaten planlanmış bir göreviniz var." };

  const { data: gorev, error } = await supabase.from("gorevler").insert({
    olusturan_ogrenci_id: user.id,
    tur: input.tur,
    ders,
    konu: input.konu?.trim() || null,
    hedef_soru_sayisi: input.hedefSoruSayisi || null,
    hedef_dakika: input.hedefDakika || null,
    tarih: input.tarih,
    son_tarih: input.tarih,
    baslangic_saat: input.baslangicSaat,
    bitis_saat: input.bitisSaat,
    aciklama: input.aciklama?.trim() || null,
  }).select("id").single();
  if (error || !gorev) return { error: error?.message ?? "Plan oluşturulamadı." };

  const { error: atamaError } = await supabase.from("gorev_atamalari").insert({ gorev_id: gorev.id, student_id: user.id });
  if (atamaError) {
    await supabase.from("gorevler").delete().eq("id", gorev.id);
    return { error: atamaError.message };
  }

  revalidatePath("/dashboard");
  return { error: null };
}
