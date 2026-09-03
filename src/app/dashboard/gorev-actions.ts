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

// Program Yap (27.08.2026) — bir öğrencinin PROGRAMA EKLENMİŞ (programa_eklendi_mi=true)
// tüm görev/planları kendi ogrenci_tarih/ogrenci_baslangic_saat/ogrenci_bitis_saat
// sütunlarında kendine yeterli duruyor (bkz. migration 0081) — hem planEkle hem
// gorevProgramaEkle AYNI bu fonksiyonla çakışma kontrolü yapıyor, tek yerden.
async function programaCakisiyorMu(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  tarih: string,
  baslangicSaat: string,
  bitisSaat: string,
  haricAtamaId?: string,
): Promise<{ error: string | null; cakisiyor: boolean }> {
  let sorgu = supabase
    .from("gorev_atamalari")
    .select("ogrenci_baslangic_saat, ogrenci_bitis_saat")
    .eq("student_id", studentId)
    .eq("programa_eklendi_mi", true)
    .eq("ogrenci_tarih", tarih);
  if (haricAtamaId) sorgu = sorgu.neq("id", haricAtamaId);
  const { data, error } = await sorgu;
  if (error) return { error: error.message, cakisiyor: false };

  const gorevCakisiyor = ((data ?? []) as { ogrenci_baslangic_saat: string | null; ogrenci_bitis_saat: string | null }[]).some((r) =>
    !!r.ogrenci_baslangic_saat && !!r.ogrenci_bitis_saat &&
    saatAraliklariCakisiyor(r.ogrenci_baslangic_saat, r.ogrenci_bitis_saat, baslangicSaat, bitisSaat),
  );
  if (gorevCakisiyor) return { error: null, cakisiyor: true };

  // Kabul edilmiş Beden Eğitimi/Müzik çalışmaları da öğrencinin programını
  // kapatır. Böylece öğrenci daha sonra aynı saate kişisel plan ekleyemez.
  const { count: etkinlikSayisi, error: etkinlikHatasi } = await supabase
    .from("etkinlik_calisma_atamalari")
    .select("id,etkinlik_calismalari!inner(tarih,baslangic_saat,bitis_saat)", { count: "exact", head: true })
    .eq("student_id", studentId).eq("durum", "kabul")
    .eq("etkinlik_calismalari.tarih", tarih)
    .lt("etkinlik_calismalari.baslangic_saat", bitisSaat)
    .gt("etkinlik_calismalari.bitis_saat", baslangicSaat);
  if (etkinlikHatasi) return { error: etkinlikHatasi.message, cakisiyor: false };
  return { error: null, cakisiyor: (etkinlikSayisi ?? 0) > 0 };
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
// farklı olarak saat aralığı ZORUNLU ve öğrencinin PROGRAMA EKLENMİŞ diğer
// tüm görev/planlarıyla (bkz. programaCakisiyorMu, migration 0081) çakışan
// bir saat aralığına izin verilmiyor. Oluşturulduğu anda kendisi de
// programa eklenmiş sayılır (bkz. aşağıdaki insert).
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

  const { error: cakismaHatasi, cakisiyor } = await programaCakisiyorMu(supabase, user.id, input.tarih, input.baslangicSaat, input.bitisSaat);
  if (cakismaHatasi) return { error: cakismaHatasi };
  if (cakisiyor) return { error: "Bu saat aralığında programınızda zaten bir görev/plan var." };

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
  if (error || !gorev) return { error: error?.message ?? "Program oluşturulamadı." };

  const { error: atamaError } = await supabase.from("gorev_atamalari").insert({
    gorev_id: gorev.id, student_id: user.id,
    programa_eklendi_mi: true, ogrenci_tarih: input.tarih,
    ogrenci_baslangic_saat: input.baslangicSaat, ogrenci_bitis_saat: input.bitisSaat,
  });
  if (atamaError) {
    await supabase.from("gorevler").delete().eq("id", gorev.id);
    return { error: atamaError.message };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

// Program Yap (27.08.2026 kullanıcı isteği): öğretmenin verdiği bir görevi
// öğrenci kendi haftalık programına yerleştirir. Öğretmen zaten bir saat
// aralığı girdiyse client bunu DOĞRUDAN (değiştirmeden) gönderir — çakışma
// yoksa tek adımda programa girer. Çakışırsa veya öğretmen hiç saat
// girmediyse client öğrenciye kendi saatini (gerekirse farklı bir günü de)
// seçtirip aynı action'ı tekrar çağırır.
export async function gorevProgramaEkle(input: {
  atamaId: string;
  tarih: string;
  baslangicSaat: string;
  bitisSaat: string;
}) {
  const { supabase, user } = await requireUser();

  if (!input.tarih) return { error: "Tarih seçin." };
  if (!input.baslangicSaat || !input.bitisSaat) return { error: "Başlangıç ve bitiş saati zorunludur." };
  const baslangicDakika = saatiDakikayaCevir(input.baslangicSaat);
  const bitisDakika = saatiDakikayaCevir(input.bitisSaat);
  if (baslangicDakika === null || bitisDakika === null || bitisDakika <= baslangicDakika) {
    return { error: "Bitiş saati başlangıçtan sonra olmalı." };
  }

  // Atama gerçekten bu öğrenciye mi ait, doğrula (RLS zaten update'i
  // engelleyecek olsa da hatayı burada anlamlı bir mesajla döndürelim).
  const { data: atama, error: atamaHatasi } = await supabase
    .from("gorev_atamalari")
    .select("id")
    .eq("id", input.atamaId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (atamaHatasi) return { error: atamaHatasi.message };
  if (!atama) return { error: "Görev bulunamadı." };

  const { error: cakismaHatasi, cakisiyor } = await programaCakisiyorMu(
    supabase, user.id, input.tarih, input.baslangicSaat, input.bitisSaat, input.atamaId,
  );
  if (cakismaHatasi) return { error: cakismaHatasi };
  if (cakisiyor) return { error: "Bu saat aralığında programınızda zaten bir görev/plan var. Farklı bir saat veya gün seçin." };

  const { error } = await supabase.from("gorev_atamalari").update({
    programa_eklendi_mi: true,
    ogrenci_tarih: input.tarih,
    ogrenci_baslangic_saat: input.baslangicSaat,
    ogrenci_bitis_saat: input.bitisSaat,
  }).eq("id", input.atamaId).eq("student_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}
