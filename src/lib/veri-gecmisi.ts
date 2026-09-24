import type { SupabaseClient } from "@supabase/supabase-js";
import { netHesapla } from "@/lib/types";
import { tarihEkle } from "@/lib/tarih";

// Öğrenci geri bildirimi (22.09.2026): "veri girdiğim kısımda bir haftalık
// gösterim olsun, dün ne yapmışım göremiyorum." Öğrenci bugüne kadar girdiği
// kayıtları hiçbir ekranda tek tek göremiyordu (özet ve analiz yalnızca
// toplam/grafik). Bu modül son 7 günün kayıtlarını güne göre gruplayıp
// döndürür — SALT OKUNUR; silme/düzenleme yok (geçmiş veri değişirse analiz
// ve öğretmen görünümü bozulur).

export type VeriKaydiTuru = "konu" | "soru" | "deneme";

export interface VeriKaydi {
  id: string;
  tur: VeriKaydiTuru;
  baslik: string;
  detay: string;
  // Görevden mi geldi (ödev/program karşılığı) — satırda rozet olarak görünür.
  gorevden: boolean;
  // Öğrenci adına dershane rehberi girdiyse.
  rehberGirdi: boolean;
}

export interface GunGecmisi {
  tarih: string;
  konuDakika: number;
  soru: number;
  denemeSayisi: number;
  kayitlar: VeriKaydi[];
}

function bosGun(tarih: string): GunGecmisi {
  return { tarih, konuDakika: 0, soru: 0, denemeSayisi: 0, kayitlar: [] };
}

export function gunAraligi(baslangic: string, gunSayisi: number): string[] {
  return Array.from({ length: gunSayisi }, (_, i) => tarihEkle(baslangic, i));
}

export async function veriGecmisiGetir(
  supabase: SupabaseClient, studentId: string, baslangic: string, bitis: string,
): Promise<GunGecmisi[]> {
  const [{ data: konular }, { data: sorular }, { data: denemeler }] = await Promise.all([
    supabase.from("konu_calismalar")
      .select("id, tarih, ders, konu, sure_dakika, yayinevi, gorev_atama_id, giren_rehber_id")
      .eq("student_id", studentId).gte("tarih", baslangic).lte("tarih", bitis).order("created_at"),
    supabase.from("soru_cozumleri")
      .select("id, tarih, ders, konu, dogru, yanlis, bos, sure_dakika, yayinevi, gorev_atama_id, giren_rehber_id")
      .eq("student_id", studentId).gte("tarih", baslangic).lte("tarih", bitis).order("created_at"),
    supabase.from("denemeler")
      .select("id, tarih, tur, yayinevi, sure_dakika, gorev_atama_id, giren_rehber_id, deneme_ders_sonuclari(dogru, yanlis)")
      .eq("student_id", studentId).gte("tarih", baslangic).lte("tarih", bitis).order("created_at"),
  ]);

  const gunler = new Map<string, GunGecmisi>();
  const gun = (tarih: string) => {
    const mevcut = gunler.get(tarih) ?? bosGun(tarih);
    gunler.set(tarih, mevcut);
    return mevcut;
  };

  type KonuRow = { id: string; tarih: string; ders: string; konu: string; sure_dakika: number; yayinevi: string | null; gorev_atama_id: string | null; giren_rehber_id: string | null };
  for (const k of ((konular ?? []) as unknown as KonuRow[])) {
    const g = gun(k.tarih);
    g.konuDakika += k.sure_dakika;
    g.kayitlar.push({
      id: k.id, tur: "konu", baslik: `${k.ders} · ${k.konu}`,
      detay: `${k.sure_dakika} dk${k.yayinevi ? ` · ${k.yayinevi}` : ""}`,
      gorevden: !!k.gorev_atama_id, rehberGirdi: !!k.giren_rehber_id,
    });
  }

  type SoruRow = { id: string; tarih: string; ders: string; konu: string | null; dogru: number; yanlis: number; bos: number; sure_dakika: number; yayinevi: string | null; gorev_atama_id: string | null; giren_rehber_id: string | null };
  for (const s of ((sorular ?? []) as unknown as SoruRow[])) {
    const g = gun(s.tarih);
    g.soru += s.dogru + s.yanlis + s.bos;
    g.kayitlar.push({
      id: s.id, tur: "soru", baslik: `${s.ders}${s.konu ? ` · ${s.konu}` : ""}`,
      detay: `${s.dogru + s.yanlis + s.bos} soru · ${s.dogru}D ${s.yanlis}Y ${s.bos}B · ${s.sure_dakika} dk${s.yayinevi ? ` · ${s.yayinevi}` : ""}`,
      gorevden: !!s.gorev_atama_id, rehberGirdi: !!s.giren_rehber_id,
    });
  }

  type DenemeRow = { id: string; tarih: string; tur: string; yayinevi: string | null; sure_dakika: number | null; gorev_atama_id: string | null; giren_rehber_id: string | null; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] };
  for (const d of ((denemeler ?? []) as unknown as DenemeRow[])) {
    const g = gun(d.tarih);
    g.denemeSayisi += 1;
    const net = (d.deneme_ders_sonuclari ?? []).reduce((t, s) => t + netHesapla(s.dogru, s.yanlis), 0);
    g.kayitlar.push({
      id: d.id, tur: "deneme", baslik: `${d.tur} denemesi${d.yayinevi ? ` · ${d.yayinevi}` : ""}`,
      detay: `${Math.round(net * 100) / 100} net${d.sure_dakika ? ` · ${d.sure_dakika} dk` : ""}`,
      gorevden: !!d.gorev_atama_id, rehberGirdi: !!d.giren_rehber_id,
    });
  }

  // Kayıt olmayan günler de listede yer alır ("o gün hiçbir şey girmemişsin"
  // bilgisi de öğrenci için bir bilgi) — en yeni gün en üstte.
  const tumGunler = gunAraligi(baslangic, Math.round((new Date(bitis).getTime() - new Date(baslangic).getTime()) / 86400000) + 1);
  return tumGunler.map((t) => gunler.get(t) ?? bosGun(t)).reverse();
}

// Geçmiş günlerde tamamlanmamış işler (kullanıcı isteği 23.09.2026): öğrenci
// "günü geçti, işleyemiyorum" sanıyordu. Bunlar artık özet ekranında
// gösteriliyor ve doğrudan o günün programına götürüyor.
export interface GecikmisIs {
  atamaId: string;
  tur: string;
  ders: string;
  konu: string | null;
  tarih: string;
}

export async function gecikmisIslerGetir(
  supabase: SupabaseClient, studentId: string, bugun: string, gunSayisi = 5,
): Promise<GecikmisIs[]> {
  const enEski = tarihEkle(bugun, -gunSayisi);
  const { data } = await supabase.from("gorev_atamalari")
    .select("id, ogrenci_tarih, gorevler!inner(tur, ders, konu, tarih)")
    .eq("student_id", studentId)
    .eq("durum", "bekliyor")
    .gte("gorevler.tarih", tarihEkle(enEski, -7))
    .lte("gorevler.tarih", bugun);

  type Row = { id: string; ogrenci_tarih: string | null; gorevler: { tur: string; ders: string; konu: string | null; tarih: string } | { tur: string; ders: string; konu: string | null; tarih: string }[] | null };
  const tek = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  return ((data ?? []) as unknown as Row[])
    .flatMap((r) => {
      const g = tek(r.gorevler);
      if (!g) return [];
      // Öğrenci görevi programında başka bir güne aldıysa geçerli tarih odur.
      const tarih = r.ogrenci_tarih ?? g.tarih;
      if (tarih >= bugun || tarih < enEski) return [];
      return [{ atamaId: r.id, tur: g.tur, ders: g.ders, konu: g.konu, tarih }];
    })
    .sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
}
