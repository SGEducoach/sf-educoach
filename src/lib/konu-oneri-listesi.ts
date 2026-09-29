import { BRANS_DENEMESI_KONUSU } from "@/lib/types";

// Soru Çözümü'nün konu öneri listesi (kullanıcı isteği 29.09.2026).
//
// Dersin bütün konularını kapsayan branş denemeleri tek bir müfredat
// konusuna bağlanamıyordu; öğrenci ya rastgele bir konu seçiyor ya da konuyu
// boş bırakıyordu. "Branş Denemesi" başlığı listenin EN BAŞINDA duruyor.
// Arama yazıldığında kendi adıyla eşleşir ("branş", "deneme"), alakasız bir
// arama yazıldığında listeden çekilir.

export interface KonuOnerisi {
  ders: string;
  konu: string;
  seviye?: string | null;
}

export function soruKonuOnerileri(
  konuOnerileri: readonly KonuOnerisi[],
  ders: string,
  aramaMetni: string,
): KonuOnerisi[] {
  const arama = aramaMetni.trim();
  const kucuk = arama.toLowerCase();
  const konular = konuOnerileri.filter((o) => o.ders === ders && (!arama || o.konu.toLowerCase().includes(kucuk)));
  const bransGorunsun = !arama
    || BRANS_DENEMESI_KONUSU.toLocaleLowerCase("tr").includes(arama.toLocaleLowerCase("tr"));
  return bransGorunsun
    ? [{ ders, konu: BRANS_DENEMESI_KONUSU, seviye: "Tüm konular" }, ...konular]
    : konular;
}
