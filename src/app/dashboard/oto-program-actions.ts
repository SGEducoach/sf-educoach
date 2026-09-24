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

// SeFu Oto Program (kullanıcı isteği 13.09.2026) — öğrenci sihirbazda
// ayarları seçer, program istemcide (lib/oto-program.ts) önizlenir ve
// düzeltilir; kayıt yalnızca "Onayla"da. Sunucu verileri yeniden okur ve
// ayarları + her kalemi aynı kurallarla doğrular, sonra servis anahtarıyla
// yazar (öğrencinin gorevler tablosunda silme izni yok; aynı döneme
// uygulanmış önceki oto programın bekleyen kalemleri değiştirilir).

async function ogrenciOturumu(): Promise<{ error: string; supabase: null; userId: null } | { error: null; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açılmadı.", supabase: null, userId: null };
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role !== "ogrenci") return { error: "Oto program yalnızca öğrenci hesabında kullanılabilir.", supabase: null, userId: null };
  return { error: null, supabase, userId: user.id };
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

export async function otoProgramHazirla(baslangicTarihi: string, kapsam: ProgramKapsami): Promise<{ error: string | null; veri: OtoProgramVerisi | null }> {
  const hata = donemHatasi(baslangicTarihi, kapsam);
  if (hata) return { error: hata, veri: null };
  const oturum = await ogrenciOturumu();
  if (oturum.error !== null) return { error: oturum.error, veri: null };
  return otoProgramVerisiGetir(oturum.supabase, oturum.userId, baslangicTarihi, KAPSAM_HAFTA_SAYISI[kapsam]);
}

export async function otoProgramUygula(input: {
  baslangicTarihi: string;
  kapsam: ProgramKapsami;
  ayar: OtoProgramAyari;
  bloklar: ProgramBlogu[];
}): Promise<{ error: string | null; eklenen: number }> {
  const hata = donemHatasi(input.baslangicTarihi, input.kapsam);
  if (hata) return { error: hata, eklenen: 0 };
  const oturum = await ogrenciOturumu();
  if (oturum.error !== null) return { error: oturum.error, eklenen: 0 };
  const { supabase, userId } = oturum;

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
