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
- Metni DOĞRUDAN konuyla başlat — en başa konu adını tekrar eden bir "# Başlık" satırı EKLEME, uygulama bunu zaten ayrıca gösteriyor.
- Konunun mantığını, temel kurallarını ve varsa formüllerini düz metin olarak (örn. "türev = f'(x)") açıkla.
- En az bir kısa, somut örnek çöz.
- Sık yapılan hataları veya karıştırılan noktaları kısaca belirt.
- Uzunluk: yaklaşık 300-500 kelime. Motive edici ama abartısız bir üslup kullan.`;

function bekle(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Model talimata uymayıp yine de markdown başlık/kalın işareti eklerse
// (gözlemlendi — 190 konudan 173'ünde baştan "# Başlık" çıktı) burada
// temizliyoruz, prompt uyumuna güvenmek yerine.
function icerikTemizle(text) {
  return text
    .replace(/^#{1,6}\s+.*\n+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
}

// ============ Kalite/tutarlılık kontrolü (otomatik, kaba sezgisel) ============
// 190 metni tek tek okumak pratik değil — bu, bariz sorunları (çok kısa/uzun,
// "ben bir yapay zekayım" gibi meta konuşma, markdown/LaTeX artığı, konu
// adının hiç geçmemesi) otomatik yakalar. Kesin doğruluk garantisi vermez —
// asıl amaç, hangi ~10-20 konunun elle gözden geçirilmeye değer olduğunu
// daraltmak. Ayrıca bkz. scripts/export-konu-anlatimlari.mjs (tüm içeriği
// tek dosyada okunabilir hâlde çıkarır, hızlı göz gezdirmek için).
const SUPHELI_KALIPLAR = [
  /yapay zeka(sı|yım)?/i, /dil modeli/i, /büyük dil modeli/i, /as an ai/i,
  /i cannot/i, /i'm sorry/i, /üzgünüm,? (ama|ancak)/i, /asistan(ım)? olarak/i,
];

function supheliMi(icerik, konu) {
  const sebepler = [];
  const kelimeSayisi = icerik.trim().split(/\s+/).length;
  if (kelimeSayisi < 120) sebepler.push(`çok kısa (${kelimeSayisi} kelime)`);
  if (kelimeSayisi > 800) sebepler.push(`çok uzun (${kelimeSayisi} kelime)`);
  if (/[#*`]{2,}|^#{1,6}\s/m.test(icerik)) sebepler.push("markdown artığı olabilir");
  if (/\\[a-zA-Z]+\{|\$\$/.test(icerik)) sebepler.push("LaTeX artığı olabilir");
  for (const kalip of SUPHELI_KALIPLAR) {
    if (kalip.test(icerik)) { sebepler.push("meta konuşma / öz-referans içeriyor olabilir"); break; }
  }
  // Konu adının en azından ilk anlamlı kelimesi metinde hiç geçmiyorsa şüpheli.
  const ilkKelime = konu.split(/[\s(),-]+/).find((w) => w.length > 3);
  if (ilkKelime && !icerik.toLowerCase().includes(ilkKelime.toLowerCase())) {
    sebepler.push(`"${ilkKelime}" kelimesi metinde geçmiyor`);
  }
  return sebepler;
}

async function main() {
  const { data: mevcutlar, error: okumaHatasi } = await admin.from("konu_anlatimlari").select("ders, konu");
  if (okumaHatasi) throw new Error("Mevcut konular okunamadı: " + okumaHatasi.message);
  const mevcutSet = new Set((mevcutlar ?? []).map((k) => `${k.ders}|${k.konu}`));

  const eksikler = konular.filter((k) => !mevcutSet.has(`${k.ders}|${k.konu}`));
  console.log(`Toplam ${konular.length} konu, ${mevcutSet.size} zaten var, ${eksikler.length} üretilecek.\n`);

  let basarili = 0;
  let basarisiz = 0;
  const supheliListe = [];

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
      const icerik = metinBlogu?.text ? icerikTemizle(metinBlogu.text) : "";
      if (!icerik) throw new Error("boş içerik döndü");

      const { error: yazmaHatasi } = await admin
        .from("konu_anlatimlari")
        .upsert({ ders, konu, icerik, seviye }, { onConflict: "ders,konu" });
      if (yazmaHatasi) throw new Error(yazmaHatasi.message);

      const sebepler = supheliMi(icerik, konu);
      if (sebepler.length > 0) {
        supheliListe.push({ ders, konu, sebepler });
        console.log(`✓ (⚠ gözden geçir: ${sebepler.join("; ")})`);
      } else {
        console.log("✓");
      }
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

  if (supheliListe.length > 0) {
    console.log(`\n⚠ Otomatik kontrolden geçemeyen ${supheliListe.length} konu (elle gözden geçirin):`);
    for (const s of supheliListe) console.log(`  - ${s.ders} — ${s.konu}: ${s.sebepler.join("; ")}`);
    console.log("\nBir konuyu yeniden ürettirmek için: Supabase'de o satırı silin, script'i tekrar çalıştırın.");
  } else if (basarili > 0) {
    console.log("\nOtomatik kontrolden geçemeyen konu yok. Yine de birkaçını elle göz gezdirmenizi öneririm —");
    console.log("bkz. scripts/export-konu-anlatimlari.mjs (tüm içeriği tek dosyada okunabilir hâle getirir).");
  }
}

main().catch((e) => {
  console.error("Script hata ile durdu:", e);
  process.exit(1);
});
