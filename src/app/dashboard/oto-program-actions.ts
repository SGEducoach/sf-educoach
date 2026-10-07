"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { otoProgramVerisiGetir } from "@/lib/oto-program-veri";
import {
  KAPSAM_HAFTA_SAYISI, ayarHatasi, bloklariDogrula, gunEkle, haftaninGunu, haftaninPazartesisi,
} from "@/lib/oto-program";
import type { OtoProgramAyari, OtoProgramVerisi, ProgramBlogu, ProgramKapsami } from "@/lib/oto-program";
import { bugununTarihiTR } from "@/lib/tarih";
import { rehberlikUyeligiGetir } from "@/lib/rehberlik-servisi";

// SeFu Oto Program (kullanıcı isteği 13.09.2026) — öğrenci sihirbazda
// ayarları seçer, program istemcide (lib/oto-program.ts) önizlenir ve
// düzeltilir; kayıt yalnızca "Onayla"da. Sunucu verileri yeniden okur ve
// ayarları + her kalemi aynı kurallarla doğrular, sonra servis anahtarıyla
// yazar (öğrencinin gorevler tablosunda silme izni yok; aynı döneme
// uygulanmış önceki oto programın bekleyen kalemleri değiştirilir).

// Rehber desteği (kullanıcı kararı 07.10.2026, migration 0146): sihirbazı
// öğrencinin kendisi ya da kapsamındaki bir Rehberlik Servisi üyesi
// çalıştırabilir. ogrenciId VERİLMEZSE davranış birebir eskisi gibi —
// öğrencinin kendi oturumu.
//
// ÖNEMLİ: rehber yolunda üretilen görevler yine olusturan_ogrenci_id =
// öğrenci olarak yazılır ve rehber_yerlestirdi SET EDİLMEZ; yani program
// öğrencinin kendi programı olarak kalır, taşıyabilir ve silebilir. Rehberin
// etkinliği kısıtlamayla değil geri bildirimle korunuyor (bkz. migration
// 0146 ve rehber-program-actions.ts).
type ProgramAktoru =
  | { error: string; supabase: null; userId: null; rehberId: null }
  | { error: null; supabase: Awaited<ReturnType<typeof createClient>>; userId: string; rehberId: string | null };

const REHBER_MESAJI = "Bu öğrencinin programını hazırlama yetkiniz yok.";

async function programAktoru(ogrenciId?: string): Promise<ProgramAktoru> {
  const hata = (error: string): ProgramAktoru => ({ error, supabase: null, userId: null, rehberId: null });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return hata("Oturum açılmadı.");
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (!ogrenciId) {
    if (profil?.role !== "ogrenci") return hata("Oto program yalnızca öğrenci hesabında kullanılabilir.");
    return { error: null, supabase, userId: user.id, rehberId: null };
  }

  if (profil?.role !== "ogretmen") return hata(REHBER_MESAJI);
  const uyelik = await rehberlikUyeligiGetir(supabase, user.id);
  if (!uyelik) return hata(REHBER_MESAJI);

  // Yetki AÇIKÇA burada doğrulandıktan sonra servis anahtarı kullanılıyor:
  // otoProgramVerisiGetir öğrencinin müfredat/konu durumunu birçok tablodan
  // okuyor ve rehber RLS'i hepsini kapsamıyor. Aynı desen dershane
  // rehberinde de var (bkz. lib/dershane-rehber.ts). Gizli veri değil —
  // öğrencinin çalışma verisi ve rehber onu kapsamı gereği zaten görüyor.
  const admin = createAdminClient();
  const { data: ogr } = await admin
    .from("students").select("school_id, classes(seviye)").eq("id", ogrenciId).maybeSingle();
  if (!ogr || ogr.school_id !== uyelik.schoolId) return hata(REHBER_MESAJI);
  // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür (proje notu).
  const sinif = (ogr as unknown as { classes: { seviye: string } | { seviye: string }[] | null }).classes;
  const seviye = Array.isArray(sinif) ? sinif[0]?.seviye : sinif?.seviye;
  if (!seviye || !uyelik.sinifDuzeyleri.includes(seviye)) return hata(REHBER_MESAJI);

  return {
    error: null,
    supabase: admin as unknown as Awaited<ReturnType<typeof createClient>>,
    userId: ogrenciId,
    rehberId: user.id,
  };
}

function donemHatasi(baslangicTarihi: string, kapsam: ProgramKapsami): string | null {
  if (!(kapsam in KAPSAM_HAFTA_SAYISI)) return "Program kapsamı geçersiz.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baslangicTarihi ?? "") || haftaninGunu(baslangicTarihi) !== 0) return "Program pazartesi gününden başlamalı.";
  const buPazartesi = haftaninPazartesisi(bugununTarihiTR());
  if (baslangicTarihi < buPazartesi || baslangicTarihi > gunEkle(buPazartesi, 7 * 8)) {
    return "Program bu hafta ile 8 hafta sonrası arasında başlamalı.";
  }
  return null;
}

// Kullanıcı isteği (24.09.2026): haftalık program açıkken "bu haftayı
// temizle". Yalnızca BEKLEYEN kalemler etkilenir:
//   * öğrencinin kendi program kalemleri (oto program dahil) silinir,
//   * öğretmen ödevleri SİLİNMEZ, sadece programdan çıkarılır (saat/gün
//     bilgisi temizlenir; ödev "Ödevlerim"de bekler).
// Tamamlanmış kalemlere dokunulmaz — girilmiş veriyle bağları korunur.
export async function haftayiTemizle(haftaBaslangici: string): Promise<{ error: string | null; silinen: number; cikarilan: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(haftaBaslangici ?? "") || haftaninGunu(haftaBaslangici) !== 0) {
    return { error: "Hafta başlangıcı geçersiz.", silinen: 0, cikarilan: 0 };
  }
  // BİLİNÇLİ: haftayı temizleme yalnız ÖĞRENCİYE açık. Rehberin öğrencinin
  // haftasını silmesi, "öğrenci kısıtla sistemden uzaklaşmasın" ilkesinin
  // tersi olurdu.
  const oturum = await programAktoru();
  if (oturum.error !== null) return { error: oturum.error, silinen: 0, cikarilan: 0 };
  const { userId } = oturum;

  const admin = createAdminClient();
  const haftaSonu = gunEkle(haftaBaslangici, 6);
  const { data: kalemler, error } = await admin
    .from("gorev_atamalari")
    .select("id, gorev_id, gorevler!inner(olusturan_ogrenci_id)")
    .eq("student_id", userId)
    .eq("programa_eklendi_mi", true)
    .eq("durum", "bekliyor")
    .gte("ogrenci_tarih", haftaBaslangici)
    .lte("ogrenci_tarih", haftaSonu);
  if (error) return { error: error.message, silinen: 0, cikarilan: 0 };

  type Satir = { id: string; gorev_id: string; gorevler: { olusturan_ogrenci_id: string | null } | { olusturan_ogrenci_id: string | null }[] | null };
  const tek = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  const satirlar = (kalemler ?? []) as unknown as Satir[];
  const kendiGorevIdleri = [...new Set(satirlar.filter((k) => tek(k.gorevler)?.olusturan_ogrenci_id === userId).map((k) => k.gorev_id))];
  const ogretmenAtamaIdleri = satirlar.filter((k) => tek(k.gorevler)?.olusturan_ogrenci_id !== userId).map((k) => k.id);

  if (kendiGorevIdleri.length > 0) {
    const { error: silmeHatasi } = await admin.from("gorevler").delete().in("id", kendiGorevIdleri);
    if (silmeHatasi) return { error: silmeHatasi.message, silinen: 0, cikarilan: 0 };
  }
  if (ogretmenAtamaIdleri.length > 0) {
    const { error: cikarmaHatasi } = await admin.from("gorev_atamalari")
      .update({ programa_eklendi_mi: false, ogrenci_tarih: null, ogrenci_baslangic_saat: null, ogrenci_bitis_saat: null })
      .in("id", ogretmenAtamaIdleri)
      .eq("student_id", userId);
    if (cikarmaHatasi) return { error: cikarmaHatasi.message, silinen: kendiGorevIdleri.length, cikarilan: 0 };
  }

  revalidatePath("/dashboard");
  return { error: null, silinen: kendiGorevIdleri.length, cikarilan: ogretmenAtamaIdleri.length };
}

export async function otoProgramHazirla(baslangicTarihi: string, kapsam: ProgramKapsami, ogrenciId?: string): Promise<{ error: string | null; veri: OtoProgramVerisi | null }> {
  const hata = donemHatasi(baslangicTarihi, kapsam);
  if (hata) return { error: hata, veri: null };
  const oturum = await programAktoru(ogrenciId);
  if (oturum.error !== null) return { error: oturum.error, veri: null };
  return otoProgramVerisiGetir(oturum.supabase, oturum.userId, baslangicTarihi, KAPSAM_HAFTA_SAYISI[kapsam]);
}

export async function otoProgramUygula(input: {
  baslangicTarihi: string;
  kapsam: ProgramKapsami;
  ayar: OtoProgramAyari;
  bloklar: ProgramBlogu[];
  // Rehber, kapsamındaki öğrenci adına çalıştırıyorsa.
  ogrenciId?: string;
}): Promise<{ error: string | null; eklenen: number }> {
  const hata = donemHatasi(input.baslangicTarihi, input.kapsam);
  if (hata) return { error: hata, eklenen: 0 };
  const oturum = await programAktoru(input.ogrenciId);
  if (oturum.error !== null) return { error: oturum.error, eklenen: 0 };
  const { supabase, userId, rehberId } = oturum;

  const haftaSayisi = KAPSAM_HAFTA_SAYISI[input.kapsam];
  const { error: veriHatasi, veri } = await otoProgramVerisiGetir(supabase, userId, input.baslangicTarihi, haftaSayisi);
  if (veriHatasi || !veri) return { error: veriHatasi ?? "Program verisi alınamadı.", eklenen: 0 };

  const ayarSorunu = ayarHatasi(input.ayar, veri.okulOgrencisi, veri.dersListesi);
  if (ayarSorunu) return { error: ayarSorunu, eklenen: 0 };
  const blokSorunu = bloklariDogrula(input.bloklar, veri);
  if (blokSorunu) return { error: blokSorunu, eklenen: 0 };

  // Saklanan ayar yalnızca bilinen alanlardan.
  const ayar: OtoProgramAyari = {
    gunler: [...new Set(input.ayar.gunler)].sort((a, b) => a - b),
    haftaIciPeriyotlari: input.ayar.haftaIciPeriyotlari.map((p) => ({ baslangic: p.baslangic, bitis: p.bitis })),
    haftaSonuPeriyotlari: input.ayar.haftaSonuPeriyotlari.map((p) => ({ baslangic: p.baslangic, bitis: p.bitis })),
    dersler: input.ayar.dersler.map((d) => ({ ders: d.ders, agirlik: d.agirlik })),
    konulariSefuSecsin: input.ayar.konulariSefuSecsin !== false,
  };

  const admin = createAdminClient();
  const donemSonu = gunEkle(input.baslangicTarihi, haftaSayisi * 7 - 1);

  const { data: eskiKalemler, error: eskiHatasi } = await admin
    .from("gorev_atamalari")
    .select("gorev_id, gorevler!inner(oto_program_id)")
    .eq("student_id", userId)
    .eq("programa_eklendi_mi", true)
    .eq("durum", "bekliyor")
    .gte("ogrenci_tarih", input.baslangicTarihi)
    .lte("ogrenci_tarih", donemSonu)
    .not("gorevler.oto_program_id", "is", null);
  if (eskiHatasi) return { error: eskiHatasi.message, eklenen: 0 };

  const programId = randomUUID();
  const { error: programHatasi } = await admin.from("ogrenci_oto_programlari").insert({
    id: programId, student_id: userId, ayar,
    baslangic_tarihi: input.baslangicTarihi, bitis_tarihi: donemSonu, kapsam: input.kapsam,
    // null = öğrenci kendi hazırladı. blok_sayisi, geri bildirimde
    // "kaçı silindi" ölçümünün referansı (bkz. migration 0146).
    hazirlayan_rehber_id: rehberId,
    blok_sayisi: input.bloklar.length,
  });
  if (programHatasi) return { error: programHatasi.message, eklenen: 0 };

  const planlar = input.bloklar.filter((b) => !b.atamaId).map((b) => ({ id: randomUUID(), blok: b }));
  if (planlar.length > 0) {
    const { error: gorevHatasi } = await admin.from("gorevler").insert(planlar.map(({ id, blok }) => ({
      id,
      olusturan_ogrenci_id: userId,
      oto_program_id: programId,
      tur: blok.tur,
      ders: blok.ders,
      konu: blok.konu?.trim() || null,
      tarih: blok.tarih,
      son_tarih: blok.tarih,
      baslangic_saat: blok.baslangic,
      bitis_saat: blok.bitis,
    })));
    if (gorevHatasi) {
      await admin.from("ogrenci_oto_programlari").delete().eq("id", programId);
      return { error: gorevHatasi.message, eklenen: 0 };
    }
    const { error: atamaHatasi } = await admin.from("gorev_atamalari").insert(planlar.map(({ id, blok }) => ({
      gorev_id: id,
      student_id: userId,
      programa_eklendi_mi: true,
      ogrenci_tarih: blok.tarih,
      ogrenci_baslangic_saat: blok.baslangic,
      ogrenci_bitis_saat: blok.bitis,
    })));
    if (atamaHatasi) {
      await admin.from("gorevler").delete().eq("oto_program_id", programId);
      await admin.from("ogrenci_oto_programlari").delete().eq("id", programId);
      return { error: atamaHatasi.message, eklenen: 0 };
    }
  }

  // Yeni program yazıldıktan sonra aynı dönemdeki eski oto program kalemleri kaldırılır.
  const eskiGorevIdleri = [...new Set(((eskiKalemler ?? []) as { gorev_id: string }[]).map((k) => k.gorev_id))];
  if (eskiGorevIdleri.length > 0) await admin.from("gorevler").delete().in("id", eskiGorevIdleri);

  // Saatsiz öğretmen ödevleri önerilen saate yerleşir.
  for (const blok of input.bloklar.filter((b) => b.atamaId)) {
    await admin.from("gorev_atamalari").update({
      programa_eklendi_mi: true,
      ogrenci_tarih: blok.tarih,
      ogrenci_baslangic_saat: blok.baslangic,
      ogrenci_bitis_saat: blok.bitis,
    }).eq("id", blok.atamaId as string).eq("student_id", userId).eq("programa_eklendi_mi", false);
  }

  revalidatePath("/dashboard");
  return { error: null, eklenen: input.bloklar.length };
}
