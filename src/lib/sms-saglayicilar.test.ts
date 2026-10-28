import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmsHatasi, smsKimliginiTemizle, smsSaglayicisi } from "@/lib/sms-saglayicilar";

type Cagri = { url: string; init: RequestInit };
let cagrilar: Cagri[];

function sahteAg(yanitlar: { durum: number; govde: string }[]) {
  cagrilar = [];
  let i = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    cagrilar.push({ url, init });
    const y = yanitlar[Math.min(i++, yanitlar.length - 1)];
    return new Response(y.govde, { status: y.durum });
  }));
}
const govde = (c: Cagri) => JSON.parse(c.init.body as string);

beforeEach(() => { cagrilar = []; });
afterEach(() => { vi.unstubAllGlobals(); });

describe("Verimor", () => {
  const kimlik = { kullanici: "908501234567", sifre: "p@ss&1" };

  it("başlıkları ve bakiyeyi sağlayıcıdan çeker (kimlik sorguda kodlanır)", async () => {
    sahteAg([{ durum: 200, govde: '["Kurum A","Kurum B"]' }, { durum: 200, govde: "123" }]);
    const s = await smsSaglayicisi("verimor").dogrula(kimlik);
    expect(s).toEqual({ basliklar: ["Kurum A", "Kurum B"], bakiye: "123 kredi" });
    expect(cagrilar[0].url).toBe("https://sms.verimor.com.tr/v2/headers?username=908501234567&password=p%40ss%261");
  });

  it("bakiye alınamazsa doğrulama yine başarılıdır", async () => {
    sahteAg([{ durum: 200, govde: '["Kurum A"]' }, { durum: 500, govde: "hata" }]);
    expect((await smsSaglayicisi("verimor").dogrula(kimlik)).bakiye).toBeNull();
  });

  it("hatalı şifre ve IP kısıtını ayırt eder", async () => {
    sahteAg([{ durum: 401, govde: "Geçersiz kullanıcı adı/şifre" }]);
    await expect(smsSaglayicisi("verimor").dogrula(kimlik)).rejects.toThrow(/hatalı/);
    sahteAg([{ durum: 401, govde: "Hesabınızda izinli IP ayarları yapılmamış" }]);
    await expect(smsSaglayicisi("verimor").dogrula(kimlik)).rejects.toThrow(/IP/);
  });

  it("gönderimi kılavuzdaki alanlarla yapar; zaman İstanbul saatiyle gider", async () => {
    sahteAg([{ durum: 200, govde: "20212" }]);
    const s = await smsSaglayicisi("verimor").gonder(kimlik, {
      baslik: "Kurum A", mesaj: "Merhaba", numaralar: ["905321234567", "905331112233"], zaman: new Date("2026-11-02T10:30:00Z"),
    });
    expect(s.isId).toBe("20212");
    expect(cagrilar[0].url).toBe("https://sms.verimor.com.tr/v2/send.json");
    expect(govde(cagrilar[0])).toEqual({
      username: "908501234567", password: "p@ss&1", source_addr: "Kurum A",
      messages: [{ msg: "Merhaba", dest: "905321234567,905331112233" }], send_at: "2026-11-02 13:30:00",
    });
  });

  it("sağlayıcı hata kodunu Türkçe açıklar ve kimliği sızdırmaz", async () => {
    sahteAg([{ durum: 400, govde: "INSUFFICIENT_CREDITS" }]);
    const hata = await smsSaglayicisi("verimor").gonder(kimlik, { baslik: "A", mesaj: "m", numaralar: ["905321234567"] }).catch((e) => e);
    expect(hata).toBeInstanceOf(SmsHatasi);
    expect(hata.message).toMatch(/yeterli kredi/);
    expect(hata.message).not.toContain("p@ss");
  });

  it("ağ hatasında kimlik içeren URL sızmaz", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connect ECONNREFUSED ...password=p@ss"); }));
    const hata = await smsSaglayicisi("verimor").dogrula(kimlik).catch((e) => e);
    expect(hata).toBeInstanceOf(SmsHatasi);
    expect(hata.message).not.toContain("p@ss");
    expect(hata.kalici).toBe(false);
  });
});

describe("Netgsm", () => {
  const kimlik = { kullanici: "8501234567", sifre: "sifre" };

  it("başlıkları Basic yetkiyle çeker", async () => {
    sahteAg([{ durum: 200, govde: '{"code":"00","msgheaders":["KURUM","KURUM"]}' }]);
    const s = await smsSaglayicisi("netgsm").dogrula(kimlik);
    expect(s.basliklar).toEqual(["KURUM"]);
    expect((cagrilar[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("8501234567:sifre").toString("base64")}`);
  });

  it("30 kodu kimlik hatasıdır", async () => {
    sahteAg([{ durum: 200, govde: '{"code":"30"}' }]);
    await expect(smsSaglayicisi("netgsm").dogrula(kimlik)).rejects.toThrow(/hatalı/);
  });

  it("gönderimde numaralar on haneli, zaman ggAAyyyySSdd biçimindedir", async () => {
    sahteAg([{ durum: 200, govde: '{"code":"00","jobid":"123456"}' }]);
    const s = await smsSaglayicisi("netgsm").gonder(kimlik, {
      baslik: "KURUM", mesaj: "Merhaba", numaralar: ["905321234567"], zaman: new Date("2026-11-02T10:30:00Z"),
    });
    expect(s.isId).toBe("123456");
    expect(govde(cagrilar[0])).toMatchObject({
      msgheader: "KURUM", messages: [{ msg: "Merhaba", no: "5321234567" }], startdate: "021120261330",
    });
  });

  it("40 kodu başlık hatasıdır", async () => {
    sahteAg([{ durum: 200, govde: '{"code":"40"}' }]);
    await expect(smsSaglayicisi("netgsm").gonder(kimlik, { baslik: "X", mesaj: "m", numaralar: ["905321234567"] })).rejects.toThrow(/Başlık/);
  });
});

describe("İleti Merkezi", () => {
  const kimlik = { anahtar: "key", hash: "hash" };

  it("başlık ve bakiyeyi çeker", async () => {
    sahteAg([
      { durum: 200, govde: '{"response":{"status":{"code":200,"message":"ok"},"senders":{"sender":["KURUM","DIGER"]}}}' },
      { durum: 200, govde: '{"response":{"status":{"code":200},"balance":{"amount":"0.00","sms":"2500"}}}' },
    ]);
    const s = await smsSaglayicisi("iletimerkezi").dogrula(kimlik);
    expect(s).toEqual({ basliklar: ["KURUM", "DIGER"], bakiye: "2500 SMS" });
    expect(govde(cagrilar[0])).toEqual({ request: { authentication: { key: "key", hash: "hash" } } });
  });

  it("tek başlık dizi olmadan gelirse de okunur", async () => {
    sahteAg([{ durum: 200, govde: '{"response":{"status":{"code":200},"senders":{"sender":"KURUM"}}}' }, { durum: 500, govde: "" }]);
    expect((await smsSaglayicisi("iletimerkezi").dogrula(kimlik)).basliklar).toEqual(["KURUM"]);
  });

  it("401 kimlik hatasıdır", async () => {
    sahteAg([{ durum: 401, govde: '{"response":{"status":{"code":401,"message":"x"}}}' }]);
    await expect(smsSaglayicisi("iletimerkezi").dogrula(kimlik)).rejects.toThrow(/hash/);
  });

  it("gönderimde alıcılar receipents.number altındadır; zamanlama desteklenmez", async () => {
    sahteAg([{ durum: 200, govde: '{"response":{"status":{"code":200},"order":{"id":777}}}' }]);
    const s = await smsSaglayicisi("iletimerkezi").gonder(kimlik, { baslik: "KURUM", mesaj: "Merhaba", numaralar: ["905321234567"] });
    expect(s.isId).toBe("777");
    expect(govde(cagrilar[0]).request.order).toEqual({ sender: "KURUM", message: { text: "Merhaba", receipents: { number: ["905321234567"] } } });
    await expect(smsSaglayicisi("iletimerkezi").gonder(kimlik, { baslik: "K", mesaj: "m", numaralar: ["905321234567"], zaman: new Date() })).rejects.toThrow(/ileri tarihli/);
  });
});

describe("smsKimliginiTemizle", () => {
  it("yalnız tanımlı alanları alır, fazlalığı atar", () => {
    expect(smsKimliginiTemizle("verimor", { kullanici: " 9085 ", sifre: "x", baska: "y" })).toEqual({ kullanici: "9085", sifre: "x" });
  });
  it("eksik, boş ya da aşırı uzun alanı ve bilinmeyen sağlayıcıyı reddeder", () => {
    expect(smsKimliginiTemizle("verimor", { kullanici: "a" })).toBeNull();
    expect(smsKimliginiTemizle("verimor", { kullanici: "a", sifre: " " })).toBeNull();
    expect(smsKimliginiTemizle("verimor", { kullanici: "a", sifre: "x".repeat(201) })).toBeNull();
    expect(smsKimliginiTemizle("yok", { a: "b" })).toBeNull();
  });
});

describe("sağlayıcı kaydı", () => {
  it("bilinmeyen sağlayıcı hata verir", () => {
    expect(() => smsSaglayicisi("yok")).toThrow(SmsHatasi);
  });
});
