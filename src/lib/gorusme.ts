// Rehberlik görüşme kaydı (Faz 4, migration 0145). Saf kurallar burada —
// sunucu işlemi ve bileşen ikisi de buna bakar, iki yerde ayrı doğrulama
// yazılmasın.
//
// GİZLİLİK uygulama katmanında DEĞİL, RLS'te zorlanıyor (0145): yalnız o
// okulun Rehberlik Servisi üyeleri, yalnız kendi kademesindeki öğrenciler
// için. Öğrenci/veli/branş öğretmeni/müdür göremez. Buradaki doğrulama
// sadece veri kalitesi içindir, yetki değil.

export const GORUSME_TURLERI = ["bireysel", "veli", "yonlendirme", "diger"] as const;
export type GorusmeTuru = (typeof GORUSME_TURLERI)[number];

export const GORUSME_TURU_ETIKET: Record<GorusmeTuru, string> = {
  bireysel: "Bireysel görüşme",
  veli: "Veli görüşmesi",
  yonlendirme: "Yönlendirme / sevk",
  diger: "Diğer",
};

// DB kısıtıyla BİREBİR aynı olmalı (0145: between 3 and 4000) — aksi hâlde
// kullanıcı ham Postgres hatası görür.
export const ICERIK_MIN = 3;
export const ICERIK_MAKS = 4000;

export interface GorusmeKaydi {
  id: string;
  studentId: string;
  ogrenciAdi: string;
  sinifAdi: string;
  rehberAdi: string;
  kendiNotuMu: boolean;
  tarih: string;
  tur: GorusmeTuru;
  icerik: string;
}

export function gorusmeTuruMu(deger: string): deger is GorusmeTuru {
  return (GORUSME_TURLERI as readonly string[]).includes(deger);
}

// Tek doğrulama noktası. null = geçerli, aksi hâlde kullanıcıya gösterilecek
// Türkçe mesaj.
export function gorusmeDogrula(input: { icerik: string; tur: string; tarih?: string }): string | null {
  const icerik = input.icerik?.trim() ?? "";
  if (icerik.length < ICERIK_MIN) return "Görüşme notu en az 3 karakter olmalı.";
  if (icerik.length > ICERIK_MAKS) return `Görüşme notu en fazla ${ICERIK_MAKS} karakter olabilir.`;
  if (!gorusmeTuruMu(input.tur)) return "Görüşme türü geçersiz.";
  if (input.tarih) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarih)) return "Tarih geçersiz.";
    // Gelecek tarihli görüşme kaydı anlamsız — henüz yapılmamış bir görüşme.
    const bugun = new Date().toISOString().slice(0, 10);
    if (input.tarih > bugun) return "Gelecek bir tarihe görüşme kaydı girilemez.";
  }
  return null;
}
