"use server";

import { revalidatePath } from "next/cache";
import { dershaneRehberYetkisi } from "@/lib/dershane-rehber";
import { programaCakisiyorMu } from "@/lib/program-cakisma";
import { saatiDakikayaCevir } from "@/lib/saat-araligi";
import { REHBER_GERIYE_DONUK_GUN } from "@/lib/rehberlik";
import { SURE_UST_SINIR, SORU_SAYISI_UST_SINIR, TAKIP_SORUSU, dersSoruSayisi } from "@/lib/types";
import type { DenemeTuru, DenemeZorlugu, GorevTuru, HedefeYakinlik, TakipCevabi } from "@/lib/types";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import { rozetKontrolVeBildir } from "@/lib/rozet-bildirim";

// Dershane rehberlik servisi (kullanıcı isteği 13.09.2026) — rehber öğretmen
// öğrenci adına ödev verir, program yapar, veri girer. Kullanıcı kararları:
//   * veri analizde ve rozet/seride sayılır — "rehber güvenilir kullanıcı"
//     (migration 0108); rozet kontrolü ve veli bildirimi öğrencinin kendi
//     girişindeki gibi çalışır. Haftalık verimlilik anketi sayacına girmez,
//   * rehber 30 gün geriye dönük girebilir,
//   * rehberin girdiği soru çözümü onaylı sayılır,
//   * rehberin program kalemini öğrenci taşıyamaz (rehber_yerlestirdi).
// Yazma servis anahtarıyla; yetki dershaneRehberYetkisi'nde. Öğrenciye özgü
// manipülasyon sayacı (hesap askıya alma) rehbere uygulanmaz, sınırlar düz hata.

type VeriSonucu = { error: string | null; verimlilikSorulsunMu: boolean };
const veriSonucu = (error: string | null): VeriSonucu => ({ error, verimlilikSorulsunMu: false });

function tarihDogrula(ham: FormDataEntryValue | string | null | undefined): { tarih: string; error: string | null } {
  const bugun = bugununTarihiTR();
  const deger = (ham ?? "").toString().trim();
  if (!deger) return { tarih: bugun, error: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deger)) return { tarih: bugun, error: "Tarih geçersiz." };
  if (deger > bugun) return { tarih: bugun, error: "İleri bir tarih girilemez." };
  if (deger < tarihEkle(bugun, -REHBER_GERIYE_DONUK_GUN)) {
    return { tarih: bugun, error: `En fazla ${REHBER_GERIYE_DONUK_GUN} gün geriye dönük giriş yapılabilir.` };
  }
  return { tarih: deger, error: null };
}

function saatSirasiHatali(baslangicSaat?: string, bitisSaat?: string): boolean {
  if (!baslangicSaat || !bitisSaat) return false;
  const baslangic = saatiDakikayaCevir(baslangicSaat);
  const bitis = saatiDakikayaCevir(bitisSaat);
  return baslangic === null || bitis === null || bitis === baslangic;
}

// Ödev: tek gorevler satırı + öğrenci başına atama (gorevVer ile aynı yapı),
// sınıf sınırı yok — dershanedeki her öğrenci.
export async function rehberGorevVer(input: {
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
}): Promise<{ error: string | null }> {
  const ders = input.ders.trim();
  if (input.studentIds.length === 0) return { error: "En az bir öğrenci seçin." };
  if (!ders) return { error: "Ders seçin." };
  if (!input.tarih) return { error: "Tarih seçin." };
  if (saatSirasiHatali(input.baslangicSaat, input.bitisSaat)) return { error: "Bitiş saati başlangıçtan sonra olmalı." };

  const yetki = await dershaneRehberYetkisi(input.studentIds);
  if (yetki.error !== null) return { error: yetki.error };
  const { admin, rehberId } = yetki;

  const sonTarih = input.sonTarih && input.sonTarih >= input.tarih ? input.sonTarih : input.tarih;
  const { data: gorev, error } = await admin.from("gorevler").insert({
    olusturan_ogretmen_id: rehberId,
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

  const atamalar = [...new Set(input.studentIds)].map((studentId) => ({ gorev_id: gorev.id, student_id: studentId }));
  const { error: atamaHatasi } = await admin.from("gorev_atamalari").insert(atamalar);
  if (atamaHatasi) {
    await admin.from("gorevler").delete().eq("id", gorev.id);
    return { error: atamaHatasi.message };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

// Program: öğrencinin programına doğrudan, kilitli kalem (öğrencinin
// planEkle'siyle aynı çakışma kuralı).
export async function rehberProgramEkle(input: {
  ogrenciId: string;
  tur: GorevTuru;
  ders: string;
  konu?: string;
  hedefSoruSayisi?: number;
  hedefDakika?: number;
  tarih: string;
  baslangicSaat: string;
  bitisSaat: string;
  aciklama?: string;
}): Promise<{ error: string | null }> {
  const ders = input.ders.trim();
  if (!ders) return { error: "Ders seçin." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarih ?? "")) return { error: "Tarih seçin." };
  if (!input.baslangicSaat || !input.bitisSaat) return { error: "Başlangıç ve bitiş saati zorunludur." };
  if (saatSirasiHatali(input.baslangicSaat, input.bitisSaat)) return { error: "Bitiş saati başlangıçtan sonra olmalı." };

  const yetki = await dershaneRehberYetkisi([input.ogrenciId]);
  if (yetki.error !== null) return { error: yetki.error };
  const { admin, rehberId } = yetki;

  const { error: cakismaHatasi, cakisiyor } = await programaCakisiyorMu(admin, input.ogrenciId, input.tarih, input.baslangicSaat, input.bitisSaat);
  if (cakismaHatasi) return { error: cakismaHatasi };
  if (cakisiyor) return { error: "Öğrencinin programında bu saat aralığında zaten bir görev/plan var." };

  const { data: gorev, error } = await admin.from("gorevler").insert({
    olusturan_ogretmen_id: rehberId,
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
  if (error || !gorev) return { error: error?.message ?? "Program kalemi oluşturulamadı." };

  const { error: atamaHatasi } = await admin.from("gorev_atamalari").insert({
    gorev_id: gorev.id, student_id: input.ogrenciId,
    programa_eklendi_mi: true, ogrenci_tarih: input.tarih,
    ogrenci_baslangic_saat: input.baslangicSaat, ogrenci_bitis_saat: input.bitisSaat,
    rehber_yerlestirdi: true,
  });
  if (atamaHatasi) {
    await admin.from("gorevler").delete().eq("id", gorev.id);
    return { error: atamaHatasi.message };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

// Rehber yalnızca KENDİ yerleştirdiği kalemi kaldırır (görev silinince atama da silinir).
export async function rehberProgramSil(atamaId: string): Promise<{ error: string | null }> {
  const yetki = await dershaneRehberYetkisi();
  if (yetki.error !== null) return { error: yetki.error };
  const { admin, rehberId, schoolId } = yetki;

  const { data } = await admin
    .from("gorev_atamalari")
    .select("gorev_id, rehber_yerlestirdi, gorevler!inner(olusturan_ogretmen_id), students!inner(school_id)")
    .eq("id", atamaId)
    .maybeSingle();
  type Satir = {
    gorev_id: string; rehber_yerlestirdi: boolean;
    gorevler: { olusturan_ogretmen_id: string | null } | { olusturan_ogretmen_id: string | null }[] | null;
    students: { school_id: string } | { school_id: string }[] | null;
  };
  const atama = data as unknown as Satir | null;
  const gorev = Array.isArray(atama?.gorevler) ? atama?.gorevler[0] : atama?.gorevler;
  const ogrenci = Array.isArray(atama?.students) ? atama?.students[0] : atama?.students;
  if (!atama || !atama.rehber_yerlestirdi || gorev?.olusturan_ogretmen_id !== rehberId || ogrenci?.school_id !== schoolId) {
    return { error: "Program kalemi bulunamadı ya da sizin tarafınızdan eklenmedi." };
  }

  const { error } = await admin.from("gorevler").delete().eq("id", atama.gorev_id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function rehberKonuCalismaEkle(ogrenciId: string, formData: FormData): Promise<VeriSonucu> {
  const ders = String(formData.get("ders") ?? "").trim();
  const konu = String(formData.get("konu") ?? "").trim();
  const sureDakika = Number(formData.get("sureDakika"));
  const hedefeYakinlik = String(formData.get("hedefeYakinlik")) as HedefeYakinlik;
  const takipCevabi = String(formData.get("takipCevabi") ?? "") as TakipCevabi;
  const yayinevi = String(formData.get("yayinevi") ?? "").trim();
  const { tarih, error: tarihHatasi } = tarihDogrula(formData.get("tarih"));

  if (!ders || !konu || !sureDakika || sureDakika <= 0 || !hedefeYakinlik || !yayinevi) return veriSonucu("Lütfen tüm alanları doldurun.");
  if (!TAKIP_SORUSU[hedefeYakinlik]?.secenekler.some(([kod]) => kod === takipCevabi)) return veriSonucu("Lütfen ikinci soruyu da işaretleyin.");
  if (tarihHatasi) return veriSonucu(tarihHatasi);
  if (sureDakika > SURE_UST_SINIR) return veriSonucu(`Süre en fazla ${SURE_UST_SINIR} dakika olabilir (tek oturum için).`);

  const yetki = await dershaneRehberYetkisi([ogrenciId]);
  if (yetki.error !== null) return veriSonucu(yetki.error);

  const { error } = await yetki.admin.from("konu_calismalar").insert({
    student_id: ogrenciId, ders, konu, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik,
    takip_cevabi: takipCevabi, yayinevi, tarih, giren_rehber_id: yetki.rehberId,
  });
  if (error) return veriSonucu(error.message);
  await rozetKontrolVeBildir(yetki.admin, ogrenciId);
  revalidatePath("/dashboard");
  return veriSonucu(null);
}

export async function rehberSoruCozumuEkle(ogrenciId: string, formData: FormData): Promise<VeriSonucu> {
  const ders = String(formData.get("ders") ?? "").trim();
  const dogru = Number(formData.get("dogru"));
  const yanlis = Number(formData.get("yanlis"));
  const bos = Number(formData.get("bos") ?? 0);
  const konu = String(formData.get("konu") ?? "").trim();
  const sureDakika = Number(formData.get("sureDakika"));
  const yayinevi = String(formData.get("yayinevi") ?? "").trim();
  const { tarih, error: tarihHatasi } = tarihDogrula(formData.get("tarih"));

  if (
    !ders || Number.isNaN(dogru) || Number.isNaN(yanlis) || Number.isNaN(bos) ||
    dogru < 0 || yanlis < 0 || bos < 0 || !sureDakika || sureDakika <= 0 || !yayinevi
  ) {
    return veriSonucu("Lütfen tüm alanları doldurun.");
  }
  if (tarihHatasi) return veriSonucu(tarihHatasi);
  if (dogru > SORU_SAYISI_UST_SINIR || yanlis > SORU_SAYISI_UST_SINIR || bos > SORU_SAYISI_UST_SINIR) {
    return veriSonucu(`Tek bir alan için en fazla ${SORU_SAYISI_UST_SINIR} soru girilebilir.`);
  }
  const toplamSoru = dogru + yanlis + bos;
  if (sureDakika > toplamSoru * 2) {
    return veriSonucu(`Süre, toplam soru sayısının (${toplamSoru}) iki katı olan ${toplamSoru * 2} dakikayı geçemez.`);
  }

  const yetki = await dershaneRehberYetkisi([ogrenciId]);
  if (yetki.error !== null) return veriSonucu(yetki.error);

  const { error } = await yetki.admin.from("soru_cozumleri").insert({
    student_id: ogrenciId, ders, dogru, yanlis, bos, konu: konu || null, sure_dakika: sureDakika, yayinevi,
    kaynak: "ogrenci", tarih, giren_rehber_id: yetki.rehberId,
    onaylandi_mi: true, onaylayan_id: yetki.rehberId, onaylanma_at: new Date().toISOString(),
  });
  if (error) return veriSonucu(error.message);
  await rozetKontrolVeBildir(yetki.admin, ogrenciId);
  revalidatePath("/dashboard");
  return veriSonucu(null);
}

export async function rehberDenemeEkle(
  ogrenciId: string,
  tur: DenemeTuru,
  yayinevi: string,
  hedefeYakinlik: HedefeYakinlik,
  zorluk: DenemeZorlugu,
  dersSonuclari: { ders: string; dogru: number; yanlis: number }[],
  tarihGirdisi?: string,
  zorla = false,
): Promise<VeriSonucu & { benzerUyari?: boolean }> {
  const { tarih, error: tarihHatasi } = tarihDogrula(tarihGirdisi);
  if (!yayinevi.trim() || !hedefeYakinlik || !zorluk || dersSonuclari.length === 0) return veriSonucu("Lütfen tüm alanları doldurun.");
  if (tarihHatasi) return veriSonucu(tarihHatasi);
  for (const d of dersSonuclari) {
    if (!Number.isInteger(d.dogru) || !Number.isInteger(d.yanlis) || d.dogru < 0 || d.yanlis < 0) {
      return veriSonucu(`${d.ders} için doğru ve yanlış sayısı geçersiz.`);
    }
    const maksSoru = dersSoruSayisi(tur, d.ders);
    if (maksSoru !== undefined && d.dogru + d.yanlis > maksSoru) {
      return veriSonucu(`${d.ders} için doğru+yanlış toplamı ${maksSoru} soruyu aşamaz.`);
    }
  }

  const yetki = await dershaneRehberYetkisi([ogrenciId]);
  if (yetki.error !== null) return veriSonucu(yetki.error);
  const { admin, rehberId } = yetki;

  const { data: kurumKaydi } = await admin
    .from("denemeler").select("id")
    .eq("student_id", ogrenciId).eq("tarih", tarih).eq("tur", tur).eq("kaynak", "ogretmen")
    .limit(1).maybeSingle();
  if (kurumKaydi) return veriSonucu(`Bu tarihteki ${tur} denemenin sonucu kurum tarafından zaten yüklendi.`);

  if (!zorla) {
    const { data: mevcutlar } = await admin
      .from("denemeler").select("id")
      .eq("student_id", ogrenciId).eq("tarih", tarih).eq("tur", tur).eq("kaynak", "ogrenci");
    if ((mevcutlar?.length ?? 0) > 0) return { error: null, verimlilikSorulsunMu: false, benzerUyari: true };
  }

  const { data: deneme, error } = await admin
    .from("denemeler")
    .insert({ student_id: ogrenciId, tur, hedefe_yakinlik: hedefeYakinlik, zorluk, yayinevi: yayinevi.trim(), kaynak: "ogrenci", tarih, giren_rehber_id: rehberId })
    .select("id")
    .single();
  if (error || !deneme) return veriSonucu(error?.message ?? "Deneme kaydedilemedi.");

  const { error: sonucHatasi } = await admin.from("deneme_ders_sonuclari").insert(
    dersSonuclari.map((d) => ({ deneme_id: deneme.id, ders: d.ders, dogru: d.dogru, yanlis: d.yanlis })),
  );
  if (sonucHatasi) {
    await admin.from("denemeler").delete().eq("id", deneme.id);
    return veriSonucu(sonucHatasi.message);
  }

  await rozetKontrolVeBildir(admin, ogrenciId);
  revalidatePath("/dashboard");
  return veriSonucu(null);
}
