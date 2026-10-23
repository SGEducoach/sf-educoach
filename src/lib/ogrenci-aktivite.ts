// Öğrenci Aktivite Özeti (Faz 1 · Adım 3, 23.10.2026): RPC
// ogrenci_aktivite_ozeti (migration 0174) öğrenci başına son hareket
// tarihini (pencereszsiz) ve son 30 günün görev açık/toplam sayısını döner.
//
// Bu dosya saf: pencere sınırını hesaplar ve RPC satırını uygulama tipine
// çevirir; veritabanına dokunmaz (RPC çağrısının kendisi, admin.rpc ile,
// rehber-takip-verisi.ts'teki JS toplama mantığının yerini alacak).
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
