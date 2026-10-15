import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const envText = await fs.readFile(new URL('../../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line)).map((line) => {
  const i = line.indexOf('=');
  return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function all(table, columns, configure = (q) => q) {
  const result = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await configure(db.from(table).select(columns)).range(start, start + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    result.push(...(data ?? []));
    if ((data ?? []).length < 1000) return result;
  }
}

const [schools, globalSubtopics, schoolSubtopics, versions] = await Promise.all([
  all('schools', 'id,ad,tur,kademe,grup_kapasitesi'),
  all('mufredat_alt_konular', 'id,ders,ust_konu,alt_baslik,sira'),
  all('kurum_mufredat_alt_konulari', 'id,school_id,ders,ust_konu,alt_baslik'),
  all('ortaokul_mufredat_surumleri', 'id,ad,durum'),
]);
const active = versions.find((v) => v.durum === 'aktif');
const middleCourses = active
  ? await all('ortaokul_mufredat_dersleri', 'id,sinif_seviyesi,ders_kodu,ad,sira', (q) => q.eq('surum_id', active.id))
  : [];
const courseIds = new Set(middleCourses.map((c) => c.id));
const allThemes = await all('ortaokul_mufredat_temalari', 'id,ders_id,kod,ad,tur,alt_basliklar,sira');
const middleThemes = allThemes.filter((t) => courseIds.has(t.ders_id));
const themeIds = new Set(middleThemes.map((t) => t.id));
const allOutcomes = await all('ortaokul_mufredat_kazanimlari', 'id,tema_id,kod,metin,sira,aktif');
const middleOutcomes = allOutcomes.filter((o) => themeIds.has(o.tema_id) && o.aktif);
const highTopics = JSON.parse(await fs.readFile(new URL('../../src/lib/mufredat-konulari.json', import.meta.url), 'utf8'));
const payload = { retrievedAt: new Date().toISOString(), schools, highTopics, globalSubtopics, schoolSubtopics,
  activeMiddleVersion: active ? { ad: active.ad, id: active.id } : null,
  middleCourses, middleThemes, middleOutcomes };
await fs.writeFile(new URL('./source-data.json', import.meta.url), JSON.stringify(payload));
console.log(JSON.stringify({ schools: schools.length, highTopics: highTopics.length, globalSubtopics: globalSubtopics.length,
  schoolSubtopics: schoolSubtopics.length, middleCourses: middleCourses.length, middleThemes: middleThemes.length,
  middleOutcomes: middleOutcomes.length, activeMiddleVersion: active?.ad ?? null }));
