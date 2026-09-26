import { describe, expect, test } from "vitest";
import { aktifGunSiralamasi, egitimYiliBaslangici, gunTR, hareketleriOlustur, veriGirisSiralamasi, type OgrenciOzeti } from "./ogrenci-aktivitesi";

describe("tarih yardımcıları", () => {
  test("eğitim yılı başlangıcı", () => {
    expect(egitimYiliBaslangici("2026-09-27")).toBe("2026-09-01");
    expect(egitimYiliBaslangici("2026-09-01")).toBe("2026-09-01");
    expect(egitimYiliBaslangici("2027-03-15")).toBe("2026-09-01");
    expect(egitimYiliBaslangici("2027-08-31")).toBe("2026-09-01");
  });
  test("Türkiye saatine göre gün (UTC 22:30 → ertesi gün)", () => {
    expect(gunTR("2026-09-26T22:30:00Z")).toBe("2026-09-27");
    expect(gunTR("2026-09-26T20:00:00Z")).toBe("2026-09-26");
  });
});

describe("aktif gün tekrarları", () => {
  test("aynı gün iki kaynaktan gelse de bir kez sayılır", () => {
    const o = new Map([["a", { id: "a", ad: "A", sinif: null, kurum: null, kurumId: null, kayitZamani: "" }]]);
    const s = aktifGunSiralamasi([{ user_id: "a", gun: "2026-09-20" }, { user_id: "a", gun: "2026-09-20" }, { user_id: "a", gun: "2026-09-21" }], o);
    expect(s[0].gunSayisi).toBe(2);
  });
});

function ogr(id: string, ad: string, kurumId = "k1"): OgrenciOzeti {
  return { id, ad, sinif: "12-A", kurum: kurumId === "k1" ? "Fen Lisesi" : "Diğer", kurumId, kayitZamani: "2026-09-01T08:00:00Z" };
}
const OGRENCILER = new Map([ogr("a", "Ahmet"), ogr("b", "Beren"), ogr("c", "Cem", "k2")].map((o) => [o.id, o]));

describe("hareketleriOlustur", () => {
  test("türler birleşir ve yeniden eskiye sıralanır", () => {
    const h = hareketleriOlustur({
      konular: [{ id: "1", student_id: "a", ders: "Matematik", konu: "Türev", sure_dakika: 45, created_at: "2026-09-26T09:04:00Z" }],
      sorular: [{ id: "2", student_id: "b", ders: "Fizik", dogru: 20, yanlis: 4, bos: 1, created_at: "2026-09-26T08:52:00Z" }],
      denemeler: [{ id: "3", student_id: "a", tur: "TYT", yayinevi: "Limit", kaynak: "ogrenci", tarih: "2026-09-24", created_at: "2026-09-26T10:00:00Z", net: 84.25 }],
      kayitlar: [ogr("c", "Cem", "k2")],
    }, OGRENCILER);
    expect(h.map((x) => x.tur)).toEqual(["deneme", "konu", "soru", "kayit"]);
    expect(h[0].ozet).toBe("deneme girdi: 24.09 TYT Limit · 84,25 net");
    expect(h[1].ozet).toBe("konu çalışması girdi: Matematik / Türev · 45 dk");
    expect(h[2].ozet).toBe("soru çözümü girdi: Fizik · 20 D / 4 Y / 1 B");
  });

  test("okulun toplu yüklemesi tek harekete iner; farklı deneme ayrı kalır", () => {
    const okul = (id: string, s: string, dk: number, yayinevi = "LİMİT(DUBLÖR)") => ({
      id, student_id: s, tur: "TYT", yayinevi, kaynak: "ogretmen", tarih: "2026-09-24", created_at: `2026-09-26T10:${String(dk).padStart(2, "0")}:00Z`, net: 50,
    });
    const h = hareketleriOlustur({
      konular: [], sorular: [], kayitlar: [],
      denemeler: [okul("1", "a", 0), okul("2", "b", 1), okul("3", "a", 2, "LİMİT(ORBİTAL)")],
    }, OGRENCILER);
    expect(h).toHaveLength(2);
    const dublor = h.find((x) => x.ozet.includes("DUBLÖR"))!;
    expect(dublor).toMatchObject({ tur: "okul-yukleme", ogrenci: null, kurum: "Fen Lisesi" });
    expect(dublor.ozet).toBe("24.09 TYT LİMİT(DUBLÖR) deneme sonuçları 2 öğrenciye yüklendi");
  });

  test("tanınmayan öğrencinin kaydı atlanır, limit uygulanır", () => {
    const konular = Array.from({ length: 5 }, (_, i) => ({ id: String(i), student_id: i === 0 ? "yok" : "a", ders: "D", konu: "K", sure_dakika: 1, created_at: `2026-09-26T10:0${i}:00Z` }));
    const h = hareketleriOlustur({ konular, sorular: [], denemeler: [], kayitlar: [] }, OGRENCILER, 3);
    expect(h).toHaveLength(3);
    expect(h.every((x) => x.ogrenci?.id === "a")).toBe(true);
  });
});

describe("sıralamalar", () => {
  test("en çok veri giren, tür kırılımıyla", () => {
    const s = veriGirisSiralamasi([
      { studentId: "a", tur: "konu" }, { studentId: "a", tur: "soru" }, { studentId: "a", tur: "soru" },
      { studentId: "b", tur: "deneme" },
    ], OGRENCILER);
    expect(s[0]).toMatchObject({ toplam: 3, konu: 1, soru: 2, deneme: 0 });
    expect(s[0].ogrenci.ad).toBe("Ahmet");
    expect(s[1].ogrenci.ad).toBe("Beren");
  });

  test("aktif gün: gün sayısı, eşitlikte son gün yeni olan önce", () => {
    const s = aktifGunSiralamasi([
      { user_id: "a", gun: "2026-09-20" }, { user_id: "a", gun: "2026-09-21" },
      { user_id: "b", gun: "2026-09-22" }, { user_id: "b", gun: "2026-09-25" },
      { user_id: "c", gun: "2026-09-25" }, { user_id: "ogretmen", gun: "2026-09-25" },
    ], OGRENCILER);
    expect(s.map((x) => [x.ogrenci.ad, x.gunSayisi, x.sonGun])).toEqual([
      ["Beren", 2, "2026-09-25"], ["Ahmet", 2, "2026-09-21"], ["Cem", 1, "2026-09-25"],
    ]);
  });
});
