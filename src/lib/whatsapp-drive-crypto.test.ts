import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { driveBiletImzala, driveBiletOku, driveSirCoz, driveSirSifrele } from "./whatsapp-drive-crypto";
beforeEach(() => vi.stubEnv("GOOGLE_DRIVE_TOKEN_KEY", "ab".repeat(32)));
afterEach(() => vi.unstubAllEnvs());
describe("Drive sır ve işlem biletleri", () => {
  it("yenileme anahtarını farklı IV ile şifreler ve geri açar", () => {
    const a = driveSirSifrele("refresh-secret"), b = driveSirSifrele("refresh-secret");
    expect(a).not.toContain("refresh-secret"); expect(a).not.toBe(b); expect(driveSirCoz(a)).toBe("refresh-secret");
  });
  it("şifreli içerik değiştirilirse reddeder", () => {
    const p = driveSirSifrele("secret").split("."); const b = Buffer.from(p[2], "base64url"); b[0] ^= 1; p[2] = b.toString("base64url");
    expect(() => driveSirCoz(p.join("."))).toThrow();
  });
  it("yanlış anahtarla sırrı açamaz", () => {
    const e = driveSirSifrele("secret"); vi.stubEnv("GOOGLE_DRIVE_TOKEN_KEY", "cd".repeat(32)); expect(() => driveSirCoz(e)).toThrow();
  });
  it("biletin içeriği, amacı ve geçerlilik süresini doğrular", () => {
    const veri = { aktor: "a", exp: Date.now() + 60_000 }, b = driveBiletImzala("yukleme", veri);
    expect(driveBiletOku("yukleme", b)).toEqual(veri);
    expect(() => driveBiletOku("oauth", b)).toThrow();
    expect(() => driveBiletOku("yukleme", b.replace(/^./, b[0] === "a" ? "b" : "a"))).toThrow();
    expect(() => driveBiletOku("yukleme", driveBiletImzala("yukleme", { exp: Date.now() - 1 }))).toThrow();
  });
  it("kurulum anahtarı yoksa açıkça durur", () => { vi.stubEnv("GOOGLE_DRIVE_TOKEN_KEY", ""); expect(() => driveSirSifrele("secret")).toThrow(); });
});
