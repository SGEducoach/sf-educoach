import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/yonetici/whatsapp-actions", () => ({
  adminKurumLogosuKaldir: vi.fn(), adminKurumLogosuYukle: vi.fn(), adminKurumWhatsappVerisi: vi.fn(),
  sablonAyariKaydet: vi.fn(), sablonFotografiSil: vi.fn(), sablonFotografiYukle: vi.fn(), yerlesikFotoGizle: vi.fn(),
}));
vi.mock("@/components/dashboard/YurtListeStudyosu", () => ({ CinsiyetBilgileri: () => null }));
vi.mock("@/components/yonetici/AdminWhatsappDuyurusu", () => ({ AdminWhatsappDuyurusu: () => null }));
import { WhatsappYonetimi } from "./WhatsappYonetimi";
import { SablonDugmesi } from "@/components/dashboard/whatsapp-ortak";
import { TUM_SABLONLAR } from "@/lib/whatsapp-sablon-ayarlari";
import { yerlesikFotoAdresi } from "@/lib/duyuru-foto-adresi";

describe("admin ve kart seçiminde güncel fotoğraf", () => {
  it("adminin tüm yerleşik fotoğraf önizlemelerinde içerik sürümünü gösterir", () => {
    const html = renderToStaticMarkup(createElement(WhatsappYonetimi, { sablonlar: TUM_SABLONLAR, ayarlar: [], okullar: [], hazir: true }));
    for (const s of TUM_SABLONLAR) expect(html).toContain(`url(${yerlesikFotoAdresi(s.yerlesikFoto)})`);
    expect(html).not.toContain("url(/duyuru-fotograflari/genel.jpg)");
  });
  it("kart seçimi dosya adını sürümlendirir, yüklenen fotoğraf URL'sini korur", () => {
    const props = { ad: "Genel", renk: "#000", secili: false, sec: () => {} };
    expect(renderToStaticMarkup(createElement(SablonDugmesi, { ...props, foto: "genel.jpg" }))).toContain(`url(${yerlesikFotoAdresi("genel.jpg")})`);
    expect(renderToStaticMarkup(createElement(SablonDugmesi, { ...props, foto: "/api/duyuru-fotografi?id=custom" }))).toContain("url(/api/duyuru-fotografi?id=custom)");
  });
});
