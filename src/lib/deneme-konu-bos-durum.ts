// Sayı bilinmiyorsa mevcut mesaj korunur; filtreli listeler toplam sayılmaz.
export const GENEL_BOS_MESAJ =
  "Henüz konu dökümü olan bir deneme yok. Deneme sonucu karneli PDF olarak yüklendiğinde konular burada görünür.";

export function konuBosDurumMetni(denemeKaydiSayisi?: number): string {
  if (denemeKaydiSayisi === undefined || !Number.isSafeInteger(denemeKaydiSayisi) || denemeKaydiSayisi < 0) return GENEL_BOS_MESAJ;
  if (denemeKaydiSayisi === 0) return "Henüz deneme kaydı yok.";
  return `${denemeKaydiSayisi} deneme kaydın var ama hiçbirinde konu dökümü yok. Karneli PDF yüklendiğinde konular burada görünür.`;
}

export function konuKaynakMetni(denemeSayisi: number, secilenDenemeTarihi: string | null): string {
  const kaynak = `Konu verisi ${denemeSayisi} denemeye dayanıyor`;
  return secilenDenemeTarihi
    ? `${kaynak} · Seçili deneme: ${secilenDenemeTarihi}`
    : `${kaynak} · ${denemeSayisi} denemenin toplamı`;
}
