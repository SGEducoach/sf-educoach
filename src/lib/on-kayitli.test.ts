import { describe, expect, it } from "vitest";
import {
  ON_KAYIT_BEKLEME_GUNU, adaGoreListeOnerisi, bekleyenKalanGun, bekleyenSuresiDolduMu, davetMetni,
  hesapsizDenemeNeti, numarayaGoreListeBaglantisi, type ListeAdayi,
} from "./on-kayitli";

const GUN = 24 * 60 * 60 * 1000;
const SIMDI = Date.parse("2026-10-24T12:00:00Z");
const once = (gun: number) => new Date(SIMDI - gun * GUN).toISOString();

describe("10 günlük bekleme süresi (verilme tarihinden)", () => {
  it("bugün verilen 10 gün, 9 gün önce verilen 1 gün kalır", () => {
    expect(ON_KAYIT_BEKLEME_GUNU).toBe(10);
    expect(bekleyenKalanGun(once(0), SIMDI)).toBe(10);
    expect(bekleyenKalanGun(once(9), SIMDI)).toBe(1);
    expect(bekleyenSuresiDolduMu(once(9), SIMDI)).toBe(false);
  });
  it("10 gün dolunca ve sonrasında dolmuş sayılır (veritabanındaki created_at > now()-10 gün kuralıyla aynı)", () => {
    expect(bekleyenKalanGun(once(10), SIMDI)).toBe(0);
    expect(bekleyenSuresiDolduMu(once(11), SIMDI)).toBe(true);
  });
  it("geçersiz tarih süresi dolmuş sayılır", () => {
    expect(bekleyenSuresiDolduMu("tarih-degil", SIMDI)).toBe(true);
  });
});

describe("hesapsizDenemeNeti", () => {
  it("doğru − yanlış/4 toplar, bozuk veri 0 verir", () => {
    expect(hesapsizDenemeNeti([{ ders: "Türkçe", dogru: 30, yanlis: 8 }, { ders: "Matematik", dogru: 20, yanlis: 4 }])).toBe(47);
    expect(hesapsizDenemeNeti(null)).toBe(0);
    expect(hesapsizDenemeNeti([{ ders: "X" }])).toBe(0);
  });
});

const liste: ListeAdayi[] = [
  { id: "l1", okulNo: "101", adSoyad: "AYŞE NUR YILMAZ", seviye: "10", studentId: null },
  { id: "l2", okulNo: "102", adSoyad: "MEHMET KAYA", seviye: "10", studentId: "s2" },
  { id: "l3", okulNo: "103", adSoyad: "ALİ DEMİR", seviye: "11", studentId: null },
  { id: "l4", okulNo: "104", adSoyad: "ALİ DEMİR", seviye: "12", studentId: null },
];

describe("numarayaGoreListeBaglantisi (numara tek başına yetmez)", () => {
  it("numara + benzer ad + uyumlu sınıf → güvenli (ikinci ad eksik de olur)", () => {
    const r = numarayaGoreListeBaglantisi({ adSoyad: "AYŞE YILMAZ", ogrenciNo: 101, sinifSeviyesi: "10" }, liste);
    expect(r).toMatchObject({ karar: "guvenli", liste: { id: "l1" } });
  });
  it("numara eşleşir ama ad farklıysa şüpheli", () => {
    const r = numarayaGoreListeBaglantisi({ adSoyad: "ZEYNEP ARSLAN", ogrenciNo: 101, sinifSeviyesi: null }, liste);
    expect(r).toMatchObject({ karar: "supheli", liste: { id: "l1" } });
  });
  it("numara ve ad uyar ama PDF'in sınıf seviyesi listedekiyle çelişirse şüpheli", () => {
    const r = numarayaGoreListeBaglantisi({ adSoyad: "MEHMET KAYA", ogrenciNo: 102, sinifSeviyesi: "9" }, liste);
    expect(r).toMatchObject({ karar: "supheli", liste: { id: "l2" } });
  });
  it("numarası olmayan ya da listede bulunmayan satır 'yok'", () => {
    expect(numarayaGoreListeBaglantisi({ adSoyad: "AYŞE YILMAZ", ogrenciNo: null, sinifSeviyesi: null }, liste).karar).toBe("yok");
    expect(numarayaGoreListeBaglantisi({ adSoyad: "AYŞE YILMAZ", ogrenciNo: 999, sinifSeviyesi: null }, liste).karar).toBe("yok");
  });
});

describe("adaGoreListeOnerisi (yalnız tam ad, tek kişi)", () => {
  it("tek eşleşme öneri olur", () => {
    expect(adaGoreListeOnerisi({ adSoyad: "mehmet kaya", ogrenciNo: null, sinifSeviyesi: null }, liste)?.id).toBe("l2");
  });
  it("adaş iki kişi varsa öneri yok; sınıf seviyesi biriyle çelişirse diğeri önerilir", () => {
    expect(adaGoreListeOnerisi({ adSoyad: "ALİ DEMİR", ogrenciNo: null, sinifSeviyesi: null }, liste)).toBeNull();
    expect(adaGoreListeOnerisi({ adSoyad: "ALİ DEMİR", ogrenciNo: null, sinifSeviyesi: "11" }, liste)?.id).toBe("l3");
  });
  it("benzer ama tam aynı olmayan ad öneri almaz", () => {
    expect(adaGoreListeOnerisi({ adSoyad: "AYŞE YILMAZ", ogrenciNo: null, sinifSeviyesi: null }, liste)).toBeNull();
  });
});

describe("davetMetni", () => {
  it("süreyi söyler, öğretmen adını imza yapar, kişisel veri içermez", () => {
    const m = davetMetni("Sedat Güler");
    expect(m).toContain("10 gün");
    expect(m).toContain("www.sefukoc.com");
    expect(m.endsWith("Sedat Güler")).toBe(true);
    expect(davetMetni(null)).not.toContain("null");
  });
});
