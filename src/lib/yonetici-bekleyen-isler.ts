import type { SupabaseClient } from "@supabase/supabase-js";

// Genel Bakış'taki "Bekleyen İşler" (kullanıcı kararı 20.10.2026): adminin
// ilgilenmesi gereken kayıtların sayısı, her biri ilgili sayfaya bağlanır.
export interface BekleyenIsler {
  yanitBekleyenYazisma: number;
  veliTalebi: number;
  belletmenBasvurusu: number;
  hataBildirimi: number;
  pdfEslesme: number;
  /** Google Drive bağlantısı Google tarafından reddedildi; admin yeniden bağlamalı. */
  driveKoptu: boolean;
}

// Son mesajı kurum yetkilisinden gelen konuşma yanıt bekliyor sayılır
// (yonetici_mesajlari'nda okundu bilgisi yok). Liste yeniden eskiye sıralı.
export function yanitBekleyenKonusmaSayisi(mesajlar: { kurum_yetkilisi_id: string; gonderen_id: string }[]): number {
  const sonMesaj = new Map<string, string>();
  for (const m of mesajlar) if (!sonMesaj.has(m.kurum_yetkilisi_id)) sonMesaj.set(m.kurum_yetkilisi_id, m.gonderen_id);
  return [...sonMesaj].filter(([yetkili, gonderen]) => yetkili === gonderen).length;
}

export async function bekleyenIsleriGetir(admin: SupabaseClient): Promise<BekleyenIsler> {
  const sayi = (tablo: string) => admin.from(tablo).select("*", { count: "exact", head: true }).eq("durum", "bekliyor");
  const [mesajlar, veli, belletmen, hata, pdf, driveKoptu] = await Promise.all([
    admin.from("yonetici_mesajlari").select("kurum_yetkilisi_id, gonderen_id").order("created_at", { ascending: false }).limit(1000),
    sayi("veli_link_requests"),
    sayi("kurum_disi_belletmenler"),
    sayi("hata_bildirimleri"),
    sayi("pdf_deneme_eslesme_bekleyenler"),
    // Sunucu modülü tembel yüklenir: saf yardımcılar (yanitBekleyenKonusmaSayisi) testlerde Next sunucu bağımlılığı çekmesin.
    import("@/lib/whatsapp-drive-sunucu").then((m) => m.driveBaglantiKoptuMu()).catch(() => false),
  ]);
  return {
    yanitBekleyenYazisma: yanitBekleyenKonusmaSayisi((mesajlar.data ?? []) as { kurum_yetkilisi_id: string; gonderen_id: string }[]),
    veliTalebi: veli.count ?? 0,
    belletmenBasvurusu: belletmen.count ?? 0,
    hataBildirimi: hata.count ?? 0,
    pdfEslesme: pdf.count ?? 0,
    driveKoptu,
  };
}
