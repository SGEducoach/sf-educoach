import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const schoolId = "9e0f8acd-74dd-4bde-ab72-e53d7b01dc4b"; // Elbistan Bist Fen Lisesi

const { data: ogrenciler, error } = await admin
  .from("students")
  .select("id, okul_no, class_id, created_at, profiles!students_id_fkey(ad), classes(seviye, sube)")
  .eq("school_id", schoolId)
  .order("created_at", { ascending: false });

if (error) { console.error(error); process.exit(1); }

const satirlar = ogrenciler.map((o) => ({
  id: o.id,
  ad: o.profiles?.ad ?? "(isimsiz)",
  okulNo: o.okul_no,
  sinif: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : "(sınıf yok)",
  createdAt: o.created_at,
}));

writeFileSync("tmp/yeni_kayit_teshis_sonuc.json", JSON.stringify(satirlar, null, 2));
console.log("Toplam öğrenci:", satirlar.length);
console.log("En son 20 kayıt:");
for (const s of satirlar.slice(0, 20)) {
  console.log(`${s.createdAt} | ${s.okulNo} | ${s.sinif} | ${s.ad}`);
}
