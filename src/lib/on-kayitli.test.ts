import { describe, expect, it } from "vitest";
import {
  ON_KAYIT_BEKLEME_GUNU, adaGoreBenzerAday, adaGoreListeOnerisi, bekleyenKalanGun, bekleyenSuresiDolduMu, davetMetni,
  bekleyenSatirOnerisi, hesapsizDenemeNeti, numarayaGoreListeBaglantisi, yakinNumaradaAday, type ListeAdayi,
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

describe("adaGoreBenzerAday (PDF numarası hatalı kodlanmışsa asıl sahibi ada göre bul)", () => {
  // Uydurma adlar (kişisel veri depoya girmez).
  const sinif: ListeAdayi[] = [
    { id: "a", okulNo: "80", adSoyad: "CAN AKDAĞ", seviye: "11", studentId: "s-a" },
    { id: "b", okulNo: "81", adSoyad: "BUSE ERVA METE", seviye: "9", studentId: null },
    { id: "c", okulNo: "91", adSoyad: "MEHMET EMRE KOÇAK", seviye: "9", studentId: null },
    { id: "d", okulNo: "3660", adSoyad: "HÜSEYİN EFE ERDEM", seviye: "9", studentId: null },
    { id: "e", okulNo: "442", adSoyad: "EBRU SENA KARA", seviye: "10", studentId: "s-e" },
    { id: "f", okulNo: "223", adSoyad: "AYŞE SENA DURU", seviye: "10", studentId: "s-f" },
  ];
  const aday = (adSoyad: string, no: number, seviye: string | null = null) =>
    adaGoreBenzerAday({ adSoyad, ogrenciNo: no, sinifSeviyesi: seviye }, sinif)?.id ?? null;

  it("kısaltılmış ad ya da eksik ikinci ad tek kişiye uyuyorsa o kişi", () => {
    expect(aday("B ERVA METE", 80)).toBe("b");
    expect(aday("EMRE KOÇAK", 90)).toBe("c");
    expect(aday("HÜSEYİN ERDEM", 260)).toBe("d");
  });
  it("tek sözcük, birden çok kişiye uyan ya da listede olmayan ad öneri almaz", () => {
    expect(aday("SENA", 443)).toBeNull();
    expect(aday("Y ENES TOPRAK", 165)).toBeNull();
  });
  it("sınıf seviyesi çelişen kişi önerilmez", () => {
    expect(aday("B ERVA METE", 80, "12")).toBeNull();
  });
});

describe("bekleyenSatirOnerisi (yönetici onay ekranındaki öneri)", () => {
  // Uydurma adlar. 443 numara adı PDF'tekine hiç benzemeyen bir 10. sınıf
  // öğrencisinin; 165 numara 12. sınıftan biri.
  const okul: ListeAdayi[] = [
    { id: "e", okulNo: "442", adSoyad: "EBRU SENA KARA", seviye: "10", studentId: "s-e" },
    { id: "m", okulNo: "443", adSoyad: "MURAT SEZER", seviye: "10", studentId: null },
    { id: "f", okulNo: "223", adSoyad: "AYŞE SENA DURU", seviye: "10", studentId: "s-f" },
    { id: "h", okulNo: "165", adSoyad: "AHMET ALİ YAVUZ", seviye: "12", studentId: null },
    { id: "k", okulNo: "300", adSoyad: "ZEYNEP KAYA", seviye: "11", studentId: null },
    { id: "n", okulNo: "302", adSoyad: "ZEYNEP NUR ATA", seviye: "11", studentId: null },
  ];
  const oneri = (adSoyad: string, ogrenciNo: number | null, sinifSeviyesi: string | null) => {
    const r = bekleyenSatirOnerisi({ adSoyad, ogrenciNo, sinifSeviyesi }, okul);
    return r ? `${r.liste.id}:${r.tur}` : null;
  };

  it("numara başkasının, ad yakın numaralı tek kişinin adında geçiyorsa o kişi önerilir", () => {
    expect(oneri("SENA", 443, "10")).toBe("e:yakin-numara");
    expect(yakinNumaradaAday({ adSoyad: "SENA", ogrenciNo: 443, sinifSeviyesi: "10" }, okul)?.id).toBe("e");
  });
  it("numara listede yoksa da yakın numaradaki ada bakılır", () => {
    expect(oneri("SENA", 444, null)).toBe("e:yakin-numara");
  });
  it("yakın numara penceresi dışı, sınıfı çelişen ya da birden çok kişiye uyan ad yakın öneri almaz", () => {
    expect(yakinNumaradaAday({ adSoyad: "SENA", ogrenciNo: 446, sinifSeviyesi: null }, okul)).toBeNull();
    expect(yakinNumaradaAday({ adSoyad: "SENA", ogrenciNo: 443, sinifSeviyesi: "9" }, okul)).toBeNull();
    expect(yakinNumaradaAday({ adSoyad: "ZEYNEP", ogrenciNo: 301, sinifSeviyesi: "11" }, okul)).toBeNull();
  });
  it("ad da sınıf düzeyi de tutmuyorsa numaradaki kişi önerilmez", () => {
    expect(oneri("YUSUF ENES TOPRAK", 165, "9")).toBeNull();
  });
  it("sınıf düzeyi aynıysa ya da bilinmiyorsa numaradaki kişi eskisi gibi şüpheli öneri olur", () => {
    expect(oneri("YUSUF ENES TOPRAK", 165, null)).toBe("h:numara");
    expect(oneri("OSMAN KILIÇ", 443, "10")).toBe("m:numara");
  });
  it("ad numaradaki kişiye uyuyorsa sınıf çelişse de öneri o kişi (liste sınıfı eski olabilir)", () => {
    expect(oneri("AHMET YAVUZ", 165, "11")).toBe("h:numara");
  });
  it("numara hatalı + ad başka tek kişiye benziyor → numara-hatali; numarasız tam ad → ad", () => {
    expect(oneri("AYŞE DURU", 443, "10")).toBe("f:numara-hatali");
    expect(oneri("ZEYNEP KAYA", null, null)).toBe("k:ad");
  });
});
