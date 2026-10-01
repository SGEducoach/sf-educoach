"use server";

// Maarif | LGS eylemleri (migration 0132).
//
// İKİ AYRI YETKİ:
//  * Çalışma kaydı → ÖĞRENCİ yazar (kendi adına).
//  * Yeterlilik kararı → ÖĞRETMEN yazar. Öğrenci karar veremez (kullanıcı
//    kararı 01.10.2026). Her iki kural RLS'te de duruyor; buradaki kontroller
//    kullanıcıya anlaşılır hata vermek için, güvenliğin tek dayanağı değil.
//
// Servis anahtarı kullanılmıyor: kullanıcının kendi oturumu RLS'i taşıyor.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { panelKademesi } from "@/lib/ortaokul-ayar";
import { calismaGirdisiDogrula } from "@/lib/ortaokul-calisma";
import type { CalismaGirdisi } from "@/lib/ortaokul-calisma";
import { yeterlilikDurumuCoz, yeterlilikKararVerebilir } from "@/lib/ortaokul-yeterlilik";
import { bolumCoz } from "@/lib/ortaokul-bolum";
import { veriHatasiCevir } from "@/lib/veri-hata-mesaji";

async function oturum() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, userId: user.id, rol: profil?.role ?? "" };
}

// ---- Öğrenci: çalışma kaydı ----

export async function ortaokulCalismaEkle(girdi: CalismaGirdisi): Promise<{ error: string | null }> {
  const { supabase, userId, rol } = await oturum();
  const { data: ogrenci } = await supabase.from("students").select("classes(seviye)").eq("id", userId).maybeSingle();
  const sinif = (ogrenci as unknown as { classes: { seviye: string } | null } | null)?.classes;
  const kademe = await panelKademesi(supabase, rol, sinif?.seviye);
  if (kademe !== "ortaokul") return { error: "Bu bölüm sana açık değil." };

  const dogrulama = calismaGirdisiDogrula({ ...girdi, bolum: bolumCoz(girdi.bolum) });
  if (!dogrulama.gecerli || !dogrulama.temiz) return { error: dogrulama.hata };
  const t = dogrulama.temiz;

  const { error } = await supabase.from("ortaokul_calismalar").insert({
    student_id: userId,
    bolum: t.bolum,
    tur: t.tur,
    ders_id: t.dersId,
    tema_id: t.temaId,
    tarih: t.tarih,
    sure_dakika: t.sureDakika,
    dogru: t.dogru,
    yanlis: t.yanlis,
    bos: t.bos,
  });
  if (error) return { error: veriHatasiCevir(error.message) };

  revalidatePath("/dashboard/ortaokul-calisma");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function ortaokulCalismaSil(kayitId: string): Promise<{ error: string | null }> {
  const { supabase } = await oturum();
  // RLS yalnız kendi kaydını silmeye izin veriyor.
  const { error, count } = await supabase
    .from("ortaokul_calismalar").delete({ count: "exact" }).eq("id", kayitId);
  if (error) return { error: veriHatasiCevir(error.message) };
  if (!count) return { error: "Kayıt bulunamadı." };
  revalidatePath("/dashboard/ortaokul-calisma");
  return { error: null };
}

// ---- Öğretmen: yeterlilik kararı ----

export async function ortaokulYeterlilikKaydet(girdi: {
  studentId: string;
  temaId: string;
  bolum: string;
  durum: string;
  aciklama?: string | null;
}): Promise<{ error: string | null }> {
  const { supabase, userId, rol } = await oturum();
  // Öğrenci bu eylemi hiçbir koşulda çalıştıramaz.
  if (!yeterlilikKararVerebilir(rol)) {
    return { error: "Konu yeterliliğine yalnızca öğretmen karar verebilir." };
  }

  const durum = yeterlilikDurumuCoz(girdi.durum);
  if (!durum) return { error: "Geçersiz yeterlilik durumu." };

  const aciklama = String(girdi.aciklama ?? "").trim();
  if (aciklama.length > 500) return { error: "Açıklama en fazla 500 karakter olabilir." };

  // Aynı öğrenci + tema + bölüm için tek karar (unique); upsert güncelliyor.
  const { error } = await supabase.from("ortaokul_konu_yeterlilikleri").upsert({
    student_id: girdi.studentId,
    tema_id: girdi.temaId,
    bolum: bolumCoz(girdi.bolum),
    durum,
    karar_veren_id: userId,
    aciklama: aciklama || null,
  }, { onConflict: "student_id,tema_id,bolum" });
  if (error) return { error: veriHatasiCevir(error.message) };

  revalidatePath("/dashboard/ortaokul-yeterlilik");
  return { error: null };
}
