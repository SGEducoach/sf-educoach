import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { yerlesikFotoAdresi } from "./duyuru-foto-adresi";
import { etkinSablon, TUM_SABLONLAR } from "./whatsapp-sablon-ayarlari";

describe("yerleşik duyuru fotoğrafının önbellek sürümü", () => {
  it.each(TUM_SABLONLAR)("$anahtar gerçek dosyanın içeriğine bağlı URL kullanır", (s) => {
    const data = readFileSync(new URL(`../../public/duyuru-fotograflari/${s.yerlesikFoto}`, import.meta.url));
    const hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
    const adres = `/duyuru-fotograflari/${s.yerlesikFoto}?v=${hash}`;
    expect(yerlesikFotoAdresi(s.yerlesikFoto)).toBe(adres);
    expect(etkinSablon(s.anahtar, undefined).fotolar[0]).toBe(adres);
  });
  it("adminin yüklediği özel fotoğrafın adresine sürüm eklemez", () => {
    const adres = "/api/duyuru-fotografi?id=custom";
    expect(etkinSablon("genel", { anahtar: "genel", ad: null, baslik: null, gizli: false, yerlesikFotoGizli: true, fotograflar: [{ id: "custom", adres }] }).fotolar).toEqual([adres]);
  });
});
