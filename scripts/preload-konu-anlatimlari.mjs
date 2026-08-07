// Konu anlatımlarını toplu üretip konu_anlatimlari tablosuna önceden yükler.
// Zaten üretilmiş (ders,konu) çiftlerini atlar — istediğiniz kadar tekrar
// çalıştırabilirsiniz, sadece eksik olanları tamamlar.
//
// Çalıştırma: node scripts/preload-konu-anlatimlari.mjs
// Gerekli: .env.local içinde NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// ANTHROPIC_API_KEY

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";

// .env.local'i basitçe oku (dotenv kurulu değilse diye) — seed-demo-users.mjs ile aynı desen.
const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY .env.local'de yok.");
if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY .env.local'de yok — console.anthropic.com'dan alıp ekleyin.");

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anthropic = new Anthropic({ apiKey: anthropicKey });

const konular = JSON.parse(readFileSync(new URL("../src/lib/mufredat-konulari.json", import.meta.url), "utf-8"));

const SISTEM_PROMPTU = `Sen YKS (TYT/AYT) öğrencilerine konu anlatan deneyimli, sabırlı bir öğretmensin. Sana verilen ders ve konu için lise seviyesine uygun, açık ve sade bir Türkçeyle bir konu anlatımı yaz.

Kurallar:
- Düz metin yaz — LaTeX, markdown başlık (#), kalın (**) kullanma; gerekirse sade satır başları ve kısa paragraflarla yapılandır.
- Konunun mantığını, temel kurallarını ve varsa formüllerini düz metin olarak (örn. "türev = f'(x)") açıkla.
- En az bir kısa, somut örnek çöz.
- Sık yapılan hataları veya karıştırılan noktaları kısaca belirt.
- Uzunluk: yaklaşık 300-500 kelime. Motive edici ama abartısız bir üslup kullan.`;

function bekle(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { data: mevcutlar, error: okumaHatasi } = await admin.from("konu_anlatimlari").select("ders, konu");
  if (okumaHatasi) throw new Error("Mevcut konular okunamadı: " + okumaHatasi.message);
  const mevcutSet = new Set((mevcutlar ?? []).map((k) => `${k.ders}|${k.konu}`));

  const eksikler = konular.filter((k) => !mevcutSet.has(`${k.ders}|${k.konu}`));
  console.log(`Toplam ${konular.length} konu, ${mevcutSet.size} zaten var, ${eksikler.length} üretilecek.\n`);

  let basarili = 0;
  let basarisiz = 0;

  for (let i = 0; i < eksikler.length; i++) {
    const { ders, konu, seviye } = eksikler[i];
    process.stdout.write(`[${i + 1}/${eksikler.length}] ${ders} — ${konu} (${seviye})... `);
    try {
      const yanit = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 2000,
        system: SISTEM_PROMPTU,
        messages: [{ role: "user", content: `${ders} dersinden "${konu}" konusunu anlat.` }],
      });
      const metinBlogu = yanit.content.find((b) => b.type === "text");
      const icerik = metinBlogu?.text?.trim();
      if (!icerik) throw new Error("boş içerik döndü");

      const { error: yazmaHatasi } = await admin
        .from("konu_anlatimlari")
        .upsert({ ders, konu, icerik, seviye }, { onConflict: "ders,konu" });
      if (yazmaHatasi) throw new Error(yazmaHatasi.message);

      console.log("✓");
      basarili++;
    } catch (e) {
      console.log("✗ HATA: " + (e?.message ?? e));
      basarisiz++;
    }
    // API'ye nazik davranmak için küçük bir bekleme
    await bekle(300);
  }

  console.log(`\nBitti. Başarılı: ${basarili}, hatalı: ${basarisiz}, zaten mevcut: ${mevcutSet.size}.`);
  if (basarisiz > 0) console.log("Hatalı olanlar için script'i tekrar çalıştırmanız yeterli (sadece eksikler denenir).");
}

main().catch((e) => {
  console.error("Script hata ile durdu:", e);
  process.exit(1);
});
