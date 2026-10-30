// Yalnız sunucuda. Kurumların SMS sağlayıcı kimlik bilgileri AES-256-GCM ile
// şifrelenip kurum_sms_ayarlari.kimlik_sifreli alanında durur. Ayrı anahtar
// (SMS_KIMLIK_ANAHTARI, 64 hex): Drive/Supabase/JWT anahtarları amaç dışı kullanılmaz.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const AAD = Buffer.from("sf-sms-kimlik-v1");

function anahtar(): Buffer {
  const v = process.env.SMS_KIMLIK_ANAHTARI ?? "";
  if (!/^[a-f0-9]{64}$/i.test(v)) throw new Error("SMS şifreleme anahtarı ayarlanmamış.");
  return Buffer.from(v, "hex");
}

export function smsKimlikSifrele(kimlik: Record<string, string>): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", anahtar(), iv);
  c.setAAD(AAD);
  const data = Buffer.concat([c.update(JSON.stringify(kimlik), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function smsKimlikCoz(metin: string): Record<string, string> {
  const parcalar = metin.split(".");
  if (parcalar.length !== 3) throw new Error("SMS bağlantısı yeniden kurulmalı.");
  const [iv, tag, data] = parcalar.map((v) => Buffer.from(v, "base64url"));
  const c = createDecipheriv("aes-256-gcm", anahtar(), iv);
  c.setAAD(AAD);
  c.setAuthTag(tag);
  const cozulen = JSON.parse(Buffer.concat([c.update(data), c.final()]).toString("utf8"));
  if (!cozulen || typeof cozulen !== "object") throw new Error("SMS bağlantısı yeniden kurulmalı.");
  return cozulen as Record<string, string>;
}
