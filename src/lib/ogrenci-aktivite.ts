// Öğrenci Aktivite Özeti (Faz 1 · Adım 3, 23.10.2026): RPC
// ogrenci_aktivite_ozeti (migration 0174) öğrenci başına son hareket
// tarihini (pencere sınırsız) ve son 30 günün görev açık/toplam sayısını döner.
//
// Pencere hesabı ve satır eşleştirme saftır. ogrenciAktiviteOzetleriGetir
// RPC'yi çağırır; rehber-kapsam-listesi.ts ve rehber-takip-verisi.ts bunu
// kullanır (eskiden her biri konu/soru/deneme/görev satırlarını çekip JS'te
// topluyordu ve max_rows = 1000 sınırında sessizce kesiliyordu).
import { tarihEkleGun } from "@/lib/rehber-takip";

// Kullanıcı kararı (23.10.2026): görev birikmesi yalnız son 30 güne bakar.
export const GOREV_PENCERESI_GUN = 30;

// RPC'ye p_bugun ile birlikte gönderilecek alt sınır: bu tarihten (dahil)
// itibaren oluşan görevler sayılır. RPC bu hesabı kendi içinde de yapar
// (p_bugun - 30); burada yalnız çağıranın pencereyi loglayabilmesi /
// doğrulayabilmesi için aynı kural tek yerde tutulur.
export function gorevPenceresiBaslangici(bugun: string): string {
  return tarihEkleGun(bugun, -GOREV_PENCERESI_GUN);
}

export interface OgrenciAktiviteOzeti {
  studentId: string;
  sonHareket: string | null;
  acikGorev: number;
  gorevToplam: number;
}

type OgrenciAktiviteSatiri = {
  student_id: string;
  son_hareket: string | null;
  acik_gorev: number | null;
  gorev_toplam: number | null;
};

// ogrenci_aktivite_ozeti RPC satırını uygulama tipine çevirir.
export function ogrenciAktiviteOzetiEslestir(satir: OgrenciAktiviteSatiri): OgrenciAktiviteOzeti {
  return {
    studentId: satir.student_id,
    sonHareket: satir.son_hareket,
    acikGorev: satir.acik_gorev ?? 0,
    gorevToplam: satir.gorev_toplam ?? 0,
  };
}

// RPC çağrısı için yalnız rpc() gerekir (testte sahte nesne verilebilsin diye
// SupabaseClient'a bağlanmıyoruz).
export interface AktiviteRpcIstemcisi {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

// PostgREST max_rows = 1000 (canlıda doğrulandı, 23.10.2026). RPC öğrenci başına
// tek satır döner; yine de çok büyük kurumlarda sınıra takılmasın diye parçalı.
const RPC_PARCA = 500;

// Verilen öğrencilerin aktivite özetini veritabanında hesaplatır. Hata olursa
// FIRLATIR: eksik veriyle sessizce devam etmek yanlış "sessizlik"/görev oranı
// bildirimi üretir (eski davranışın asıl sorunu).
export async function ogrenciAktiviteOzetleriGetir(
  admin: AktiviteRpcIstemcisi,
  ogrenciIdleri: string[],
  bugun: string,
): Promise<Map<string, OgrenciAktiviteOzeti>> {
  const sonuc = new Map<string, OgrenciAktiviteOzeti>();
  const tekil = [...new Set(ogrenciIdleri)];
  for (let i = 0; i < tekil.length; i += RPC_PARCA) {
    const { data, error } = await admin.rpc("ogrenci_aktivite_ozeti", {
      p_student_ids: tekil.slice(i, i + RPC_PARCA),
      p_bugun: bugun,
    });
    if (error) throw new Error(`ogrenci_aktivite_ozeti: ${error.message}`);
    for (const satir of (data ?? []) as OgrenciAktiviteSatiri[]) {
      const ozet = ogrenciAktiviteOzetiEslestir(satir);
      sonuc.set(ozet.studentId, ozet);
    }
  }
  return sonuc;
}
