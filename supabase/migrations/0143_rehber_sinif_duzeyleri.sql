-- Lise okul rehberinin sorumlu olduğu düzeyler. Yeni rehberler atama
-- yapılana kadar öğrenci göremez; mevcut rehberlerin bugünkü kapsamı korunur.
-- Dershane ve ortaokul rehberlerinin mevcut yapısı değişmez.
alter table public.teachers
  add column if not exists rehber_sinif_duzeyleri text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'teachers_rehber_sinif_duzeyleri_check'
    and conrelid = 'public.teachers'::regclass) then
    alter table public.teachers
      add constraint teachers_rehber_sinif_duzeyleri_check
      check (rehber_sinif_duzeyleri <@ array['9','10','11','12']::text[]);
  end if;
end $$;

update public.teachers t
set rehber_sinif_duzeyleri = coalesce((
  select array_agg(distinct c.seviye order by c.seviye)
  from public.classes c
  where c.school_id = t.school_id
    and c.seviye = any(array['9','10','11','12']::text[])
), '{}'::text[])
from public.schools sch
where t.brans = 'Rehber Öğretmen' and sch.id = t.school_id
  and sch.tur = 'okul' and sch.kademe::text in ('lise', 'ikisi');

-- API üzerinden yapılan doğrudan okumalar da rehberin atandığı düzeyle
-- sınırlı olmalı. Diğer rollerin mevcut RLS davranışı korunur.
create or replace function public.rehber_ogrenciyi_gorebilir(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.teachers t join public.schools sch on sch.id = t.school_id
    where t.id = auth.uid() and t.brans = 'Rehber Öğretmen'
      and sch.tur = 'okul' and sch.kademe::text in ('lise', 'ikisi')
  ) or exists (
    select 1 from public.teachers t
    join public.students s on s.school_id = t.school_id and s.id = p_student_id
    join public.classes c on c.id = s.class_id and c.school_id = t.school_id
    where t.id = auth.uid() and t.brans = 'Rehber Öğretmen'
      and c.seviye = any(t.rehber_sinif_duzeyleri)
  );
$$;

create or replace function public.rehber_profili_gorebilir(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.teachers t join public.schools sch on sch.id = t.school_id
    where t.id = auth.uid() and t.brans = 'Rehber Öğretmen'
      and sch.tur = 'okul' and sch.kademe::text in ('lise', 'ikisi')
  ) or (
    not exists (select 1 from public.students s where s.id = p_profile_id)
    and not exists (select 1 from public.parent_students ps where ps.parent_id = p_profile_id)
  ) or public.rehber_ogrenciyi_gorebilir(p_profile_id) or exists (
    select 1 from public.parent_students ps
    where ps.parent_id = p_profile_id and public.rehber_ogrenciyi_gorebilir(ps.student_id)
  );
$$;

create or replace function public.rehber_denemesini_gorebilir(p_deneme_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.teachers t join public.schools sch on sch.id = t.school_id
    where t.id = auth.uid() and t.brans = 'Rehber Öğretmen'
      and sch.tur = 'okul' and sch.kademe::text in ('lise', 'ikisi')
  ) or exists (
    select 1 from public.denemeler d
    where d.id = p_deneme_id and public.rehber_ogrenciyi_gorebilir(d.student_id)
  );
$$;

revoke all on function public.rehber_ogrenciyi_gorebilir(uuid) from public;
revoke all on function public.rehber_profili_gorebilir(uuid) from public;
revoke all on function public.rehber_denemesini_gorebilir(uuid) from public;
grant execute on function public.rehber_ogrenciyi_gorebilir(uuid) to authenticated, service_role;
grant execute on function public.rehber_profili_gorebilir(uuid) to authenticated, service_role;
grant execute on function public.rehber_denemesini_gorebilir(uuid) to authenticated, service_role;

-- Öğretmen kendi satırını güncelleyebilse de kendine düzey atayamaz.
create or replace function public.rehber_sinif_atamasini_koru()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (new.rehber_sinif_duzeyleri is distinct from old.rehber_sinif_duzeyleri
      or (old.brans = 'Rehber Öğretmen'
          and exists (select 1 from public.schools sch where sch.id = old.school_id
                      and sch.tur = 'okul' and sch.kademe::text in ('lise', 'ikisi'))
          and (new.brans is distinct from old.brans or new.school_id is distinct from old.school_id)))
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin()
     and not exists (select 1 from public.school_moderators m
                     where m.profile_id = auth.uid() and m.school_id = old.school_id) then
    raise exception 'Rehber sınıf ataması sadece yönetici veya kurum moderatörü tarafından değiştirilebilir.';
  end if;
  return new;
end;
$$;
drop trigger if exists rehber_sinif_atamasini_koru on public.teachers;
create trigger rehber_sinif_atamasini_koru before update on public.teachers
for each row execute function public.rehber_sinif_atamasini_koru();

drop policy if exists "students_rehber_duzey_siniri" on public.students;
create policy "students_rehber_duzey_siniri" on public.students
  as restrictive for all to authenticated
  using (public.rehber_ogrenciyi_gorebilir(id))
  with check (public.rehber_ogrenciyi_gorebilir(id));
drop policy if exists "profiles_rehber_duzey_siniri" on public.profiles;
create policy "profiles_rehber_duzey_siniri" on public.profiles
  as restrictive for select to authenticated
  using (public.rehber_profili_gorebilir(id));

-- Öğrenciye doğrudan bağlı RLS'li tablolarda tek tek politika unutulmaması
-- için şema kolonlarından kurulur. Yeni tablo eklenirse ayrıca denetlenmeli.
do $do$
declare v_table text;
begin
  for v_table in
    select c.table_name
    from information_schema.columns c
    join pg_class pc on pc.relname = c.table_name
    join pg_namespace pn on pn.oid = pc.relnamespace and pn.nspname = 'public'
    where c.table_schema = 'public' and c.column_name in ('student_id', 'ogrenci_id')
      and c.table_name <> 'students' and pc.relrowsecurity
    group by c.table_name
    having count(*) = 1
  loop
    execute format('drop policy if exists %I on public.%I', 'rehber_duzey_siniri', v_table);
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = v_table and column_name = 'student_id') then
      execute format('create policy %I on public.%I as restrictive for all to authenticated using (public.rehber_ogrenciyi_gorebilir(student_id)) with check (public.rehber_ogrenciyi_gorebilir(student_id))',
        'rehber_duzey_siniri', v_table);
    else
      execute format('create policy %I on public.%I as restrictive for all to authenticated using (public.rehber_ogrenciyi_gorebilir(ogrenci_id)) with check (public.rehber_ogrenciyi_gorebilir(ogrenci_id))',
        'rehber_duzey_siniri', v_table);
    end if;
  end loop;
end $do$;

create or replace function public.ogrenci_giris_sayisi(p_student_id uuid)
returns integer language sql stable security definer set search_path = public
as $$
  select case when public.rehber_ogrenciyi_gorebilir(p_student_id) then
    (select count(*) from public.konu_calismalar where student_id = p_student_id and giren_rehber_id is null)
    + (select count(*) from public.soru_cozumleri where student_id = p_student_id and giren_rehber_id is null)
    + (select count(*) from public.denemeler where student_id = p_student_id and kaynak = 'ogrenci' and giren_rehber_id is null)::integer
  else null end;
$$;

create or replace function public.ogrenci_aktif_gun_sayisi_pencere(p_student_id uuid, p_gun_sayisi int)
returns int language sql stable security definer set search_path = public
as $$
  select case when public.rehber_ogrenciyi_gorebilir(p_student_id) then (
    select count(distinct tarih)::int from (
      select tarih from public.konu_calismalar where student_id = p_student_id and tarih >= current_date - p_gun_sayisi
      union
      select tarih from public.soru_cozumleri where student_id = p_student_id and tarih >= current_date - p_gun_sayisi
      union
      select tarih from public.denemeler where student_id = p_student_id and tarih >= current_date - p_gun_sayisi
    ) t
  ) else null end;
$$;

do $do$
declare v_table text;
begin
  for v_table in
    select c.table_name
    from information_schema.columns c
    join pg_class pc on pc.relname = c.table_name
    join pg_namespace pn on pn.oid = pc.relnamespace and pn.nspname = 'public'
    where c.table_schema = 'public' and c.column_name = 'deneme_id' and pc.relrowsecurity
  loop
    execute format('drop policy if exists %I on public.%I', 'rehber_deneme_duzey_siniri', v_table);
    execute format('create policy %I on public.%I as restrictive for all to authenticated using (public.rehber_denemesini_gorebilir(deneme_id)) with check (public.rehber_denemesini_gorebilir(deneme_id))',
      'rehber_deneme_duzey_siniri', v_table);
  end loop;
end $do$;


-- SECURITY DEFINER rozet raporlarında da düzey sınırı.
-- Hesaplamalar 0108 ve 0062 ile aynı; yalnızca giriş yetkisi daraltılır.
create or replace function public.ogrenci_konu_seviyesi(p_student_id uuid)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_yurt boolean;
  v_sifirlama date;
  v_sonuc text;
begin
  if not public.rehber_ogrenciyi_gorebilir(p_student_id) then
    raise exception 'Bu öğrenci sorumluluğunuzda değil.';
  end if;
  select yurt_ogrencisi, rozet_sifirlama_tarihi into v_yurt, v_sifirlama from public.students where id = p_student_id;

  if v_yurt then
    select case
      when count(*) >= 8 then 'altin'
      when count(*) >= 6 then 'gumus'
      when count(*) >= 4 then 'bronz'
      else 'yok'
    end into v_sonuc
    from (
      select distinct tarih from public.konu_calismalar
      where student_id = p_student_id
        and tarih between greatest(current_date - 30, coalesce(v_sifirlama, '-infinity'::date)) and current_date
        and extract(dow from tarih) in (0, 6)
    ) g;
    return v_sonuc;
  end if;

  return (
    with gunler as (
      select distinct tarih from public.konu_calismalar
      where student_id = p_student_id
        and tarih between greatest(current_date - 30, coalesce(v_sifirlama, '-infinity'::date)) and current_date
    ),
    sirali as (
      select tarih, lag(tarih) over (order by tarih) as onceki from gunler
    ),
    gruplu as (
      select tarih,
        sum(case when onceki is null or tarih - onceki > 3 then 1 else 0 end) over (order by tarih) as grup
      from sirali
    ),
    son_grup as (
      select count(*) as gun_sayisi, max(tarih) as son_tarih
      from gruplu
      where grup = (select max(grup) from gruplu)
    )
    select case
      when not exists (select 1 from son_grup) then 'yok'
      when current_date - (select son_tarih from son_grup) > 3 then 'yok'
      when (select gun_sayisi from son_grup) >= 30 then 'altin'
      when (select gun_sayisi from son_grup) >= 20 then 'gumus'
      when (select gun_sayisi from son_grup) >= 15 then 'bronz'
      else 'yok'
    end
  );
end;
$$;

create or replace function public.ogrenci_soru_seviyesi(p_student_id uuid)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_yurt boolean;
  v_sifirlama date;
  v_gecmis_gun int;
  v_alt_sinir date;
  v_sonuc text;
begin
  if not public.rehber_ogrenciyi_gorebilir(p_student_id) then
    raise exception 'Bu öğrenci sorumluluğunuzda değil.';
  end if;
  select yurt_ogrencisi, rozet_sifirlama_tarihi into v_yurt, v_sifirlama from public.students where id = p_student_id;
  v_gecmis_gun := case when v_yurt then 7 else 3 end;
  v_alt_sinir := greatest(current_date - v_gecmis_gun, coalesce(v_sifirlama, '-infinity'::date));

  with tum_dersler as (
    select unnest(array['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji']) as ders
  ),
  toplamlar as (
    select ders, sum(dogru + yanlis) as toplam
    from public.soru_cozumleri
    where student_id = p_student_id and tarih between v_alt_sinir and current_date
    group by ders
  ),
  birlesik as (
    select td.ders, coalesce(t.toplam, 0) as toplam
    from tum_dersler td left join toplamlar t on t.ders = td.ders
  )
  select case
    when (select min(toplam) from birlesik) >= 50 then 'altin'
    when (select min(toplam) from birlesik) >= 30 then 'gumus'
    when (select min(toplam) from birlesik) >= 20 then 'bronz'
    else 'yok'
  end into v_sonuc;

  return v_sonuc;
end;
$$;

create or replace function public.ogrenci_deneme_seviyesi(p_student_id uuid)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_seviye text;
  v_sifirlama date;
  v_sayi int;
begin
  if not public.rehber_ogrenciyi_gorebilir(p_student_id) then
    raise exception 'Bu öğrenci sorumluluğunuzda değil.';
  end if;
  select c.seviye, s.rozet_sifirlama_tarihi into v_seviye, v_sifirlama
  from public.students s
  left join public.classes c on c.id = s.class_id
  where s.id = p_student_id;

  select count(*) into v_sayi
  from public.denemeler
  where student_id = p_student_id
    and tarih between greatest(current_date - 30, coalesce(v_sifirlama, '-infinity'::date)) and current_date;

  if v_seviye in ('9', '10') then
    return case
      when v_sayi >= 3 then 'altin'
      when v_sayi >= 2 then 'gumus'
      when v_sayi >= 1 then 'bronz'
      else 'yok'
    end;
  end if;

  return case
    when v_sayi >= 8 then 'altin'
    when v_sayi >= 4 then 'gumus'
    when v_sayi >= 3 then 'bronz'
    else 'yok'
  end;
end;
$$;

create or replace function public.ogrenci_rozet_durumu(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_konu text; v_soru text; v_deneme text; v_altin_sayisi int; v_genel text;
begin
  if not public.rehber_ogrenciyi_gorebilir(p_student_id) then
    raise exception 'Bu öğrenci sorumluluğunuzda değil.';
  end if;
  if not (
    public.has_student_access(p_student_id)
    or public.is_ogretmen()
    or public.is_admin()
    or exists (
      select 1 from public.students s
      where s.id = p_student_id and public.is_school_moderator(s.school_id)
    )
  ) then
    raise exception 'Yetkisiz.';
  end if;

  v_konu := public.ogrenci_konu_seviyesi(p_student_id);
  v_soru := public.ogrenci_soru_seviyesi(p_student_id);
  v_deneme := public.ogrenci_deneme_seviyesi(p_student_id);

  v_altin_sayisi := (case when v_konu = 'altin' then 1 else 0 end)
                  + (case when v_soru = 'altin' then 1 else 0 end)
                  + (case when v_deneme = 'altin' then 1 else 0 end);
  v_genel := case v_altin_sayisi when 3 then 'altin' when 2 then 'gumus' when 1 then 'bronz' else 'yok' end;

  return jsonb_build_object('konu', v_konu, 'soru', v_soru, 'deneme', v_deneme, 'genel', v_genel);
end;
$$;
