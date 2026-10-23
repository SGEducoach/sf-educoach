// Sınıf Analizi özeti (Faz 1 · Adım 5, 23.10.2026): RPC sinif_analiz_ozeti
// (migration 0175) öğrenci başına aktiflik / dönem sayılarını (soru + konu),
// tüm zaman görev dağılımını ve "verisi var mı" bilgisini döner.
//
// Eskiden sinif-analizi-verisi.ts bu satırları toplu in() sorgularıyla çekip
// JS'te sayıyordu; PostgREST max_rows = 1000 olduğundan kurumun tamamı
// seçildiğinde (en büyük kurumda 1464 görev satırı) sayılar sessizce
// kesiliyordu. RPC çağrısı burada, saf eşleştirme ayrı tutuldu (test için).
import type { AktiviteRpcIstemcisi } from "@/lib/ogrenci-aktivite";

export interface SinifAnalizOzeti {
  studentId: string;
  aktiflik: number;
  sonDonem: number;
  oncekiDonem: number;
  gorevToplam: number;
  gorevTamamlanan: number;
  gorevBekleyen: number;
  gorevTamamlanmayan: number;
  verisiVarMi: boolean;
}

type SinifAnalizSatiri = {
  student_id: string;
  aktiflik: number | null;
  son_donem: number | null;
  onceki_donem: number | null;
  gorev_toplam: number | null;
  gorev_tamamlanan: number | null;
  gorev_bekleyen: number | null;
  gorev_tamamlanmayan: number | null;
  veri_var_mi: boolean | null;
};

export function sinifAnalizOzetiEslestir(s: SinifAnalizSatiri): SinifAnalizOzeti {
  return {
    studentId: s.student_id,
    aktiflik: s.aktiflik ?? 0,
    sonDonem: s.son_donem ?? 0,
    oncekiDonem: s.onceki_donem ?? 0,
    gorevToplam: s.gorev_toplam ?? 0,
    gorevTamamlanan: s.gorev_tamamlanan ?? 0,
    gorevBekleyen: s.gorev_bekleyen ?? 0,
    gorevTamamlanmayan: s.gorev_tamamlanmayan ?? 0,
    verisiVarMi: s.veri_var_mi ?? false,
  };
}

// RPC öğrenci başına tek satır döner; max_rows = 1000 sınırına takılmasın diye parçalı.
const RPC_PARCA = 500;

// Hata olursa FIRLATIR: eksik veriyle sessizce devam etmek yanlış aktiflik /
// görev sayısı gösterir (eski davranışın asıl sorunu).
export async function sinifAnalizOzetleriGetir(
  admin: AktiviteRpcIstemcisi,
  ogrenciIdleri: string[],
  bugun: string,
  aktiflikGun: number,
  trendGun: number,
): Promise<Map<string, SinifAnalizOzeti>> {
  const sonuc = new Map<string, SinifAnalizOzeti>();
  const tekil = [...new Set(ogrenciIdleri)];
  for (let i = 0; i < tekil.length; i += RPC_PARCA) {
    const { data, error } = await admin.rpc("sinif_analiz_ozeti", {
      p_student_ids: tekil.slice(i, i + RPC_PARCA),
      p_bugun: bugun,
      p_aktiflik_gun: aktiflikGun,
      p_trend_gun: trendGun,
    });
    if (error) throw new Error(`sinif_analiz_ozeti: ${error.message}`);
    for (const satir of (data ?? []) as SinifAnalizSatiri[]) {
      const ozet = sinifAnalizOzetiEslestir(satir);
      sonuc.set(ozet.studentId, ozet);
    }
  }
  return sonuc;
}
