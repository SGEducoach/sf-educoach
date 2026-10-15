import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { GoogleAuth } from 'google-auth-library';

const envText = await fs.readFile(new URL('../../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(envText.split(/\r?\n/).filter(line => /^[A-Z][A-Z0-9_]*=/.test(line)).map(line => {
  const i = line.indexOf('=');
  return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const since = new Date(Date.now() - 28 * 86400000).toISOString();
const sinceDate = since.slice(0, 10);
const specs = [
  ['students', 'id,school_id,created_at', null],
  ['konu_calismalar', 'id,student_id,ders,konu,sure_dakika,created_at', 'created_at'],
  ['soru_cozumleri', 'id,student_id,ders,konu,dogru,yanlis,created_at', 'created_at'],
  ['denemeler', 'id,student_id,tur,kaynak,created_at', 'created_at'],
  ['deneme_kazanim_sonuclari', 'id,deneme_id,created_at', 'created_at'],
  ['gorevler', 'id,tur,ders,tarih,son_tarih,created_at', 'created_at'],
  ['gorev_atamalari', 'id,gorev_id,student_id,durum,created_at', 'created_at'],
  ['ortaokul_calismalar', 'id,student_id,bolum,tur,created_at', 'created_at'],
  ['ortaokul_konu_yeterlilikleri', 'id,student_id,created_at', 'created_at'],
  ['yazili_sinavlar', 'id,created_at', 'created_at'],
  ['yazili_ogrenci_sonuclari', 'id,ogrenci_id,created_at', 'created_at'],
  ['deneme_karne_ozetleri', 'deneme_id,created_at', 'created_at'],
];
async function fetchAll(name, cols, timeCol) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    let query = db.from(name).select(cols).range(start, start + 999);
    if (timeCol) query = query.gte(timeCol, since).order(timeCol, { ascending: true });
    const { data, error } = await query;
    if (error) return { error: error.message };
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return { rows };
  }
}
const dbResult = Object.fromEntries(await Promise.all(specs.map(async ([name, cols, col]) => [name, await fetchAll(name, cols, col)])));
let ga;
try {
  const auth = new GoogleAuth({ credentials: { client_email: env.GA4_CLIENT_EMAIL, private_key: env.GA4_PRIVATE_KEY.replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
  const token = await auth.getAccessToken();
  async function report(metrics, dimension, limit = 100) {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${env.GA4_PROPERTY_ID}:runReport`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }], metrics: metrics.map(name => ({ name })),
        ...(dimension ? { dimensions: [{ name: dimension }], orderBys: [{ metric: { metricName: metrics[0] }, desc: true }], limit } : {}) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`GA HTTP ${response.status}`);
    return response.json();
  }
  ga = { totals: await report(['activeUsers', 'sessions', 'screenPageViews', 'engagementRate']),
    pages: await report(['screenPageViews', 'activeUsers'], 'pagePath', 100) };
} catch (error) { ga = { error: String(error.message ?? error) }; }
const out = { generatedAt: new Date().toISOString(), since, sinceDate, db: dbResult, ga };
await fs.writeFile(new URL('./usage-data.json', import.meta.url), JSON.stringify(out));
console.log(JSON.stringify({ since, database: Object.fromEntries(Object.entries(dbResult).map(([k,v]) => [k,v.rows?.length ?? v.error])),
  ga: ga.error ?? { totalRows: ga.totals.rows?.length ?? 0, pageRows: ga.pages.rows?.length ?? 0 } }));
