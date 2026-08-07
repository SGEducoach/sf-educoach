// Üretilmiş tüm konu anlatımlarını tek bir okunabilir Markdown dosyasına
// döker — ders bazında gruplu, sırayla. Amaç: 190 metni tek tek uygulamada
// tıklayıp açmak yerine tek dosyada hızlıca göz gezdirip tutarlılık/doğruluk
// kontrolü yapabilmek (özellikle formül içeren dersler: Matematik, Fizik,
// Kimya, Biyoloji).
//
// Çalıştırma: node scripts/export-konu-anlatimlari.mjs
// Çıktı: dokumanlar/mufredat/konu_anlatimlari_export.md

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY .env.local'de yok.");

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { data, error } = await admin
    .from("konu_anlatimlari")
    .select("ders, konu, seviye, icerik, created_at")
    .order("ders")
    .order("konu");
  if (error) throw new Error("Okunamadı: " + error.message);
  if (!data || data.length === 0) {
    console.log("Henüz hiç konu anlatımı üretilmemiş.");
    return;
  }

  const dersler = [...new Set(data.map((k) => k.ders))];
  let md = `# Konu Anlatımları — Dışa Aktarım (${data.length} konu)\n\n`;
  md += `Üretim tarihi aralığı kontrolü ve içerik tutarlılığı için hızlı göz gezdirme amaçlı.\n\n---\n\n`;

  for (const ders of dersler) {
    const konular = data.filter((k) => k.ders === ders);
    md += `## ${ders} (${konular.length} konu)\n\n`;
    for (const k of konular) {
      md += `### ${k.konu} ${k.seviye ? `— *${k.seviye}*` : ""}\n\n${k.icerik}\n\n---\n\n`;
    }
  }

  const outDir = new URL("../dokumanlar/mufredat/", import.meta.url);
  mkdirSync(outDir, { recursive: true });
  const outFile = new URL("konu_anlatimlari_export.md", outDir);
  writeFileSync(outFile, md, "utf-8");
  console.log(`${data.length} konu şuraya yazıldı: ${outFile.pathname.replace(/^\/([A-Za-z]:)/, "$1")}`);
}

main().catch((e) => {
  console.error("Script hata ile durdu:", e);
  process.exit(1);
});
