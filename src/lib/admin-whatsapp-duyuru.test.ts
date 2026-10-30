import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adminWhatsappStudyoAyarlari } from "./admin-whatsapp-duyuru";
import type { SablonAyari } from "./whatsapp-sablon-ayarlari";

const genel: SablonAyari = { anahtar: "genel", ad: "Genel Duyuru", baslik: "Zorlanmış başlık", gizli: true,
  yerlesikFotoGizli: false, fotograflar: [{ id: "foto-1", adres: "/api/duyuru-fotografi?id=foto-1" }] };

describe("admin genel WhatsApp kartı", () => {
  it("kurum gerektirmeden sabit SeFu Koç kimliği ve yerel logosunu kullanır", () => {
    const p = adminWhatsappStudyoAyarlari([]);
    expect(p.kurumAdi).toBe("SeFu Koç");
    expect(p.logoAdresi).toBe("/logo.png");
    expect(p.logoDegistirebilir).toBe(false);
    expect(p.ogrenciler).toEqual([]);
    expect(p.hedefSecimi).toBe(true);
    expect(existsSync(new URL("../../public/logo.png", import.meta.url))).toBe(true);
  });
  it("yalnız genel duyuruyu açar; veli/yurt/devamsızlık kartlarını sunmaz", () => {
    const p = adminWhatsappStudyoAyarlari([]);
    expect(Object.values(p.sablonlar).filter((s) => !s.gizli).map((s) => s.anahtar)).toEqual(["genel"]);
    expect(p.genelDuyurular).toBe(true);
  });
  it("Genel kurumlarda gizli olsa da admin kartı açık kalır; ayarlar mutasyona uğramaz", () => {
    const ayarlar = [genel];
    const once = JSON.stringify(ayarlar);
    const p = adminWhatsappStudyoAyarlari(ayarlar);
    expect(p.sablonlar.genel.gizli).toBe(false);
    expect(JSON.stringify(ayarlar)).toBe(once);
    expect(genel.gizli).toBe(true);
  });
  it("başlığı admin yazar; mevcut fotoğraf seçenekleri korunur", () => {
    const p = adminWhatsappStudyoAyarlari([genel]);
    expect(p.sablonlar.genel.baslik).toBeNull();
    expect(p.sablonlar.genel.fotolar).toContainEqual(expect.stringMatching(/^\/duyuru-fotograflari\/genel\.jpg\?v=[a-f0-9]{12}$/));
    expect(p.sablonlar.genel.fotolar).toContain("/api/duyuru-fotografi?id=foto-1");
  });
});
