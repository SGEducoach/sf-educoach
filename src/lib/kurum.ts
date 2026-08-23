import type { KurumTuru } from "@/lib/types";

// Okul/dershane etiket sözlüğü — Türkçe ek uyumu (Okul-u vs Dershane-si)
// otomatik birleştirmeye uygun olmadığı için tam ifadeler tutuluyor.
export const KURUM_ETIKET: Record<KurumTuru, {
  secim: string; ogrenciSecim: string; no: string; kod: string;
}> = {
  okul: { secim: "Okul", ogrenciSecim: "Öğrencinin Okulu", no: "Okul No", kod: "Okul Kodu" },
  dershane: { secim: "Dershane", ogrenciSecim: "Öğrencinin Dershanesi", no: "Kullanıcı Adı", kod: "Dershane Kodu" },
};
