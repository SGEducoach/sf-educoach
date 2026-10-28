import { describe, expect, it } from "vitest";
import { smsKullaniciErisimi, smsKurumunuGetir, smsSeviyeKapsamdaMi, smsYonetimErisimi } from "@/lib/sms-erisim";
import { sahteAdmin } from "@/lib/sms-sahte-supabase";

const OKUL = "11111111-1111-4111-8111-111111111111";
const DIGER_OKUL = "99999999-9999-4999-8999-999999999999";
const kullanici = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;

function tablolar(ek: Record<string, Record<string, unknown>[]> = {}) {
  return {
    schools: [
      { id: OKUL, ad: "A", tur: "okul", aktif: true, manuel_aktif: true, kullanim_bitis_tarihi: null, grup_kapasitesi: null, modul_yetkileri: { sms: true } },
      { id: DIGER_OKUL, ad: "B", tur: "dershane", aktif: true, manuel_aktif: true, kullanim_bitis_tarihi: null, grup_kapasitesi: null, modul_yetkileri: {} },
    ],
    profiles: [
      { id: kullanici(1), role: "mudur" }, { id: kullanici(2), role: "ogretmen" }, { id: kullanici(3), role: "ogretmen" },
      { id: kullanici(4), role: "ogretmen" }, { id: kullanici(5), role: "admin" }, { id: kullanici(6), role: "ogrenci" },
      { id: kullanici(7), role: "ogretmen" },
    ],
    teachers: [
      { id: kullanici(1), school_id: OKUL, brans: null }, { id: kullanici(2), school_id: OKUL, brans: "Matematik" },
      { id: kullanici(3), school_id: OKUL, brans: "Matematik" }, { id: kullanici(4), school_id: OKUL, brans: "Fizik" },
      { id: kullanici(7), school_id: DIGER_OKUL, brans: "Rehber Öğretmen" },
    ],
    mudur_yardimcilari: [{ profile_id: kullanici(2), school_id: OKUL, sinif_duzeyleri: ["9", "10"], yurt: false }],
    rehberlik_servisi: [{ profile_id: kullanici(3), school_id: OKUL, sinif_duzeyleri: ["11"] }],
    school_moderators: [{ profile_id: kullanici(4), school_id: OKUL }],
    ...ek,
  };
}
const a = (ek = {}) => sahteAdmin(tablolar(ek)) as never;

describe("smsKullaniciErisimi", () => {
  it("müdür kurumun tamamını kullanır", async () => {
    expect(await smsKullaniciErisimi(a(), kullanici(1))).toEqual({ userId: kullanici(1), schoolId: OKUL, rol: "mudur", sinifDuzeyleri: null });
  });
  it("müdür yardımcısı yalnız sorumlu düzeylerini görür", async () => {
    expect(await smsKullaniciErisimi(a(), kullanici(2))).toMatchObject({ rol: "mudur_yardimcisi", sinifDuzeyleri: ["9", "10"] });
  });
  it("okul rehberi servis üyeliğindeki düzeylerle sınırlıdır", async () => {
    expect(await smsKullaniciErisimi(a(), kullanici(3))).toMatchObject({ rol: "rehber", sinifDuzeyleri: ["11"] });
  });
  it("dershane rehberi branştan tanınır ve kurumun tamamını görür", async () => {
    expect(await smsKullaniciErisimi(a(), kullanici(7))).toMatchObject({ schoolId: DIGER_OKUL, rol: "rehber", sinifDuzeyleri: null });
  });
  it("hem yardımcı hem rehber olan kişinin kapsamı birleşir", async () => {
    const t = { rehberlik_servisi: [{ profile_id: kullanici(2), school_id: OKUL, sinif_duzeyleri: ["11", "9"] }] };
    const e = await smsKullaniciErisimi(a(t), kullanici(2));
    expect(e?.sinifDuzeyleri?.sort()).toEqual(["10", "11", "9"]);
  });
  it("sıradan öğretmen, moderatör, öğrenci ve admin kullanamaz", async () => {
    expect(await smsKullaniciErisimi(a(), kullanici(4))).toBeNull();
    expect(await smsKullaniciErisimi(a(), kullanici(6))).toBeNull();
    expect(await smsKullaniciErisimi(a(), kullanici(5))).toBeNull();
    expect(await smsKullaniciErisimi(a(), kullanici(9))).toBeNull();
  });
  it("başka kurumdaki üyelik bu kurumda geçerli sayılmaz", async () => {
    const t = { mudur_yardimcilari: [{ profile_id: kullanici(2), school_id: DIGER_OKUL, sinif_duzeyleri: ["9"], yurt: false }], rehberlik_servisi: [] };
    expect(await smsKullaniciErisimi(a(t), kullanici(2))).toBeNull();
  });
});

describe("smsYonetimErisimi", () => {
  it("moderatör ve müdür kendi kurumunu yönetir", async () => {
    expect(await smsYonetimErisimi(a(), kullanici(4))).toEqual({ userId: kullanici(4), schoolId: OKUL, admin: false });
    expect(await smsYonetimErisimi(a(), kullanici(1))).toMatchObject({ schoolId: OKUL, admin: false });
  });
  it("başka kurumu istemek reddedilir", async () => {
    expect(await smsYonetimErisimi(a(), kullanici(4), DIGER_OKUL)).toBeNull();
  });
  it("admin yalnız kurum belirterek yönetir", async () => {
    expect(await smsYonetimErisimi(a(), kullanici(5))).toBeNull();
    expect(await smsYonetimErisimi(a(), kullanici(5), DIGER_OKUL)).toMatchObject({ schoolId: DIGER_OKUL, admin: true });
  });
  it("rehber, yardımcı ve öğrenci bağlantıyı yönetemez", async () => {
    expect(await smsYonetimErisimi(a(), kullanici(3))).toBeNull();
    expect(await smsYonetimErisimi(a(), kullanici(2))).toBeNull();
    expect(await smsYonetimErisimi(a(), kullanici(6))).toBeNull();
  });
});

describe("smsKurumunuGetir", () => {
  it("modül varsayılan kapalıdır, açıkça açılınca açık", async () => {
    expect((await smsKurumunuGetir(a(), OKUL))?.modulAcik).toBe(true);
    expect((await smsKurumunuGetir(a(), DIGER_OKUL))?.modulAcik).toBe(false);
  });
  it("pasif kuruma erişim yoktur", async () => {
    const t = { schools: [{ id: OKUL, ad: "A", aktif: false, manuel_aktif: false, kullanim_bitis_tarihi: null, grup_kapasitesi: null, modul_yetkileri: { sms: true } }] };
    expect(await smsKurumunuGetir(a(t), OKUL)).toBeNull();
  });
  it("grup koçluk kurumu SMS kullanamaz", async () => {
    const t = { schools: [{ id: OKUL, ad: "A", aktif: true, manuel_aktif: true, kullanim_bitis_tarihi: null, grup_kapasitesi: 10, modul_yetkileri: { sms: true } }] };
    expect(await smsKurumunuGetir(a(t), OKUL)).toBeNull();
  });
});

describe("smsSeviyeKapsamdaMi", () => {
  it("null kapsam hepsini, dizi yalnız içindekileri kapsar", () => {
    expect(smsSeviyeKapsamdaMi(null, "9")).toBe(true);
    expect(smsSeviyeKapsamdaMi(["9"], "9")).toBe(true);
    expect(smsSeviyeKapsamdaMi(["9"], "11")).toBe(false);
    expect(smsSeviyeKapsamdaMi([], "9")).toBe(false);
  });
});
