import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { YardimDurumu, YardimIstegi } from "@/lib/ortaokul-yardim";

// "Yardım İste" ekranının verisi (migration 0129). Saf doğrulama ve metinler
// ortaokul-yardim.ts'te.

interface IstekSatiri {
  id: string;
  ders_adi: string;
  mesaj: string | null;
  durum: string;
  yanit: string | null;
  created_at: string;
  ilgilenen_id: string | null;
  ortaokul_mufredat_kazanimlari: { kod: string; metin: string | null } | null;
}

function durumCoz(ham: string): YardimDurumu {
  return ham === "goruldu" || ham === "cozuldu" ? ham : "yeni";
}

export async function ortaokulYardimIstekleriGetir(
  supabase: SupabaseClient,
  studentId: string,
): Promise<YardimIstegi[]> {
  const { data } = await supabase
    .from("ortaokul_yardim_istekleri")
    .select("id, ders_adi, mesaj, durum, yanit, created_at, ilgilenen_id, ortaokul_mufredat_kazanimlari(kod, metin)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  const satirlar = (data ?? []) as unknown as IstekSatiri[];

  // İsteği üstlenen öğretmenin adı: öğrenci kiminle muhatap olduğunu bilsin.
  const ilgilenenler = [...new Set(satirlar.map((s) => s.ilgilenen_id).filter((x): x is string => !!x))];
  const adlar = new Map<string, string>();
  if (ilgilenenler.length > 0) {
    const { data: profiller } = await supabase.from("profiles").select("id, ad").in("id", ilgilenenler);
    for (const p of ((profiller ?? []) as { id: string; ad: string | null }[])) {
      if (p.ad) adlar.set(p.id, p.ad);
    }
  }

  return satirlar.map((s) => ({
    id: s.id,
    dersAdi: s.ders_adi,
    // Supabase gömülü ilişki çalışma anında NESNE döner (bkz. proje notu).
    kazanimKodu: s.ortaokul_mufredat_kazanimlari?.kod ?? null,
    kazanimMetni: s.ortaokul_mufredat_kazanimlari?.metin ?? null,
    mesaj: s.mesaj,
    durum: durumCoz(s.durum),
    ilgilenenAdi: s.ilgilenen_id ? adlar.get(s.ilgilenen_id) ?? null : null,
    yanit: s.yanit,
    olusturmaTarihi: s.created_at,
  }));
}
