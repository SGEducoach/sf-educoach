"use server";

// Ortaokul "Yardım İste" — öğrenciden öğretmene doğru akan istek
// (tasarım belgesi §22.1, migration 0129).
//
// Güvenlik notu: kayıt KULLANICININ kendi istemcisiyle yazılıyor, servis
// anahtarıyla değil — böylece "öğrenci yalnız kendi adına istek açar" kuralı
// RLS'te duruyor, burada tekrar edilen bir kontrole güvenilmiyor. Servis
// anahtarı yalnız BİLDİRİM için kullanılıyor (öğrencinin öğretmen profillerini
// okuma yetkisi yok).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bildirimGonder } from "@/lib/bildirim-gonder";
import { pushGonderProfile } from "@/lib/push-send";
import { duzeydenSorumluRehberler } from "@/lib/rehberlik-servisi";
import { dersinBransi, yardimGirdisiDogrula } from "@/lib/ortaokul-yardim";
import { panelKademesi } from "@/lib/ortaokul-ayar";
import { veriHatasiCevir } from "@/lib/veri-hata-mesaji";

interface YardimSonucu {
  error: string | null;
  // Kurumda bu dersin öğretmeni yoksa istek kaydedilir ama kimseye bildirim
  // gitmez; öğrenciye "iletildi" demek yanlış olur, bu yüzden söylüyoruz.
  uyari?: string | null;
}

// Öğrencinin ortaokul panelinde olduğunu doğrular. Bayrak kapalıysa ya da
// öğrenci 9-12. sınıftaysa bu ekran hiç açılmamalı — doğrudan istek atılarak
// da açılmasın.
async function ortaokulOgrencisi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: ogrenci } = await supabase
    .from("students").select("school_id, classes(seviye)").eq("id", user.id).maybeSingle();

  // Gömülü ilişki çalışma anında NESNE döner (bkz. proje notu).
  const sinif = (ogrenci as unknown as { classes: { seviye: string } | null } | null)?.classes;
  const kademe = await panelKademesi(supabase, profile?.role ?? "", sinif?.seviye);
  return { supabase, userId: user.id, schoolId: ogrenci?.school_id ?? null, sinifSeviyesi: sinif?.seviye ?? null, kademe };
}

export async function yardimIstegiGonder(girdi: {
  dersAdi: string;
  dersId?: string | null;
  kazanimId?: string | null;
  mesaj?: string | null;
}): Promise<YardimSonucu> {
  const { supabase, userId, schoolId, kademe } = await ortaokulOgrencisi();
  if (kademe !== "ortaokul") return { error: "Bu bölüm sana açık değil." };

  const dogrulama = yardimGirdisiDogrula(girdi);
  if (!dogrulama.gecerli || !dogrulama.temiz) return { error: dogrulama.hata };
  const { dersAdi, kazanimId, mesaj } = dogrulama.temiz;

  const { error } = await supabase.from("ortaokul_yardim_istekleri").insert({
    student_id: userId,
    ders_id: girdi.dersId?.trim() || null,
    kazanim_id: kazanimId,
    ders_adi: dersAdi,
    mesaj,
  });

  if (error) {
    // Tek açık istek indeksi: aynı ders için ikinci kez istenirse ham
    // "duplicate key" yerine ne olduğunu söyle.
    if (error.code === "23505") {
      return { error: `${dersAdi} için zaten açık bir isteğin var. Önce o yanıtlanmalı.` };
    }
    return { error: veriHatasiCevir(error.message) };
  }

  const uyari = await ilgililereHaberVer(userId, schoolId, dersAdi, mesaj);
  revalidatePath("/dashboard/ortaokul-yardim");
  revalidatePath("/dashboard");
  return { error: null, uyari };
}

export async function yardimIstegiGeriAl(istekId: string): Promise<{ error: string | null }> {
  const { supabase, kademe } = await ortaokulOgrencisi();
  if (kademe !== "ortaokul") return { error: "Bu bölüm sana açık değil." };

  // RLS yalnız durum='yeni' olanı silmeye izin veriyor; görülmüş isteği
  // silmeye çalışan istek sessizce 0 satır etkiler.
  const { error, count } = await supabase
    .from("ortaokul_yardim_istekleri")
    .delete({ count: "exact" })
    .eq("id", istekId);

  if (error) return { error: veriHatasiCevir(error.message) };
  if (!count) return { error: "Bu isteği artık geri alamazsın — öğretmenin görmüş." };

  revalidatePath("/dashboard/ortaokul-yardim");
  return { error: null };
}

// Bildirim: dersin branş öğretmenleri + kurumun rehber öğretmeni. Rehber her
// hâlde haberdar olur (§14.1'de "yardım isteyen öğrenciler" rehber ekranında).
// Branş öğretmeni yoksa istek kaybolmasın diye rehber tek başına da yeterli.
async function ilgililereHaberVer(
  studentId: string,
  schoolId: string | null,
  dersAdi: string,
  mesaj: string | null,
): Promise<string | null> {
  if (!schoolId) return null;
  const admin = createAdminClient();

  const { data: ogrenciProfili } = await admin.from("profiles").select("ad").eq("id", studentId).maybeSingle();
  const ogrenciAdi = ogrenciProfili?.ad ?? "Bir öğrenci";

  const brans = dersinBransi(dersAdi);
  // Rehberlik artık bir branş değil (migration 0144): dersin branş
  // öğretmenlerine EK OLARAK, öğrencinin sınıf düzeyinden SORUMLU rehbere
  // gider — rehberler kademeleri aralarında paylaştığı için istek yanlış
  // rehbere düşmesin. O düzeye kimse atanmamışsa tüm servise gider.
  const { data: ogrenciSinifKaydi } = await admin
    .from("students").select("classes(seviye)").eq("id", studentId).maybeSingle();
  const sinifKaydi = (ogrenciSinifKaydi as unknown as { classes: { seviye: string } | { seviye: string }[] | null } | null)?.classes;
  const sinifSeviyesi = Array.isArray(sinifKaydi) ? sinifKaydi[0]?.seviye : sinifKaydi?.seviye;

  const [{ data: ogretmenler }, rehberler] = await Promise.all([
    admin.from("teachers").select("id").eq("school_id", schoolId).eq("brans", brans),
    duzeydenSorumluRehberler(admin, schoolId, sinifSeviyesi),
  ]);

  const alicilar = [...new Set([
    ...((ogretmenler ?? []) as { id: string }[]).map((t) => t.id),
    ...rehberler,
  ])];
  if (alicilar.length === 0) {
    return "İsteğin kaydedildi ama kurumunda bu dersin öğretmeni kayıtlı değil. Yöneticin görecek.";
  }

  const baslik = `${dersAdi}: yardım isteği`;
  // Öğrencinin kendi cümlesi bildirime KISALTILARAK giriyor; tam metin
  // isteğin kendisinde duruyor.
  const govde = mesaj
    ? `${ogrenciAdi} ${dersAdi} dersinde yardım istedi: "${mesaj.slice(0, 120)}${mesaj.length > 120 ? "…" : ""}"`
    : `${ogrenciAdi} ${dersAdi} dersinde yardım istedi.`;

  for (const id of alicilar) {
    await bildirimGonder(admin, id, "sistem", baslik, govde);
    await pushGonderProfile(admin, id, baslik, govde, "/dashboard");
  }
  return null;
}
