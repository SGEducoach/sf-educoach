// Maarif | LGS bölümleri — ortaokul panelinin iki bakışı (kullanıcı kararı
// 01.10.2026, migration 0132).
//
// Aynı müfredatın iki görünümü: LGS'nin AYRI KONU TAKSONOMİSİ YOK, LGS 8.
// sınıf MEB müfredatını ölçüyor. Maarif = müfredat yeterliliği, LGS = sınav
// odaklı çalışma (öğretmen orada ödev de verir).
//
// LGS bölümü 5-8'in HEPSİNDE açık (kullanıcı kararı). Tasarım belgesi §10.3
// "yalnız 8. sınıf" diyordu; karar onu geçersiz kıldı — bu yüzden burada
// sınıfa bağlı bir kapı YOK, bilinçli.

export type OrtaokulBolum = "maarif" | "lgs";

export const ORTAOKUL_BOLUMLERI = ["maarif", "lgs"] as const satisfies readonly OrtaokulBolum[];

export const BOLUM_ETIKET: Record<OrtaokulBolum, string> = {
  maarif: "Maarif",
  lgs: "LGS",
};

// Sekmenin altındaki tek satır: öğrenci hangi bakışta olduğunu anlasın.
export const BOLUM_ACIKLAMA: Record<OrtaokulBolum, string> = {
  maarif: "Sınıf müfredatındaki konular.",
  lgs: "LGS'ye hazırlık çalışmaları.",
};

export function bolumCoz(ham: string | null | undefined): OrtaokulBolum {
  return ham === "lgs" ? "lgs" : "maarif";
}
