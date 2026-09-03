// npm install --prefix tmp/sql-tests --no-save @electric-sql/pglite
// node scripts/test-resmi-ogrenci.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
process.on('uncaughtException', error => {
  console.error(error.message, error.detail ?? '', error.where ?? '');
  process.exit(1);
});
const require = createRequire(new URL('../tmp/sql-tests/package.json', import.meta.url));
const {PGlite} = require('@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
  create schema auth;
  create role anon; create role authenticated; create role service_role;
  create function auth.role() returns text language sql as $$select coalesce(current_setting('test.role',true),'anon')$$;
  create function public.is_admin() returns boolean language sql as $$select false$$;
  create table public.schools(id uuid primary key);
  create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
  create table public.profiles(id uuid primary key, ad text, role text);
  create table public.students(id uuid primary key, school_id uuid, okul_no text, yurt_ogrencisi boolean default false,
    unique(school_id,okul_no));
  create table public.izinli_ogrenciler(id uuid primary key default gen_random_uuid(), school_id uuid, ad_soyad text,
    unique(school_id,ad_soyad));
`);
const setup = readFileSync('dokumanlar/fen_lisesi_kayit_duzeltmesi.sql','utf8');
const {school} = JSON.parse(readFileSync('dokumanlar/fen_lisesi_kontrol.json','utf8'));
await db.query('insert into schools values ($1)',[school.id]);
await db.exec(setup);
await db.exec(setup);
const counts = (await db.query('select count(*)::int as total, count(*) filter(where yurt_ogrencisi)::int as boarding from resmi_ogrenci_listesi')).rows[0];
assert.deepEqual(counts,{total:500,boarding:88});
const official = (await db.query('select * from resmi_ogrenci_listesi where yurt_ogrencisi limit 1')).rows[0];
async function register(ad, schoolId, extra = {}, okulNo = '99999') {
  const id = crypto.randomUUID();
  await db.query('insert into auth.users values ($1,$2)',[id,JSON.stringify({ad,...extra})]);
  await db.query("insert into profiles values ($1,$2,'ogrenci')",[id,ad]);
  await db.query("insert into students(id,school_id,okul_no) values ($1,$2,$3)",[id,schoolId,okulNo]);
  return (await db.query('select s.*, p.ad from students s join profiles p using(id) where id=$1',[id])).rows[0];
}
const student = await register(official.ad_soyad,official.school_id);
assert.equal(student.okul_no,official.okul_no);
assert.equal(student.yurt_ogrencisi,true);
assert.equal(student.ad,official.ad_soyad);
await assert.rejects(register(official.ad_soyad,official.school_id),/unique/);
await assert.rejects(register('Listede Olmayan',official.school_id,{admin_ekledi:true}),/eşleşme bulunamadı/);
const day = (await db.query('select * from resmi_ogrenci_listesi where not yurt_ogrencisi limit 1')).rows[0];
assert.equal((await register(day.ad_soyad,day.school_id)).yurt_ogrencisi,false);
const school2 = crypto.randomUUID();
await db.query('insert into schools values ($1)',[school2]);
await db.query(`insert into resmi_ogrenci_listesi(school_id,ad_soyad,okul_no,yurt_ogrencisi)
  values ($1,'Ahmet Ali Yılmaz','1',true),($1,'Ahmet Veli Yılmaz','2',false)`,[school2]);
await assert.rejects(register('Ahmet Yılmaz',school2),/Birden fazla/);
assert.equal((await register('Ahmet Ali Yılmaz',school2)).okul_no,'1');
assert.equal((await register('Veli Yılmaz',school2)).okul_no,'2');
await assert.rejects(register('Ahmet Enes Yıldız',official.school_id),/Birden fazla/);
assert.equal((await register('Ahmet Enes Yıldız',official.school_id,{},'108')).okul_no,'108');
assert.equal((await register('Ahmet Enes Yıldız',official.school_id,{},'180')).okul_no,'180');
await db.exec(setup);
assert.equal((await db.query('select okul_no,yurt_ogrencisi from students where id=$1',[student.id])).rows[0].yurt_ogrencisi,true);
assert.equal((await register('Listesiz Öğrenci',crypto.randomUUID())).okul_no,'99999');
await db.exec("set test.role='service_role'");
assert.equal((await register('Manuel Öğrenci',official.school_id)).okul_no,'99999');
const privileges = (await db.query("select has_function_privilege('anon','public.izinli_ogrenci_resmi_kaydi(uuid,text,text)','execute') as anon, has_function_privilege('authenticated','public.izinli_ogrenci_resmi_kaydi(uuid,text,text)','execute') as authenticated")).rows[0];
assert.deepEqual(privileges,{anon:false,authenticated:false});
await db.close();
console.log('PASS: SQL migrations, 500/88 roster totals, repeat application, official number, boarding/day status, duplicate account, ambiguous/partial names, metadata bypass rejection, legacy/manual registration and private lookup.');
