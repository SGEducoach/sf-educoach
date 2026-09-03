// Read-only comparison. Source and report contain student data: keep in dokumanlar/.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const roster = JSON.parse(readFileSync('dokumanlar/fen_lisesi_kaynak.json', 'utf8'));
const key = s => s.normalize('NFC').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/\u0307/g, '').trim().replace(/\s+/g, ' ');
const title = s => s.normalize('NFC').toLocaleLowerCase('tr-TR').replace(/([iı])\u0307/g, '$1')
  .trim().replace(/\s+/g, ' ').replace(/(^|[\s'-])([a-zçğıöşü])/g, (_, p, c) => p + c.toLocaleUpperCase('tr-TR'));
const { data: schools, error: schoolError } = await db.from('schools').select('id,ad');
if (schoolError) throw new Error(schoolError.message);
const candidates = schools.filter(s => /elbistan/i.test(key(s.ad)) && /fen/i.test(key(s.ad)));
if (candidates.length !== 1) throw new Error('School match is not unique');
const school = candidates[0];
const { data: students, error } = await db.from('students')
  .select('id,okul_no,yurt_ogrencisi,profiles!students_id_fkey(ad)').eq('school_id', school.id).range(0, 9999);
if (error) throw new Error(error.message);
const matches = students.map(s => {
  const nameKey = key(s.profiles?.ad ?? '');
  let official = roster.filter(r => key(r.ad) === nameKey);
  if (official.length !== 1) {
    const tokens = nameKey.split(' ');
    // A missing given name is accepted only with the same official number,
    // exact surname and every entered given name present. Never fuzzy match.
    official = roster.filter(r => {
      const full = key(r.ad).split(' ');
      return r.okulNo === s.okul_no && tokens.length >= 2 && tokens.at(-1) === full.at(-1)
        && tokens.slice(0,-1).every(t=>full.slice(0,-1).includes(t));
    });
  }
  return { id: s.id, ad: s.profiles?.ad, mevcutNo: s.okul_no, mevcutYurt: s.yurt_ogrencisi,
    resmi: official.length === 1 ? official[0] : null, eslesmeSayisi: official.length };
});
const report = { school, rosterCount: roster.length, students: matches };
writeFileSync('dokumanlar/fen_lisesi_kontrol.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({kaynak: roster.length, kaynakYatili: roster.filter(r=>r.yurtOgrencisi).length,
  mevcut: students.length, eslesen: matches.filter(r=>r.resmi).length,
  belirsiz: matches.filter(r=>!r.resmi).length,
  numaraFarki: matches.filter(r=>r.resmi && r.mevcutNo !== r.resmi.okulNo).length,
  yurtFarki: matches.filter(r=>r.resmi && r.mevcutYurt !== r.resmi.yurtOgrencisi).length}));

if (process.argv.includes('--apply')) {
  const matched = matches.filter(s => s.resmi);
  // Validate the entire batch before any write. No fuzzy matching, no number swaps.
  if (new Set(matched.map(s=>s.resmi.okulNo)).size !== matched.length) throw new Error('Multiple accounts match one official student');
  for (const s of matched) {
    if (students.some(other => other.id !== s.id && other.okul_no === s.resmi.okulNo)) {
      throw new Error('An official number is occupied by a different account; manual review required');
    }
  }
  const backupPath = `dokumanlar/fen_lisesi_yedek_${Date.now()}.json`;
  writeFileSync(backupPath, JSON.stringify(report, null, 2), {flag:'wx'});
  let numbers = 0, boarding = 0, names = 0;
  for (const s of matched) {
    if (s.mevcutNo !== s.resmi.okulNo || s.mevcutYurt !== s.resmi.yurtOgrencisi) {
      const {data, error} = await db.from('students')
        .update({okul_no:s.resmi.okulNo, yurt_ogrencisi:s.resmi.yurtOgrencisi})
        .eq('id',s.id).eq('school_id',school.id).eq('okul_no',s.mevcutNo).eq('yurt_ogrencisi',s.mevcutYurt).select('id');
      if (error || data.length !== 1) throw new Error(error?.message ?? 'Student changed during sync; stopped');
      numbers += Number(s.mevcutNo !== s.resmi.okulNo);
      boarding += Number(s.mevcutYurt !== s.resmi.yurtOgrencisi);
    }
    const officialName = title(s.resmi.ad);
    if (s.ad !== officialName) {
      const {data, error} = await db.from('profiles').update({ad:officialName}).eq('id',s.id).eq('ad',s.ad).select('id,ad');
      if (error || data.length !== 1 || data[0].ad !== officialName) throw new Error(error?.message ?? 'Name update did not persist as expected');
      names++;
    }
  }
  console.log(JSON.stringify({duzeltilenNumara:numbers, duzeltilenYurt:boarding, duzeltilenAd:names}));
}
