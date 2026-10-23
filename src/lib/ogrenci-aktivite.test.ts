import { describe, expect, it } from "vitest";
import { GOREV_PENCERESI_GUN, gorevPenceresiBaslangici, ogrenciAktiviteOzetiEslestir } from "@/lib/ogrenci-aktivite";

describe("gorevPenceresiBaslangici", () => {
  it("pencere 30 gün (kullanıcı kararı 23.10.2026)", () => {
    expect(GOREV_PENCERESI_GUN).toBe(30);
  });

  it("bugünden 30 gün öncesini döner", () => {
    expect(gorevPenceresiBaslangici("2026-10-23")).toBe("2026-09-23");
  });

  it("ay/yıl sınırını doğru geçer", () => {
    expect(gorevPenceresiBaslangici("2026-01-05")).toBe("2025-12-06");
  });
});

describe("ogrenciAktiviteOzetiEslestir", () => {
  it("eksik görev alanlarını 0'a çevirir", () => {
    expect(ogrenciAktiviteOzetiEslestir({ student_id: "s1", son_hareket: null, acik_gorev: null, gorev_toplam: null })).toEqual({
      studentId: "s1",
      sonHareket: null,
      acikGorev: 0,
      gorevToplam: 0,
    });
  });

  it("RPC satırını uygulama tipine çevirir", () => {
    expect(ogrenciAktiviteOzetiEslestir({ student_id: "s2", son_hareket: "2026-10-20", acik_gorev: 2, gorev_toplam: 5 })).toEqual({
      studentId: "s2",
      sonHareket: "2026-10-20",
      acikGorev: 2,
      gorevToplam: 5,
    });
  });
});
