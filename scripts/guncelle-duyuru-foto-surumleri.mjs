import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Yalnız yerleşik duyuru görsellerinin içerik sürümlerini üretir; build'de çalışmaz.
const klasor = new URL("../public/duyuru-fotograflari/", import.meta.url);
const dosyalar = (await readdir(klasor)).filter((ad) => ad.endsWith(".jpg")).sort();
const kayitlar = await Promise.all(dosyalar.map(async (ad) => [ad,
  createHash("sha256").update(await readFile(new URL(ad, klasor))).digest("hex").slice(0, 12),
]));
await writeFile(new URL("../src/lib/duyuru-foto-surumleri.json", import.meta.url), JSON.stringify(Object.fromEntries(kayitlar), null, 2) + "\n");
console.log(`${dosyalar.length} yerleşik fotoğrafın içerik sürümü güncellendi.`);
