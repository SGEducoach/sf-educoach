"use server";

import { revalidatePath } from "next/cache";
import { oturumTakipKapsami, takipBildirimleriniUret } from "@/lib/rehber-takip-verisi";
import type { TakipDurumu } from "@/lib/rehber-takip";

const DURUMLAR: TakipDurumu[] = ["yeni", "goruldu", "ele_alindi"];
const YOL = "/dashboard/takip-bildirimleri";

// Rehber takip bildirimini "görüldü", "ele alındı" ya da yeniden "yeni"
// yapar; ele alındıda not eklenebilir. Kayıtların rehberin kapsamında
// (aynı kurum + atandığı düzey) olduğu sunucuda doğrulanır.
export async function takipBildirimiDurumGuncelle(idler: string[], durum: TakipDurumu, notMetni?: string): Promise<{ error: string | null; guncellenen: number }> {
  const oturum = await oturumTakipKapsami();
  if (!oturum) return { error: "Bu işlem yalnız rehberlik servisine açıktır.", guncellenen: 0 };
  if (!DURUMLAR.includes(durum)) return { error: "Geçersiz durum.", guncellenen: 0 };
  const tekilIdler = [...new Set(idler)].slice(0, 500);
  if (tekilIdler.length === 0) return { error: null, guncellenen: 0 };
  const not = notMetni?.trim().slice(0, 1000) || null;

  const { admin, userId, kapsam } = oturum;
  if (kapsam.seviyeler && kapsam.seviyeler.length === 0) return { error: "Henüz sorumlu olduğunuz sınıf düzeyi atanmadı.", guncellenen: 0 };
  let sorgu = admin.from("rehber_takip_bildirimleri")
    .update({
      durum,
      kapatan_id: durum === "yeni" ? null : userId,
      kapatilma_at: durum === "yeni" ? null : new Date().toISOString(),
      ...(notMetni !== undefined ? { not_metni: not } : {}),
    })
    .in("id", tekilIdler).eq("school_id", kapsam.schoolId);
  if (kapsam.seviyeler) sorgu = sorgu.in("sinif_seviyesi", kapsam.seviyeler);
  const { data, error } = await sorgu.select("id");
  if (error) return { error: "Kayıt güncellenemedi. Tekrar deneyin.", guncellenen: 0 };
  revalidatePath(YOL);
  return { error: null, guncellenen: data?.length ?? 0 };
}

// "Şimdi tara": olaylar günlük otomatik taranır; rehber beklemek istemezse.
export async function takipBildirimleriniTara(): Promise<{ error: string | null; eklenen: number }> {
  const oturum = await oturumTakipKapsami();
  if (!oturum) return { error: "Bu işlem yalnız rehberlik servisine açıktır.", eklenen: 0 };
  try {
    const eklenen = await takipBildirimleriniUret(oturum.admin, oturum.kapsam);
    revalidatePath(YOL);
    return { error: null, eklenen };
  } catch {
    return { error: "Tarama tamamlanamadı. Tekrar deneyin.", eklenen: 0 };
  }
}
