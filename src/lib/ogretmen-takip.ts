import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { istanbulBugun } from "@/lib/yazili-erisim-hesap";

// Yazılı analizi dürüstlük engelinin ölçümü (bkz. migration 0097,
// yazili-erisim.ts). Yazan YALNIZCA sunucu (servis anahtarı): öğretmenin bu
// tablolara izni yok, aksi halde kendi API anahtarıyla sahte gün ya da
// görüntüleme ekleyebilirdi. after(): kayıt yanıt gönderildikten sonra
// yapılır, paneli yavaşlatmaz. Aynı gün tekrar girişler çoğalmaz.

export function ogretmenAktifGunuKaydet(teacherId: string) {
  after(async () => {
    const { error } = await createAdminClient()
      .from("ogretmen_aktif_gunleri")
      .upsert({ teacher_id: teacherId, gun: istanbulBugun() }, { onConflict: "teacher_id,gun", ignoreDuplicates: true });
    if (error) console.error("öğretmen aktif günü kaydedilemedi:", error.message);
  });
}

// Yalnızca öğrenci öğretmenin okulunda doğrulanıp profili gerçekten
// gösterildiğinde çağrılır (bkz. dashboard/page.tsx OgretmenIcerik).
export function ogrenciProfilGoruntulemesiKaydet(teacherId: string, studentId: string) {
  after(async () => {
    const { error } = await createAdminClient()
      .from("ogretmen_profil_goruntulemeleri")
      .upsert(
        { teacher_id: teacherId, student_id: studentId, gun: istanbulBugun() },
        { onConflict: "teacher_id,student_id,gun", ignoreDuplicates: true }
      );
    if (error) console.error("öğrenci profili görüntülemesi kaydedilemedi:", error.message);
  });
}
