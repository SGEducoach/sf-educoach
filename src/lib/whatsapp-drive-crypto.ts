// Yalnız sunucuda. Ayrı anahtar: Supabase/JWT anahtarlarını amaç dışı kullanmayın.
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
function anahtar() {
  const v = process.env.GOOGLE_DRIVE_TOKEN_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(v)) throw new Error("Drive şifreleme anahtarı ayarlanmamış.");
  return Buffer.from(v, "hex");
}
export function driveSirSifrele(metin: string): string {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", anahtar(), iv);
  c.setAAD(Buffer.from("sf-whatsapp-drive-v1"));
  const data = Buffer.concat([c.update(metin, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}
export function driveSirCoz(metin: string): string {
  const parcalar = metin.split(".");
  if (parcalar.length !== 3) throw new Error("Drive bağlantısı yeniden kurulmalı.");
  const [iv, tag, data] = parcalar.map((v) => Buffer.from(v, "base64url"));
  const c = createDecipheriv("aes-256-gcm", anahtar(), iv);
  c.setAAD(Buffer.from("sf-whatsapp-drive-v1")); c.setAuthTag(tag);
  return Buffer.concat([c.update(data), c.final()]).toString("utf8");
}
export function driveBiletImzala(amac: "oauth" | "yukleme", veri: Record<string, unknown>): string {
  const data = Buffer.from(JSON.stringify(veri)).toString("base64url");
  return `${data}.${createHmac("sha256", anahtar()).update(`${amac}.${data}`).digest("base64url")}`;
}
export function driveBiletOku(amac: "oauth" | "yukleme", bilet: string): Record<string, unknown> {
  if (bilet.length > 4096) throw new Error("Geçersiz Drive işlemi.");
  const [data, sig, fazlasi] = bilet.split(".");
  const beklenen = createHmac("sha256", anahtar()).update(`${amac}.${data}`).digest();
  const gelen = Buffer.from(sig ?? "", "base64url");
  if (fazlasi || gelen.length !== beklenen.length || !timingSafeEqual(gelen, beklenen)) throw new Error("Geçersiz Drive işlemi.");
  const v = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  if (!v || typeof v.exp !== "number" || v.exp < Date.now()) throw new Error("Drive işleminin süresi doldu; yeniden deneyin.");
  return v;
}
