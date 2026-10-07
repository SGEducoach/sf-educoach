import { describe, expect, test } from "vitest";
import {
  BAYRAK_SINIRI, GOREV_MIN_SAYI, GOREV_ORAN_ESIGI, NET_DUSUS_ESIGI, SESSIZ_GUN,
  bayraklariBelirle, ozetHesapla, satirAgirligi, type BayrakGirdisi,
} from "./rehber-bayrak";

const temiz: BayrakGirdisi = {
  girisYapmisMi: true, sonHareketGun: 1, denemeSayisi: 3,
  netDegisimi: 0, acikGorev: 0, gorevToplam: 5,
};
const kodlar = (g: Partial<BayrakGirdisi>) => bayraklariBelirle({ ...temiz, ...g }).map((b) => b.kod);

describe("eşikler kayıtlı", () => {
  test("kullanıcı kararı 07.10.2026", () => {
    expect(SESSIZ_GUN).toBe(14);
    expect(NET_DUSUS_ESIGI).toBe(5);
    expect(GOREV_ORAN_ESIGI).toBe(0.7);
    expect(GOREV_MIN_SAYI).toBe(3);
    expect(BAYRAK_SINIRI).toBe(3);
  });
});

describe("düzgün giden öğrenci", () => {
  test("hiç bayrak almaz", () => {
    expect(kodlar({})).toEqual([]);
  });
});

describe("hesap-acilmamis — veri varlığından BAĞIMSIZ", () => {
  // Elbistan'da 88 öğrenci hiç giriş yapmamış ama veri yoklar 46: bir
  // kısmının verisi öğretmen girişinden/deneme PDF eşleştirmesinden geliyor.
  // "Sayıları var ama çocuk sistemde yok" ayrımı bu yüzden şart.
  test("verisi olsa bile giriş yoksa bayrak yanar", () => {
    expect(kodlar({ girisYapmisMi: false, sonHareketGun: 1 })).toContain("hesap-acilmamis");
  });

  test("giriş varsa yanmaz", () => {
    expect(kodlar({ girisYapmisMi: true })).not.toContain("hesap-acilmamis");
  });
});

describe("hic-veri-yok ve sessiz birbirini DIŞLAR", () => {
  test("hiç iz yoksa hic-veri-yok, sessiz değil", () => {
    const k = kodlar({ sonHareketGun: null });
    expect(k).toContain("hic-veri-yok");
    expect(k).not.toContain("sessiz");
  });

  test("eşiğe oturan sessizlik bayrak yakar", () => {
    expect(kodlar({ sonHareketGun: SESSIZ_GUN })).toContain("sessiz");
  });

  test("eşiğin altındaki sessizlik bayrak yakmaz", () => {
    expect(kodlar({ sonHareketGun: SESSIZ_GUN - 1 })).not.toContain("sessiz");
  });

  test("sessizlik metni gün sayısını söyler", () => {
    const b = bayraklariBelirle({ ...temiz, sonHareketGun: 23 });
    expect(b.find((x) => x.kod === "sessiz")?.metin).toBe("23 gündür veri girmiyor");
  });
});

describe("net-dususu — yön değil, BÜYÜKLÜK ister", () => {
  test("eşiğe oturan düşüş bayrak yakar", () => {
    expect(kodlar({ netDegisimi: -NET_DUSUS_ESIGI })).toContain("net-dususu");
  });

  // Tabansız bırakılırsa normal dalgalanma düzinelerce bayrak yakar.
  test("eşiğin altındaki düşüş bayrak yakmaz", () => {
    expect(kodlar({ netDegisimi: -4.9 })).not.toContain("net-dususu");
  });

  test("yükseliş asla bayrak yakmaz", () => {
    expect(kodlar({ netDegisimi: 20 })).not.toContain("net-dususu");
  });

  // yonBelirle ile aynı ilke: iki noktadan az veriyle değişim uydurulmaz.
  test("tek denemede bayrak yok", () => {
    expect(kodlar({ denemeSayisi: 1, netDegisimi: -30 })).not.toContain("net-dususu");
    expect(kodlar({ denemeSayisi: 3, netDegisimi: null })).not.toContain("net-dususu");
  });

  test("metin düşüş miktarını söyler", () => {
    const b = bayraklariBelirle({ ...temiz, netDegisimi: -12.34 });
    expect(b.find((x) => x.kod === "net-dususu")?.metin).toBe("Net 12.3 puan düştü");
  });
});

describe("gorev-birikmis — min sayı tabanı yanıltmayı önler", () => {
  test("oran ve sayı yeterliyse yanar", () => {
    expect(kodlar({ acikGorev: 8, gorevToplam: 10 })).toContain("gorev-birikmis");
  });

  // Tek görevi olup yapmayan herkes %100 görünür — bu bayrak değil, gürültü.
  test("3 görevden az ise oran %100 olsa da yanmaz", () => {
    expect(kodlar({ acikGorev: 1, gorevToplam: 1 })).not.toContain("gorev-birikmis");
    expect(kodlar({ acikGorev: 2, gorevToplam: 2 })).not.toContain("gorev-birikmis");
  });

  test("tam eşikte yanar, altında yanmaz", () => {
    expect(kodlar({ acikGorev: 7, gorevToplam: 10 })).toContain("gorev-birikmis");
    expect(kodlar({ acikGorev: 6, gorevToplam: 10 })).not.toContain("gorev-birikmis");
  });

  test("hiç görevi olmayan bölme hatası vermez", () => {
    expect(kodlar({ acikGorev: 0, gorevToplam: 0 })).not.toContain("gorev-birikmis");
  });
});

describe("sıralama", () => {
  test("bayraklar ağırlığa göre azalan sırada döner", () => {
    const b = bayraklariBelirle({ girisYapmisMi: false, sonHareketGun: null, denemeSayisi: 3, netDegisimi: -10, acikGorev: 9, gorevToplam: 10 });
    const agirliklar = b.map((x) => x.agirlik);
    expect([...agirliklar].sort((a, z) => z - a)).toEqual(agirliklar);
    expect(b[0].kod).toBe("hesap-acilmamis");
  });

  // Tek KRİTİK bayrak, üç hafif bayraktan önce gelmeli — rehber önce
  // gerçekten kopmuş öğrenciyi görsün.
  test("tek kritik bayrak, çok sayıda hafif bayrağı geçer", () => {
    const kritik = bayraklariBelirle({ ...temiz, girisYapmisMi: false });
    const hafif = bayraklariBelirle({ ...temiz, sonHareketGun: 20, netDegisimi: -10, acikGorev: 9, gorevToplam: 10 });
    expect(hafif.length).toBeGreaterThan(kritik.length);
    expect(satirAgirligi(kritik)).toBeGreaterThan(satirAgirligi(hafif));
  });

  test("bayraksız satırın ağırlığı sıfır", () => {
    expect(satirAgirligi([])).toBe(0);
  });

  test("uzun sessizlik daha ağır", () => {
    const a = satirAgirligi(bayraklariBelirle({ ...temiz, sonHareketGun: 15 }));
    const z = satirAgirligi(bayraklariBelirle({ ...temiz, sonHareketGun: 50 }));
    expect(z).toBeGreaterThan(a);
  });
});

describe("ozetHesapla", () => {
  test("her bayrağı ayrı sayar, bayraksızı saymaz", () => {
    const listeler = [
      bayraklariBelirle({ ...temiz, girisYapmisMi: false, sonHareketGun: null }),
      bayraklariBelirle({ ...temiz, sonHareketGun: 20 }),
      bayraklariBelirle(temiz),
    ];
    const ozet = ozetHesapla(listeler);
    expect(ozet).toEqual({
      toplam: 3, bayrakli: 2, hesapAcilmamis: 1, hicVeriYok: 1,
      sessiz: 1, netDususu: 0, gorevBirikmis: 0,
    });
  });
});
