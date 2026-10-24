import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { HataBildirimSonuc } from "@/app/yonetici/actions";
import { mufredatBasvuruMesaji } from "@/lib/mufredat-basvurusu";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/dersler", useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/dashboard/mufredat-basvuru-actions", () => ({ mufredatBasvurusuGonder: vi.fn() }));
vi.mock("@/app/yonetici/actions", () => ({ hataBildirimiCozulduIsaretle: vi.fn(), hataBildirimiYanitla: vi.fn() }));

import { MufredatBasvuruFormu } from "./MufredatBasvuruFormu";
import { HataBildirimListesi } from "@/components/yonetici/HataBildirimListesi";

const bildirim: HataBildirimSonuc = {
  id: "basvuru-1", bildirenId: "ogretmen", bildirenAd: "Öğretmen", bildirenRol: "ogretmen", sayfa: "/dashboard/dersler",
  durum: "bekliyor", createdAt: "2026-10-24T10:00:00Z", yanitlar: [],
  mesaj: mufredatBasvuruMesaji({ kademe: "lise", program: "Maarif", sinif: "11", ders: "Matematik", konu: "Trigonometri",
    altBaslik: "Birim çember", hataTuru: "alt_baslik_eksik", tespit: "Birim çember başlığı eksik görünüyor.",
    oneri: "Birim çember başlığı bu konuya eklenmeli.", onerilenSinif: "", kaynak: "Örnek kitap" },
  "11111111-1111-4111-8111-111111111111", "Örnek Okul"),
};

describe("müfredat başvurusu arayüzü", () => {
  it("ilk adım tespiti alır; öneri ve gönderme ikinci adıma bırakılır", () => {
    const html = renderToStaticMarkup(createElement(MufredatBasvuruFormu, { acilisSayisi: 1 }));
    expect(html).toContain("<dialog");
    expect(html).toContain("Hata tespiti");
    expect(html).toContain("Öneri adımına geç");
    expect(html).toContain("Tespitiniz:");
    expect(html).not.toContain("Admine başvuruyu gönder");
    expect(html).not.toContain("Öneriniz:");
  });
  it("admin kartında ham JSON yerine okunur tespit/öneri ve kopyala seçeneği gösterir", () => {
    const html = renderToStaticMarkup(createElement(HataBildirimListesi, { bildirimler: [bildirim] }));
    expect(html).toContain("Örnek Okul");
    expect(html).toContain("Trigonometri");
    expect(html).toContain("Tespit:");
    expect(html).toContain("Öneri:");
    expect(html).toContain("Düzeltme istemini kopyala");
    expect(html).not.toContain("SEFUKOC_MUFREDAT_BASVURU_V1");
  });
  it("normal bildirimlerin cevapla/çözüldü akışını korur; müfredat istemi eklemez", () => {
    const html = renderToStaticMarkup(createElement(HataBildirimListesi, { bildirimler: [{ ...bildirim, mesaj: "Kaydet butonu çalışmıyor." }] }));
    expect(html).toContain("Kaydet butonu çalışmıyor.");
    expect(html).toContain("Cevapla");
    expect(html).toContain("Çözüldü");
    expect(html).not.toContain("Düzeltme istemini kopyala");
  });
});
