"use server";

// 5-8. sınıf öğrenme çıktısı değerlendirmesini kaydetme (migration 0182).
// Yazma service-role ile; kimin hangi dersi yazabileceği ve hangi çıktının
// o yazılıda olduğu burada senaryo verisiyle yeniden sınanır.
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dershane-auth";
import { ortaokulCiktiSiniflariGetir, senaryoCiktilariGetir, SENARYO_DONEMI } from "@/lib/ortaokul-cikti-sorgu";
import { ciktiDersiMi, ciktiDuzeyiMi, yaziliCiktilari } from "@/lib/ortaokul-cikti";
import type { CiktiDersi, CiktiDuzeyi, YaziliNo } from "@/lib/ortaokul-cikti";

export interface CiktiHucresi {
  studentId: string;
  yazili: YaziliNo;
  kod: string;
  // null = işareti kaldır.
  duzey: CiktiDuzeyi | null;
}

export async function ortaokulCiktiKaydet(girdi: {
  classId: string;
  ders: CiktiDersi;
  hucreler: CiktiHucresi[];
}): Promise<{ error: string | null; kaydedilen: number }> {
  const { user } = await requireUser();
  const admin = createAdminClient();
  if (!ciktiDersiMi(girdi.ders)) return { error: "Geçersiz ders.", kaydedilen: 0 };
  const sinif = (await ortaokulCiktiSiniflariGetir(admin, user.id)).find((s) => s.id === girdi.classId);
  if (!sinif || !sinif.yazabilecegiDersler.includes(girdi.ders)) return { error: "Bu sınıfta bu dersi işaretleme yetkiniz yok.", kaydedilen: 0 };

  const ciktilar = senaryoCiktilariGetir(girdi.ders, sinif.seviye);
  const gecerliKodlar: Record<YaziliNo, Set<string>> = {
    1: new Set(yaziliCiktilari(ciktilar, 1).map((c) => c.kod)),
    2: new Set(yaziliCiktilari(ciktilar, 2).map((c) => c.kod)),
  };
  const { data: ogrenciler } = await admin.from("students").select("id").eq("class_id", girdi.classId);
  const sinifOgrencileri = new Set(((ogrenciler ?? []) as { id: string }[]).map((o) => o.id));

  const { egitimYili, donem } = SENARYO_DONEMI;
  const simdi = new Date().toISOString();
  const yazilacak: Record<string, unknown>[] = [];
  const silinecek: CiktiHucresi[] = [];
  for (const h of girdi.hucreler) {
    if (!sinifOgrencileri.has(h.studentId) || (h.yazili !== 1 && h.yazili !== 2) || !gecerliKodlar[h.yazili].has(h.kod)) return { error: "Geçersiz satır.", kaydedilen: 0 };
    if (h.duzey === null) silinecek.push(h);
    else if (ciktiDuzeyiMi(h.duzey)) {
      yazilacak.push({ student_id: h.studentId, egitim_yili: egitimYili, donem, yazili: h.yazili, ders: girdi.ders, cikti_kod: h.kod, duzey: h.duzey, giren_id: user.id, updated_at: simdi });
    } else return { error: "Geçersiz düzey.", kaydedilen: 0 };
  }

  if (yazilacak.length > 0) {
    const { error } = await admin.from("ortaokul_cikti_degerlendirmeleri")
      .upsert(yazilacak, { onConflict: "student_id,egitim_yili,donem,yazili,cikti_kod" });
    if (error) return { error: error.message, kaydedilen: 0 };
  }
  for (const s of silinecek) {
    await admin.from("ortaokul_cikti_degerlendirmeleri").delete()
      .eq("student_id", s.studentId).eq("egitim_yili", egitimYili).eq("donem", donem).eq("yazili", s.yazili).eq("cikti_kod", s.kod);
  }

  revalidatePath("/dashboard/ilkokul-gelisim");
  return { error: null, kaydedilen: yazilacak.length + silinecek.length };
}
