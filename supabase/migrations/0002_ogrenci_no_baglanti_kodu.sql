-- SG EduCoach — öğrenci no + bağlantı kodu ekleme (mevcut veriyi bozmadan)
-- Bunu Supabase SQL Editor'de çalıştırın.

create sequence if not exists public.ogrenci_no_seq;

alter table public.students
  add column if not exists ogrenci_no text,
  add column if not exists baglanti_kodu text;

update public.students
set ogrenci_no = coalesce(ogrenci_no, 'SG' || lpad(nextval('public.ogrenci_no_seq')::text, 5, '0')),
    baglanti_kodu = coalesce(baglanti_kodu, upper(substr(md5(random()::text), 1, 6)))
where ogrenci_no is null or baglanti_kodu is null;

alter table public.students
  alter column ogrenci_no set not null,
  alter column baglanti_kodu set not null;

alter table public.students drop constraint if exists students_ogrenci_no_key;
alter table public.students add constraint students_ogrenci_no_key unique (ogrenci_no);

-- Yeni kullanıcı trigger'ını güncelle: öğrenciye otomatik no+kod ata,
-- veli kayıt sırasında no+kod girdiyse otomatik bağla.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := coalesce(new.raw_user_meta_data->>'role', 'ogrenci')::public.user_role;
  v_student_id uuid;
begin
  insert into public.profiles (id, ad, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'ad', new.email), new.email, v_role);

  if v_role = 'ogrenci' then
    insert into public.students (id, hedef_puan, hedef_bolum, sinif, yks_yili, ogrenci_no, baglanti_kodu)
    values (
      new.id,
      coalesce((new.raw_user_meta_data->>'hedef_puan')::integer, 0),
      coalesce(new.raw_user_meta_data->>'hedef_bolum', ''),
      new.raw_user_meta_data->>'sinif',
      (new.raw_user_meta_data->>'yks_yili')::integer,
      'SG' || lpad(nextval('public.ogrenci_no_seq')::text, 5, '0'),
      upper(substr(md5(random()::text || new.id::text), 1, 6))
    );
  elsif v_role = 'veli'
    and new.raw_user_meta_data->>'ogrenci_no' is not null
    and new.raw_user_meta_data->>'baglanti_kodu' is not null then
    select s.id into v_student_id
    from public.students s
    where s.ogrenci_no = new.raw_user_meta_data->>'ogrenci_no'
      and s.baglanti_kodu = new.raw_user_meta_data->>'baglanti_kodu';

    if v_student_id is not null then
      insert into public.parent_students (parent_id, student_id)
      values (new.id, v_student_id)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- Öğrenci no + kod ile öğrenci bulma (koç/veli "Öğrenci bağla" ekranı için)
create or replace function public.find_student_by_code(p_ogrenci_no text, p_kod text)
returns table (id uuid, ad text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.ad
  from public.students s
  join public.profiles p on p.id = s.id
  where s.ogrenci_no = p_ogrenci_no and s.baglanti_kodu = p_kod;
$$;

revoke all on function public.find_student_by_code(text, text) from public;
grant execute on function public.find_student_by_code(text, text) to authenticated;

-- Eski e-posta bazlı bulma fonksiyonu artık kullanılmıyor, kaldırılabilir.
drop function if exists public.find_student_by_email(text);
