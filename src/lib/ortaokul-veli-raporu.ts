import type { SupabaseClient } from "@supabase/supabase-js";
import { netHesapla } from "@/lib/types";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

// Ortaokul velisinin raporu (O1, 08.10.2026) — ortaokul panelini lise
// izlerinden arındırma yol haritası.
//
// SORUN: VELI_MENUSU kademeden tamamen habersizdi (`if (role === "veli")
// return VELI_MENUSU;`) ve "Analiz / Rapor" doğrudan AnalizPaneli'ni
// açıyordu. AnalizPaneli TYT ve AYT çizgilerini SABİT KODLUYOR
// (satır 205-206) ve analiz.ts içinde "ortaokul" kelimesi HİÇ geçmiyor.
// Sonuç: 5. sınıf velisi çocuğu için TYT/AYT net trendi görüyordu.
//
// BU RAPOR YKS'Yİ TAKLİT ETMİYOR. Ortaokul velisinin gerçekten bilmek
// istediği şey şu üçü:
//   1. Çocuk ne kadar çalıştı (süre + ders dökümü)
//   2. Verilen görevler ne oldu
//   3. Öğretmen hangi temalarda ne karar verdi
//
// YARDIM İSTEKLERİ BİLİNÇLİ OLARAK DIŞARIDA: çocuğun öğretmene uzanması
// özel kalmalı. Veliye raporlanırsa çocuk yardım istemekten çekinir —
// ortaokul panelinin kendi ilkesiyle (bilişsel yük ve çekinme sınırı)
// çelişir. Aynı gerekçe rehberlik görüşme kayıtlarında da uygulandı.

const PENCERE_GUN = 30;

export interface DersCalismasi {
  ders: string;
  konuSayisi: number;
  soruSayisi: number;
  dakika: number;
  dogru: number;
  yanlis: number;
  bos: number;
  // Ortaokul formülü: D − Y/3 (kullanıcı kararı 08.10.2026). Soru çalışması
  // yoksa null — sıfırla karıştırılmasın.
  net: number | null;
}

export interface TemaKarari {
  tema: string;
  ders: string;
  durum: string;
  aciklama: string | null;
}

export interface OrtaokulVeliRaporu {
  pencereGun: number;
  toplamDakika: number;
  konuCalismasi: number;
  soruCalismasi: number;
  dersler: DersCalismasi[];
  gorevVerilen: number;
  gorevTamamlanan: number;
  gorevBekleyen: number;
  kararlar: TemaKarari[];
  // Hiç veri yoksa ekran "boş grafik" göstermek yerine bunu söyler.
  veriVarMi: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export async function ortaokulVeliRaporuGetir(
  supabase: Istemci,
  studentId: string,
): Promise<OrtaokulVeliRaporu> {
  const baslangic = tarihEkle(bugununTarihiTR(), -(PENCERE_GUN - 1));

  const [calismalar, gorevler, yeterlilikler] = await Promise.all([
    supabase
      .from("ortaokul_calismalar")
      .select("tur, tarih, sure_dakika, dogru, yanlis, bos, ortaokul_mufredat_dersleri(ad)")
      .eq("student_id", studentId)
      .gte("tarih", baslangic),
    supabase
      .from("gorev_atamalari")
      .select("durum")
      .eq("student_id", studentId),
    supabase
      .from("ortaokul_konu_yeterlilikleri")
      .select("durum, aciklama, ortaokul_mufredat_temalari(ad, ortaokul_mufredat_dersleri(ad))")
      .eq("student_id", studentId)
      .order("guncellenme_at", { ascending: false })
      .limit(40),
  ]);

  // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür (proje notu).
  const tekil = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  type CalismaRow = {
    tur: string; tarih: string; sure_dakika: number | null;
    dogru: number | null; yanlis: number | null; bos: number | null;
    ortaokul_mufredat_dersleri: { ad: string } | { ad: string }[] | null;
  };

  const dersMap = new Map<string, DersCalismasi>();
  let toplamDakika = 0;
  let konuCalismasi = 0;
  let soruCalismasi = 0;

  for (const c of ((calismalar.data ?? []) as unknown as CalismaRow[])) {
    const ders = tekil(c.ortaokul_mufredat_dersleri)?.ad ?? "Belirtilmemiş";
    const mevcut = dersMap.get(ders) ?? {
      ders, konuSayisi: 0, soruSayisi: 0, dakika: 0, dogru: 0, yanlis: 0, bos: 0, net: null,
    };
    mevcut.dakika += c.sure_dakika ?? 0;
    toplamDakika += c.sure_dakika ?? 0;
    if (c.tur === "soru") {
      mevcut.soruSayisi += 1;
      soruCalismasi += 1;
      mevcut.dogru += c.dogru ?? 0;
      mevcut.yanlis += c.yanlis ?? 0;
      mevcut.bos += c.bos ?? 0;
    } else {
      mevcut.konuSayisi += 1;
      konuCalismasi += 1;
    }
    dersMap.set(ders, mevcut);
  }

  for (const d of dersMap.values()) {
    // Net YALNIZCA soru çalışması varsa anlamlı.
    d.net = d.soruSayisi > 0 ? netHesapla(d.dogru, d.yanlis, "ortaokul") : null;
  }

  const gorevSatirlari = (gorevler.data ?? []) as { durum: string }[];
  const gorevTamamlanan = gorevSatirlari.filter((g) => g.durum === "tamamlandi").length;
  const gorevBekleyen = gorevSatirlari.filter((g) => g.durum === "bekliyor").length;

  type YeterlilikRow = {
    durum: string; aciklama: string | null;
    ortaokul_mufredat_temalari: {
      ad: string;
      ortaokul_mufredat_dersleri: { ad: string } | { ad: string }[] | null;
    } | { ad: string; ortaokul_mufredat_dersleri: { ad: string } | { ad: string }[] | null }[] | null;
  };
  const kararlar: TemaKarari[] = ((yeterlilikler.data ?? []) as unknown as YeterlilikRow[]).map((y) => {
    const tema = tekil(y.ortaokul_mufredat_temalari);
    return {
      tema: tema?.ad ?? "—",
      ders: tekil(tema?.ortaokul_mufredat_dersleri ?? null)?.ad ?? "—",
      durum: y.durum,
      aciklama: y.aciklama,
    };
  });

  const dersler = [...dersMap.values()].sort((a, b) => b.dakika - a.dakika);

  return {
    pencereGun: PENCERE_GUN,
    toplamDakika,
    konuCalismasi,
    soruCalismasi,
    dersler,
    gorevVerilen: gorevSatirlari.length,
    gorevTamamlanan,
    gorevBekleyen,
    kararlar,
    veriVarMi: dersler.length > 0 || gorevSatirlari.length > 0 || kararlar.length > 0,
  };
}
