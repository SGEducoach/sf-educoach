"use server";

import { revalidatePath } from "next/cache";
import { oturumTakipKapsami } from "@/lib/rehber-takip-verisi";
import { SINIF_TAKIP_TURLERI, sinifTakipNotunuTemizle, sutunYokHatasiMi, yonlendirmeHatasi } from "@/lib/sinif-takip";

const YOL = "/dashboard/takip-bildirimleri";

// Sınıf öğretmeninin KENDİ "görüldü / ele alındı / yeni" işareti ve notu
// (migration 0176). Rehberlerin ortak kaydına (rehber_takip_bildirimleri.durum
// ve not_metni) DOKUNMAZ; yalnız takip_ogretmen_durumlari'na kişi başına yazar.
// Yetki sunucuda: oturumun sınıf öğretmeni kapsamı olmalı ve kayıtlar o
// sınıfın öğrencilerine ait, izinli türden olmalı.
// rehbereYonlendir (0177, kullanıcı kararı 24.10.2026): "Ele Alındı" ile
// birlikte öğrenci rehberlik servisine yönlendirilir; gerekçe zorunlu.
// Rehberlerin ortak kaydı kapatılmışsa yeniden "yeni"ye döner (rehberin
// notu korunur) ki yönlendirme gözden kaçmasın.
export async function sinifTakipDurumGuncelle(
  idler: string[], durum: "yeni" | "goruldu" | "ele_alindi", notMetni?: string, rehbereYonlendir = false,
): Promise<{ error: string | null; guncellenen: number }> {
  const oturum = await oturumTakipKapsami();
  if (!oturum || !oturum.kapsam.sinifId || !oturum.kapsam.ogretmenId) {
    return { error: "Bu işlem yalnız sınıf öğretmenine açıktır.", guncellenen: 0 };
  }
  if (!["yeni", "goruldu", "ele_alindi"].includes(durum)) return { error: "Geçersiz durum.", guncellenen: 0 };
  const tekilIdler = [...new Set(idler)].slice(0, 500);
  if (tekilIdler.length === 0) return { error: null, guncellenen: 0 };

  const { admin, kapsam } = oturum;
  // Yalnız kendi sınıfının, izinli türden kayıtları (istemciden gelen kimliğe güvenilmez).
  const { data: gecerli, error: okumaHatasi } = await admin.from("rehber_takip_bildirimleri")
    .select("id, students!inner(class_id)")
    .in("id", tekilIdler).eq("school_id", kapsam.schoolId)
    .eq("students.class_id", kapsam.sinifId).in("tur", [...SINIF_TAKIP_TURLERI]);
  if (okumaHatasi) return { error: "Kayıt doğrulanamadı. Tekrar deneyin.", guncellenen: 0 };
  const gecerliIdler = ((gecerli ?? []) as { id: string }[]).map((g) => g.id);
  if (gecerliIdler.length === 0) return { error: null, guncellenen: 0 };

  if (durum === "yeni") {
    const { error } = await admin.from("takip_ogretmen_durumlari").delete()
      .eq("teacher_id", kapsam.ogretmenId).in("bildirim_id", gecerliIdler);
    if (error) return { error: "Kayıt güncellenemedi. Tekrar deneyin.", guncellenen: 0 };
  } else {
    const not = sinifTakipNotunuTemizle(notMetni);
    const yonlendir = durum === "ele_alindi" && rehbereYonlendir;
    if (yonlendir) {
      const hata = yonlendirmeHatasi(not);
      if (hata) return { error: hata, guncellenen: 0 };
    }
    const simdi = new Date().toISOString();
    const satirlar = (yonlendirmeAlani: boolean) => gecerliIdler.map((bildirim_id) => ({
      bildirim_id, teacher_id: kapsam.ogretmenId!, durum, guncellenme_at: simdi,
      // Not gönderilmediyse (toplu "görüldü") varolan not korunur.
      ...(notMetni !== undefined ? { not_metni: not } : {}),
      // "Ele Alındı" her kaydedildiğinde yönlendirme seçimi de yazılır (işaret kaldırılabilir).
      ...(yonlendirmeAlani && durum === "ele_alindi" ? { rehbere_yonlendirildi: yonlendir, yonlendirme_at: yonlendir ? simdi : null } : {}),
    }));
    let { error } = await admin.from("takip_ogretmen_durumlari").upsert(satirlar(true), { onConflict: "bildirim_id,teacher_id" });
    // 0177 uygulanmamışsa: yönlendirmesiz kayıt yine çalışır, yönlendirme açıkça reddedilir.
    if (error && sutunYokHatasiMi(error)) {
      if (yonlendir) return { error: "Yönlendirme için veritabanı güncellemesi (migration 0177) henüz uygulanmamış.", guncellenen: 0 };
      ({ error } = await admin.from("takip_ogretmen_durumlari").upsert(satirlar(false), { onConflict: "bildirim_id,teacher_id" }));
    }
    if (error) return { error: "Kayıt güncellenemedi. Tekrar deneyin.", guncellenen: 0 };
    if (yonlendir) {
      const { error: acmaHatasi } = await admin.from("rehber_takip_bildirimleri")
        .update({ durum: "yeni", kapatan_id: null, kapatilma_at: null })
        .in("id", gecerliIdler).neq("durum", "yeni");
      if (acmaHatasi) return { error: "Yönlendirme kaydedildi ama rehberlik servisinin listesinde yeniden açılamadı. Tekrar deneyin.", guncellenen: gecerliIdler.length };
    }
  }
  revalidatePath(YOL);
  return { error: null, guncellenen: gecerliIdler.length };
}
