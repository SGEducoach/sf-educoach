import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: schools, error: schoolError } = await admin.from("schools").select("id,ad,tur").order("ad");
if (schoolError) throw schoolError;
for (const school of schools ?? []) {
  const [{ data: teachers, error: teacherError }, { data: classes, error: classError }] = await Promise.all([
    admin.from("teachers").select("id,brans,profiles!teachers_id_fkey(ad,email,role)").eq("school_id", school.id),
    admin.from("classes").select("id,seviye,sube").eq("school_id", school.id),
  ]);
  if (teacherError) throw teacherError;
  if (classError) throw classError;
  const teacherIds = (teachers ?? []).map((teacher) => teacher.id);
  const { data: programs, error: programError } = teacherIds.length
    ? await admin.from("ogretmen_ders_programi").select("teacher_id,gun,ders_saati_sira,class_id,ders").in("teacher_id", teacherIds)
    : { data: [], error: null };
  if (programError) throw programError;
  console.log(JSON.stringify({ school, teachers, classes, programCount: programs?.length ?? 0, programs }, null, 2));
}
