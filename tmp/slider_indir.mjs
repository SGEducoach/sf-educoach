import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await admin.from("ana_sayfa_slider_gorselleri").select("*").order("sira");
if (error) { console.error(error); process.exit(1); }
console.log(JSON.stringify(data, null, 2));

for (const row of data) {
  const { data: fileData, error: dlErr } = await admin.storage.from("ana-sayfa").download(row.dosya_yolu);
  if (dlErr) { console.error("indirilemedi:", row.dosya_yolu, dlErr); continue; }
  const buffer = Buffer.from(await fileData.arrayBuffer());
  const outPath = `tmp/pdfs/afis/slider_${row.sira}_${row.dosya_yolu}`;
  writeFileSync(outPath, buffer);
  console.log("indirildi:", outPath, buffer.length, "bytes");
}
