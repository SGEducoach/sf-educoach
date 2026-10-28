import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { smsKimlikSifrele } from "@/lib/sms-kimlik-sifre";
import { sahteAdmin, type Satir } from "@/lib/sms-sahte-supabase";
import { smsGonder, SMS_ENCOK_ALICI, SMS_SAATLIK_GONDERIM, type SmsGonderimGirdisi } from "@/lib/sms-gonderim";

const OKUL = "11111111-1111-4111-8111-111111111111";
const SINIF_9 = "22222222-2222-4222-8222-222222222221";
const SINIF_11 = "22222222-2222-4222-8222-222222222222";
const KULLANICI = "33333333-3333-4333-8333-333333333333";
const ogrenci = (n: number, sinif: string, telefon: string | null) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, school_id: OKUL, class_id: sinif, okul_no: String(n),
  veli_telefon: telefon, profiles: { ad: `Öğrenci ${n}` },
});

function tablolar(ek: Partial<Record<string, Satir[]>> = {}, saglayici = "verimor"): Record<string, Satir[]> {
  return {
    schools: [{ id: OKUL, ad: "Test Okulu", aktif: true, manuel_aktif: true, kullanim_bitis_tarihi: null, grup_kapasitesi: null, modul_yetkileri: { sms: true } }],
    kurum_sms_ayarlari: [{
      school_id: OKUL, saglayici, secili_baslik: "KURUM", basliklar: ["KURUM"],
      kimlik_sifreli: smsKimlikSifrele({ kullanici: "908501234567", sifre: "gizli", anahtar: "k", hash: "h" }),
    }],
    classes: [{ id: SINIF_9, school_id: OKUL, seviye: "9", sube: "A" }, { id: SINIF_11, school_id: OKUL, seviye: "11", sube: "B" }],
    students: [
      ogrenci(1, SINIF_9, "0532 123 45 67"), ogrenci(2, SINIF_9, "905321234567"), ogrenci(3, SINIF_9, "yok"), ogrenci(4, SINIF_9, "0533 111 22 33"),
      ogrenci(5, SINIF_11, "0534 999 88 77"),
    ],
    sms_gonderimleri: [],
    ...ek,
  };
}

const girdi = (ek: Partial<SmsGonderimGirdisi> = {}): SmsGonderimGirdisi => ({
  erisim: { userId: KULLANICI, schoolId: OKUL, rol: "mudur", sinifDuzeyleri: null },
  icerik: "Sayın velimiz, yarın toplantı vardır.", sinifIdleri: [SINIF_9], ogrenciIdleri: null, zaman: null, ...ek,
});

const eskiAnahtar = process.env.SMS_KIMLIK_ANAHTARI;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  process.env.SMS_KIMLIK_ANAHTARI = "c".repeat(64);
  fetchMock = vi.fn(async () => new Response("9001", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  if (eskiAnahtar === undefined) delete process.env.SMS_KIMLIK_ANAHTARI; else process.env.SMS_KIMLIK_ANAHTARI = eskiAnahtar;
});

const sms = (a: ReturnType<typeof sahteAdmin>, g: SmsGonderimGirdisi) => smsGonder(a as never, g);

describe("smsGonder", () => {
  it("tekrarlı ve geçersiz numaraları ayıklar, geçmişe numara yazmaz", async () => {
    const admin = sahteAdmin(tablolar());
    const sonuc = await sms(admin, girdi());
    expect(sonuc).toMatchObject({ error: null, sonuc: { durum: "gonderildi", aliciSayisi: 2, gecersizSayisi: 1, tekrarSayisi: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const istek = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(istek.source_addr).toBe("KURUM");
    expect(istek.messages[0].dest).toBe("905321234567,905331112233");
    const kayit = admin.eklenen.sms_gonderimleri[0];
    expect(kayit).toMatchObject({ durum: "gonderildi", alici_sayisi: 2, baslik: "KURUM", alici_turu: "veli", gonderen_id: KULLANICI });
    expect(JSON.stringify(kayit)).not.toMatch(/90532|90533|0532|gizli/);
  });

  it("yalnız işaretli öğrencilere gönderir", async () => {
    const admin = sahteAdmin(tablolar());
    const sonuc = await sms(admin, girdi({ ogrenciIdleri: ["00000000-0000-4000-8000-000000000004"] }));
    expect(sonuc).toMatchObject({ error: null, sonuc: { aliciSayisi: 1 } });
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).messages[0].dest).toBe("905331112233");
  });

  it("kapsam dışı sınıfı reddeder ve hiçbir şey göndermez", async () => {
    const admin = sahteAdmin(tablolar());
    const sonuc = await sms(admin, girdi({
      erisim: { userId: KULLANICI, schoolId: OKUL, rol: "rehber", sinifDuzeyleri: ["9"] }, sinifIdleri: [SINIF_9, SINIF_11],
    }));
    expect(sonuc.error).toMatch(/yetkiniz yok/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(admin.eklenen.sms_gonderimleri).toBeUndefined();
  });

  it("sınıf düzeyi atanmamış kişi gönderemez", async () => {
    const sonuc = await sms(sahteAdmin(tablolar()), girdi({ erisim: { userId: KULLANICI, schoolId: OKUL, rol: "mudur_yardimcisi", sinifDuzeyleri: [] } }));
    expect(sonuc.error).toMatch(/atanmamış/);
  });

  it("başka kurumun sınıfını kullanamaz", async () => {
    const yabanci = "44444444-4444-4444-8444-444444444444";
    const t = tablolar();
    t.classes.push({ id: yabanci, school_id: "99999999-9999-4999-8999-999999999999", seviye: "9", sube: "Z" });
    const sonuc = await sms(sahteAdmin(t), girdi({ sinifIdleri: [yabanci] }));
    expect(sonuc.error).toMatch(/yetkiniz yok/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("modül kapalıysa ya da bağlantı yoksa gönderilmez", async () => {
    const kapali = tablolar();
    kapali.schools[0].modul_yetkileri = {};
    expect((await sms(sahteAdmin(kapali), girdi())).error).toMatch(/kapalı/);
    const baglantisiz = tablolar({ kurum_sms_ayarlari: [] });
    expect((await sms(sahteAdmin(baglantisiz), girdi())).error).toMatch(/kurulmamış/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("boş ve aşırı uzun içeriği reddeder", async () => {
    expect((await sms(sahteAdmin(tablolar()), girdi({ icerik: "  \u0000 " }))).error).toMatch(/boş/);
    expect((await sms(sahteAdmin(tablolar()), girdi({ icerik: "a".repeat(601) }))).error).toMatch(/en fazla/);
  });

  it("saatlik sınırı ve yinelenen gönderimi engeller", async () => {
    const simdi = new Date().toISOString();
    const cok = Array.from({ length: SMS_SAATLIK_GONDERIM }, () => ({ gonderen_id: KULLANICI, created_at: simdi, icerik: "baska", hedef_ozeti: "x" }));
    expect((await sms(sahteAdmin(tablolar({ sms_gonderimleri: cok })), girdi())).error).toMatch(/Saatlik/);

    const ilk = sahteAdmin(tablolar());
    await sms(ilk, girdi());
    const ikinci = sahteAdmin(tablolar({ sms_gonderimleri: ilk.eklenen.sms_gonderimleri.map((k) => ({ ...k, created_at: simdi })) }));
    expect((await sms(ikinci, girdi())).error).toMatch(/az önce/);
  });

  it("zamanlamayı sağlayıcı yeteneğine ve süre aralığına göre denetler", async () => {
    const gelecek = (dk: number) => new Date(Date.now() + dk * 60_000);
    expect((await sms(sahteAdmin(tablolar()), girdi({ zaman: gelecek(2) }))).error).toMatch(/5 dakika/);
    expect((await sms(sahteAdmin(tablolar()), girdi({ zaman: gelecek(60 * 24 * 31) }))).error).toMatch(/30 gün/);
    expect((await sms(sahteAdmin(tablolar({}, "iletimerkezi")), girdi({ zaman: gelecek(60) }))).error).toMatch(/desteklenmiyor/);
    const admin = sahteAdmin(tablolar());
    expect(await sms(admin, girdi({ zaman: gelecek(60) }))).toMatchObject({ error: null, sonuc: { durum: "zamanlandi" } });
    expect(admin.eklenen.sms_gonderimleri[0]).toMatchObject({ durum: "zamanlandi" });
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).send_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("sağlayıcı reddederse hatayı geçmişe yazar ve kullanıcıya açıklar", async () => {
    fetchMock.mockResolvedValue(new Response("INSUFFICIENT_CREDITS", { status: 400 }));
    const admin = sahteAdmin(tablolar());
    const sonuc = await sms(admin, girdi());
    expect(sonuc.error).toMatch(/yeterli kredi/);
    expect(admin.eklenen.sms_gonderimleri[0]).toMatchObject({ durum: "hata", alici_sayisi: 0 });
  });

  it("alıcı sınırını uygular", async () => {
    const t = tablolar();
    t.students = Array.from({ length: SMS_ENCOK_ALICI + 1 }, (_, i) => ({
      id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`, school_id: OKUL, class_id: SINIF_9, okul_no: String(i),
      veli_telefon: `05${String(300000000 + i).padStart(9, "0")}`, profiles: { ad: `Ö ${i}` },
    }));
    const sonuc = await sms(sahteAdmin(t), girdi());
    expect(sonuc.error).toMatch(/en çok 1000/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
