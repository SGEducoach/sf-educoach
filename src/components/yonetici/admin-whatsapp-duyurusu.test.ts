import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
import { AdminWhatsappDuyurusu } from "./AdminWhatsappDuyurusu";

describe("admin WhatsApp kartı giriş alanı", () => {
  it("açık adlandırılmış oluşturma butonu ve SeFu Koç marka açıklaması sunar", () => {
    const html = renderToStaticMarkup(createElement(AdminWhatsappDuyurusu, { ayarlar: [] }));
    expect(html).toContain("SeFu Koç Genel WhatsApp Duyurusu");
    expect(html).toContain("SeFu Koç duyurusu hazırla");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Kurum seçmeden SeFu Koç logosuyla");
  });
  it("paylaşımın kullanıcı seçimiyle yapıldığını ve PNG yedeğini açıklar", () => {
    const html = renderToStaticMarkup(createElement(AdminWhatsappDuyurusu, { ayarlar: [] }));
    expect(html).toContain("PNG");
    expect(html).toContain("alıcıyı seçin");
    expect(html).toContain("Otomatik toplu mesaj gönderilmez");
  });
});
