"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rehberlikUyeligiGetir } from "@/lib/rehberlik-servisi";

// Rehberin hazırladığı programların AKIBETİ (kullanıcı kararı 07.10.2026:
// "öğrenci kısıtla sistemden uzaklaşmasın rehberlik servisinin etkinliği de
// körelmesin").
//
// Denge şöyle kuruldu: öğrenciyi KISITLAMIYORUZ (program onun kendi görevi,
// taşır da siler de), rehberin etkinliğini de GERİ BİLDİRİMLE koruyoruz.
// Rehber kilitle değil, sonucu görerek etkili olur:
//   - kaç blok ayakta duruyor
//   - kaçı tamamlandı
//   - kaçı silindi (blok_sayisi referansıyla, bkz. migration 0146)
// "Silindi" bir başarısızlık işareti DEĞİL; bir sonraki görüşmede
// konuşulacak bir veri. Bu yüzden ekranda yargı dili kullanılmıyor.

export interface ProgramAkibeti {
  programId: string;
  ogrenciId: string;
  ogrenciAdi: string;
  sinifAdi: string;
  baslangic: string;
  bitis: string;
  hazirlananBlok: number;
  tamamlanan: number;
  bekleyen: number;
  // hazirlananBlok - (tamamlanan + bekleyen + tamamlanmayan)
  silinen: number;
  tamamlanmayan: number;
}

export async function rehberProgramAkibetleri(): Promise<{ error: string | null; programlar: ProgramAkibeti[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum açılmadı.", programlar: [] };
  const uyelik = await rehberlikUyeligiGetir(supabase, user.id);
  if (!uyelik) return { error: "Bu bölüm sadece Rehberlik Servisi üyelerine açıktır.", programlar: [] };

  // Yetki yukarıda doğrulandı; sorgu hazirlayan_rehber_id ile KENDİ
  // programlarına sabitlendiği için servis anahtarı burada güvenli.
  const admin = createAdminClient();
  const { data: programlar, error } = await admin
    .from("ogrenci_oto_programlari")
    .select("id, student_id, baslangic_tarihi, bitis_tarihi, blok_sayisi, students!inner(profiles!students_id_fkey(ad), classes(seviye, sube))")
    .eq("hazirlayan_rehber_id", user.id)
    .order("baslangic_tarihi", { ascending: false })
    .limit(50);
  if (error) return { error: "Program kayıtları okunamadı.", programlar: [] };

  const satirlar = (programlar ?? []) as unknown as {
    id: string; student_id: string; baslangic_tarihi: string; bitis_tarihi: string; blok_sayisi: number;
    students: {
      profiles: { ad: string } | { ad: string }[] | null;
      classes: { seviye: string; sube: string } | { seviye: string; sube: string }[] | null;
    } | null;
  }[];
  if (satirlar.length === 0) return { error: null, programlar: [] };

  // Her programın hâlâ var olan görev atamaları tek toplu sorguda.
  const { data: atamalar } = await admin
    .from("gorev_atamalari")
    .select("durum, gorevler!inner(oto_program_id)")
    .in("gorevler.oto_program_id", satirlar.map((p) => p.id));

  type AtamaRow = { durum: string; gorevler: { oto_program_id: string | null } | { oto_program_id: string | null }[] | null };
  const tekil = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const sayac = new Map<string, { tamamlanan: number; bekleyen: number; tamamlanmayan: number }>();
  for (const a of ((atamalar ?? []) as unknown as AtamaRow[])) {
    const pid = tekil(a.gorevler)?.oto_program_id;
    if (!pid) continue;
    const mevcut = sayac.get(pid) ?? { tamamlanan: 0, bekleyen: 0, tamamlanmayan: 0 };
    if (a.durum === "tamamlandi") mevcut.tamamlanan += 1;
    else if (a.durum === "tamamlanmadi") mevcut.tamamlanmayan += 1;
    else mevcut.bekleyen += 1;
    sayac.set(pid, mevcut);
  }

  return {
    error: null,
    programlar: satirlar.map((p) => {
      const ogrenci = tekil(p.students?.profiles ?? null);
      const sinif = tekil(p.students?.classes ?? null);
      const s = sayac.get(p.id) ?? { tamamlanan: 0, bekleyen: 0, tamamlanmayan: 0 };
      const ayakta = s.tamamlanan + s.bekleyen + s.tamamlanmayan;
      return {
        programId: p.id,
        ogrenciId: p.student_id,
        ogrenciAdi: ogrenci?.ad ?? "İsimsiz",
        sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "—",
        baslangic: p.baslangic_tarihi,
        bitis: p.bitis_tarihi,
        hazirlananBlok: p.blok_sayisi,
        tamamlanan: s.tamamlanan,
        bekleyen: s.bekleyen,
        tamamlanmayan: s.tamamlanmayan,
        // Negatife düşmesin: blok_sayisi 0 olan eski kayıtlar olabilir.
        silinen: Math.max(0, p.blok_sayisi - ayakta),
      };
    }),
  };
}
