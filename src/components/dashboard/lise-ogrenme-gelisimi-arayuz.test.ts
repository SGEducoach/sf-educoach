import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/dashboard/yapay-zeka", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/app/dashboard/gorev-actions", () => ({ gorevVer: vi.fn() }));
import { KonuDurumuEkrani } from "./KonuDurumuEkrani";
import { LiseOgrenmeGelisimiPaneli } from "./LiseOgrenmeGelisimiPaneli";
import { konuDurumuHesapla } from "@/lib/konu-durumu";
import { liseOgrenmeGelisimiHesapla } from "@/lib/lise-ogrenme-gelisimi";

const temel = { ogrenciler: [], denemeler: [], sorular: [], oturumlar: [], beyanlar: [], adlandirma: { hedefler: [], adEslesmeleri: [], kazanimKonusu: new Map<string, string>() } };
const gelisim = liseOgrenmeGelisimiHesapla({ ...temel, gorevler: [], bugun: "2026-10-27" });

describe("lise öğrenme gelişimi arayüzü", () => {
  test("mevcut çağıranlarda yeni görünüm açılmaz; lise öğretmeninde veri yokken de erişilebilir", () => {
    const props = { veri: konuDurumuHesapla(temel), kapsamlar: [], seciliAnahtar: "" };
    expect(renderToStaticMarkup(createElement(KonuDurumuEkrani, props))).not.toContain("Öğrenme Gelişimi");
    const html = renderToStaticMarkup(createElement(KonuDurumuEkrani, { ...props, veri: { ...props.veri, ogrenmeGelisimi: gelisim } }));
    expect(html).toContain("Öğrenme Gelişimi"); expect(html).toContain("Konu Özeti");
    expect(html).toContain('aria-pressed="false"');
  });
  test("takip sorgusu hatasında sıfır çalışma sayaçları ve yanlış boş durum gösterilmez", () => {
    const html = renderToStaticMarkup(createElement(LiseOgrenmeGelisimiPaneli, { veri: { ...gelisim, takipHatasi: true }, ders: "" }));
    expect(html).toContain('role="alert"'); expect(html).toContain("Çalışma takibi alınamadı");
    expect(html).not.toContain("süresi geçen çalışma"); expect(html).not.toContain("bir çalışma yok");
  });
  test("görev tamamlanması ile öğrenme ayrımı açıklanır; metin HTML olarak çalıştırılmaz", () => {
    const veri = liseOgrenmeGelisimiHesapla({ ...temel, bugun: "2026-10-27", ogrenciler: [{ id: "a", ad: "Örnek", sinif: "11-A", classId: "c", dersler: null }],
      gorevler: [{ id: "g", studentId: "a", ders: "Matematik", konu: "<script>kötü()</script>", tur: "soru", durum: "tamamlandi", tarih: "2026-10-10", sonTarih: "2026-10-15", atamaTarihi: "2026-10-10", hedefSoru: 20, hedefDakika: null }] });
    const html = renderToStaticMarkup(createElement(LiseOgrenmeGelisimiPaneli, { veri, ders: "" }));
    expect(html).toContain("Tamamlanması öğrenmenin gerçekleştiğini göstermez");
    expect(html).toContain("aynı konuda deneme ölçümü yok"); expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>");
  });
  test("ders süzgeci görevleri ve sayıları birlikte sınırlar", () => {
    const veri = liseOgrenmeGelisimiHesapla({ ...temel, bugun: "2026-10-27", ogrenciler: [{ id: "a", ad: "Örnek", sinif: "11-A", classId: "c", dersler: null }],
      gorevler: [{ id: "g", studentId: "a", ders: "Fizik", konu: "Kuvvet", tur: "soru", durum: "tamamlandi", tarih: "2026-10-10", sonTarih: "2026-10-15", atamaTarihi: "2026-10-10", hedefSoru: 20, hedefDakika: null }] });
    const html = renderToStaticMarkup(createElement(LiseOgrenmeGelisimiPaneli, { veri, ders: "Matematik" }));
    expect(html).not.toContain("Kuvvet"); expect(html).toContain("bir çalışma yok");
  });
});
