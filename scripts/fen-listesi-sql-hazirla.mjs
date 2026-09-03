// Private school data is written only under the git-ignored dokumanlar/ folder.
import { readFileSync, writeFileSync } from 'node:fs';
const roster = JSON.parse(readFileSync('dokumanlar/fen_lisesi_kaynak.json', 'utf8'));
const {school} = JSON.parse(readFileSync('dokumanlar/fen_lisesi_kontrol.json', 'utf8'));
if (!/^[0-9a-f-]{36}$/i.test(school.id)) throw new Error('Invalid school ID');
const quote = s => "'" + s.replaceAll("'", "''") + "'";
const sql = ['-- fen_lisesi.XLS kaynaklı 500 öğrenci: kişisel veri içerir, kod deposuna eklemeyin.',
  '-- Supabase SQL Editor: tüm dosyayı tek seferde çalıştırın.', 'begin;',
  readFileSync('supabase/migrations/0088_turkce_ogrenci_adlari.sql', 'utf8'),
  readFileSync('supabase/migrations/0089_izinli_ogrenci_resmi_bilgiler.sql', 'utf8'),
  `insert into public.resmi_ogrenci_listesi (school_id, ad_soyad, okul_no, yurt_ogrencisi) values\n` +
  roster.map(r => `(${quote(school.id)}::uuid, public.ad_baslik(${quote(r.ad)}), ${quote(r.okulNo)}, ${r.yurtOgrencisi})`).join(',\n') +
  '\non conflict (school_id, okul_no) do update set ad_soyad = excluded.ad_soyad, yurt_ogrencisi = excluded.yurt_ogrencisi;',
  `insert into public.izinli_ogrenciler(school_id, ad_soyad)
    select distinct school_id, ad_soyad from public.resmi_ogrenci_listesi
    where school_id = ${quote(school.id)}::uuid
    on conflict (school_id, ad_soyad) do nothing;`,
  // 0088 may restore old metadata spelling. After loading the source, prefer
  // its official full name only when both sides match uniquely by full name.
  `with adaylar as (
    select p.id, io.ad_soyad, count(*) over (partition by p.id) as adet
    from public.profiles p join public.students s on s.id = p.id
    join public.resmi_ogrenci_listesi io on io.school_id = s.school_id
      and io.okul_no is not null
      and public.ad_esleme_anahtari(io.ad_soyad) = public.ad_esleme_anahtari(p.ad)
    where s.school_id = ${quote(school.id)}::uuid
  ) update public.profiles p set ad = public.ad_baslik(a.ad_soyad)
    from adaylar a where p.id = a.id and a.adet = 1
      and p.ad is distinct from public.ad_baslik(a.ad_soyad);`,
  'commit;'];
writeFileSync('dokumanlar/fen_lisesi_kayit_duzeltmesi.sql', sql.join('\n\n') + '\n');
console.log(`Prepared ${roster.length} official records, including ${roster.filter(r=>r.yurtOgrencisi).length} boarders.`);
