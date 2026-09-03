import type { SupabaseClient } from "@supabase/supabase-js";
import { netHesapla } from "@/lib/types";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

// Dershane müdürü "Ana Sayfa" — kurum geneli + kademe (9./10./11./12.
// sınıf) bazlı haftalık performans. Kullanıcı isteği: "genel kurum
// performansı, kademeye bağlı performans... bu hafta çözülen toplam soru
// sayısı, tüm kurumun genel net ortalaması, kademe düzeyinde net
// ortalaması gibi verileri haftalık grafik olarak görecek." — son 8
// hafta (kullanıcı onayı), kayan 7 günlük pencereler (analiz.ts'teki
// "bu hafta" = son 7 gün deseniyle tutarlı, takvim haftası değil).
const HAFTA_SAYISI = 8;
const HAFTA_GUN = 7;

export interface HaftalikNokta {
  haftaBaslangic: string; // YYYY-MM-DD, o 7 günlük pencerenin ilk günü
  netOrtalama: number | null; // o pencerede hiç deneme yoksa null (0 ile karıştırılmasın)
  soruSayisi: number; // dogru+yanlis toplamı — analiz.ts'teki buHaftaSoru ile AYNI formül
  denemeSayisi: number;
}

export interface DershaneAnaSayfaVerisi {
  ogrenciSayisi: number;
  // Kurum geneli — 8 hafta, ESKİDEN YENİYE sıralı (grafik X ekseni için).
  genel: HaftalikNokta[];
  // Sadece bu kurumda GERÇEKTEN öğrencisi olan kademeler (örn. kurumda
  // sadece 9-10. sınıf varsa 11-12 hiç dönmez, boş çizgi göstermez).
  kademeler: { seviye: string; noktalar: HaftalikNokta[] }[];
  siniflar: { id: string; ad: string; noktalar: HaftalikNokta[] }[];
}

function gunFarkiHesapla(bugun: string, tarih: string): number {
  const a = new Date(`${bugun}T12:00:00Z`).getTime();
  const b = new Date(`${tarih}T12:00:00Z`).getTime();
  return Math.round((a - b) / (1000 * 3600 * 24));
}

// bucketIndex 0 = en yeni (son 7 gün), HAFTA_SAYISI-1 = en eski.
function bucketIndexHesapla(bugun: string, tarih: string): number | null {
  const fark = gunFarkiHesapla(bugun, tarih);
  if (fark < 0) return null; // gelecekteki bir tarih (saat dilimi kayması vb.) — yok say
  const idx = Math.floor(fark / HAFTA_GUN);
  return idx < HAFTA_SAYISI ? idx : null;
}

interface Biriken { netToplam: number; denemeSayisi: number; soruSayisi: number }
function bosBiriken(): Biriken { return { netToplam: 0, denemeSayisi: 0, soruSayisi: 0 }; }

function noktalariOlustur(bugun: string, bucketlar: Map<number, Biriken>): HaftalikNokta[] {
  const noktalar: HaftalikNokta[] = [];
  for (let idx = HAFTA_SAYISI - 1; idx >= 0; idx--) {
    const haftaBaslangic = tarihEkle(bugun, -(idx * HAFTA_GUN + (HAFTA_GUN - 1)));
    const b = bucketlar.get(idx);
    noktalar.push({
      haftaBaslangic,
      netOrtalama: b && b.denemeSayisi > 0 ? Math.round((b.netToplam / b.denemeSayisi) * 100) / 100 : null,
      soruSayisi: b?.soruSayisi ?? 0,
      denemeSayisi: b?.denemeSayisi ?? 0,
    });
  }
  return noktalar;
}

export async function dershaneAnaSayfaVerisiGetir(
  admin: SupabaseClient,
  schoolId: string,
): Promise<DershaneAnaSayfaVerisi> {
  const bugun = bugununTarihiTR();
  const baslangicTarihi = tarihEkle(bugun, -(HAFTA_SAYISI * HAFTA_GUN - 1));

  const { data: ogrencilerHam } = await admin
    .from("students")
    .select("id, classes(id,seviye,sube)")
    .eq("school_id", schoolId);
  type OgrenciRow = { id: string; classes: { id:string; seviye: string; sube:string } | null };
  const ogrenciler = (ogrencilerHam ?? []) as unknown as OgrenciRow[];
  const seviyeMap = new Map<string, string>();
  const sinifMap = new Map<string, {id:string;ad:string}>();
  for (const o of ogrenciler) if (o.classes) { seviyeMap.set(o.id, o.classes.seviye); sinifMap.set(o.id,{id:o.classes.id,ad:`${o.classes.seviye}-${o.classes.sube}`}); }
  const studentIds = ogrenciler.map((o) => o.id);
  const gorulenSeviyeler = [...new Set(seviyeMap.values())].sort();
  const gorulenSiniflar = [...new Map([...sinifMap.values()].map(x=>[x.id,x])).values()].sort((a,b)=>a.ad.localeCompare(b.ad,"tr",{numeric:true}));

  const genelBucket = new Map<number, Biriken>();
  const kademeBucket = new Map<string, Map<number, Biriken>>();
  const sinifBucket = new Map<string, Map<number, Biriken>>();
  for (const seviye of gorulenSeviyeler) kademeBucket.set(seviye, new Map());
  for (const sinif of gorulenSiniflar) sinifBucket.set(sinif.id,new Map());

  function bicimEkle(idx: number, seviye: string | null, sinifId:string|null, deltaNet: number, deltaDeneme: number, deltaSoru: number) {
    const guncelle = (m: Map<number, Biriken>) => {
      const mevcut = m.get(idx) ?? bosBiriken();
      mevcut.netToplam += deltaNet;
      mevcut.denemeSayisi += deltaDeneme;
      mevcut.soruSayisi += deltaSoru;
      m.set(idx, mevcut);
    };
    guncelle(genelBucket);
    if (seviye) { const m = kademeBucket.get(seviye); if (m) guncelle(m); }
    if (sinifId) { const m=sinifBucket.get(sinifId); if(m) guncelle(m); }
  }

  if (studentIds.length > 0) {
    type DenemeRow = { student_id: string; tarih: string; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] };
    type SoruRow = { student_id: string; tarih: string; dogru: number; yanlis: number };
    const [{ data: denemelerHam }, { data: sorularHam }] = await Promise.all([
      admin.from("denemeler").select("student_id, tarih, deneme_ders_sonuclari(dogru, yanlis)")
        .in("student_id", studentIds).gte("tarih", baslangicTarihi),
      admin.from("soru_cozumleri").select("student_id, tarih, dogru, yanlis")
        .in("student_id", studentIds).gte("tarih", baslangicTarihi),
    ]);

    for (const d of (denemelerHam ?? []) as unknown as DenemeRow[]) {
      const idx = bucketIndexHesapla(bugun, d.tarih);
      if (idx === null) continue;
      const net = d.deneme_ders_sonuclari.reduce((t, s) => t + netHesapla(s.dogru, s.yanlis), 0);
      bicimEkle(idx, seviyeMap.get(d.student_id) ?? null, sinifMap.get(d.student_id)?.id??null, net, 1, 0);
    }
    for (const s of (sorularHam ?? []) as unknown as SoruRow[]) {
      const idx = bucketIndexHesapla(bugun, s.tarih);
      if (idx === null) continue;
      bicimEkle(idx, seviyeMap.get(s.student_id) ?? null, sinifMap.get(s.student_id)?.id??null, 0, 0, s.dogru + s.yanlis);
    }
  }

  return {
    ogrenciSayisi: studentIds.length,
    genel: noktalariOlustur(bugun, genelBucket),
    kademeler: gorulenSeviyeler.map((seviye) => ({ seviye, noktalar: noktalariOlustur(bugun, kademeBucket.get(seviye)!) })),
    siniflar: gorulenSiniflar.map(s=>({id:s.id,ad:s.ad,noktalar:noktalariOlustur(bugun,sinifBucket.get(s.id)!)})),
  };
}
