import { describe, expect, test } from "vitest";
import { GENEL_BOS_MESAJ, konuBosDurumMetni, konuKaynakMetni } from "./deneme-konu-bos-durum";

describe("deneme konu analizi boş durumları", () => {
  test("sayı verilmediğinde önceki metin aynen korunur", () => {
    expect(konuBosDurumMetni()).toBe(GENEL_BOS_MESAJ);
  });
  test("sıfır kayıt ile konu dökümü eksik kayıtları ayırır", () => {
    expect(konuBosDurumMetni(0)).toBe("Henüz deneme kaydı yok.");
    expect(konuBosDurumMetni(4)).toBe("4 deneme kaydın var ama hiçbirinde konu dökümü yok. Karneli PDF yüklendiğinde konular burada görünür.");
  });
  test("geçersiz sayıdan kayıt sayısı üretmez", () => {
    for (const sayi of [-1, 1.5, NaN, Infinity]) expect(konuBosDurumMetni(sayi)).toBe(GENEL_BOS_MESAJ);
  });
});

describe("deneme konu verisinin kaynağı", () => {
  test("tüm denemelerde gerçek toplamı belirtir", () => {
    expect(konuKaynakMetni(3, null)).toBe("Konu verisi 3 denemeye dayanıyor · 3 denemenin toplamı");
  });
  test("tek seçimde toplam kaynağı ve seçilen tarihi belirtir", () => {
    expect(konuKaynakMetni(5, "12.10.2026")).toBe("Konu verisi 5 denemeye dayanıyor · Seçili deneme: 12.10.2026");
  });
});
