import { describe, expect, it } from "vitest";
import { telefonlariHazirla, telefonOnHane, telefonuNormallestir } from "@/lib/sms-telefon";

describe("telefonuNormallestir", () => {
  it.each([
    ["0532 123 45 67", "905321234567"],
    ["+90 (532) 123-45-67", "905321234567"],
    ["905321234567", "905321234567"],
    ["5321234567", "905321234567"],
    ["00905321234567", "905321234567"],
  ])("%s → %s", (ham, beklenen) => {
    expect(telefonuNormallestir(ham)).toBe(beklenen);
  });

  it.each(["", null, undefined, "123", "0212 123 45 67", "05321234", "abc", "9053212345678"])("geçersiz: %s", (ham) => {
    expect(telefonuNormallestir(ham)).toBeNull();
  });

  it("sağlayıcıya on haneli biçim verilir", () => {
    expect(telefonOnHane("905321234567")).toBe("5321234567");
  });
});

describe("telefonlariHazirla", () => {
  it("kardeşlerin aynı numarasını bir kez sayar, geçersizleri ayırır", () => {
    const s = telefonlariHazirla(["0532 123 45 67", "905321234567", "yok", null, "0533 111 22 33"]);
    expect(s.numaralar).toEqual(["905321234567", "905331112233"]);
    expect(s.gecersiz).toBe(2);
    expect(s.tekrar).toBe(1);
  });
});
