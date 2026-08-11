-- Profil rolünü değiştirmeden öğretmene yalnız atanmış okul kapsamında
-- yönetim yetkisi verir. Service-role kullanan sunucu işlemleri ayrıca hedef
-- kullanıcının okulunu doğrular; bu tablo tek başına global admin yetkisi vermez.
create table if not exists public.school_moderators (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists school_moderators_school_id_idx on public.school_moderators(school_id);
alter table public.school_moderators enable row level security;

drop policy if exists "school_moderators_select_own_or_admin" on public.school_moderators;
create policy "school_moderators_select_own_or_admin" on public.school_moderators
  for select using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "school_moderators_admin_all" on public.school_moderators;
create policy "school_moderators_admin_all" on public.school_moderators
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_school_moderator(p_school_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.school_moderators
    where profile_id = auth.uid() and school_id = p_school_id
  );
$$;
revoke all on function public.is_school_moderator(uuid) from public;
grant execute on function public.is_school_moderator(uuid) to authenticated;

drop policy if exists "students_select_school_moderator" on public.students;
create policy "students_select_school_moderator" on public.students
  for select using (public.is_school_moderator(school_id));
drop policy if exists "teachers_select_school_moderator" on public.teachers;
create policy "teachers_select_school_moderator" on public.teachers
  for select using (public.is_school_moderator(school_id));
drop policy if exists "veli_requests_select_school_moderator" on public.veli_link_requests;
create policy "veli_requests_select_school_moderator" on public.veli_link_requests
  for select using (exists (
    select 1 from public.students s where s.id = student_id and public.is_school_moderator(s.school_id)
  ));

-- İstenen canlı atama. İsim ve okul birlikte eşleşir; yanlış okuldaki aynı
-- isimli kullanıcıya yetki verilmez.
do $$
declare v_profile_id uuid; v_school_id uuid; v_count int;
begin
  select count(*), (array_agg(p.id))[1], (array_agg(s.id))[1]
    into v_count, v_profile_id, v_school_id
  from public.profiles p
  join public.teachers t on t.id = p.id
  join public.schools s on s.id = t.school_id
  where public.ad_esleme_anahtari(p.ad) = public.ad_esleme_anahtari('Furkan Durmaz')
    and public.ad_esleme_anahtari(s.ad) like '%elbistan%fen%lisesi%';

  if v_count <> 1 then
    raise exception 'Furkan Durmaz / Elbistan Fen Lisesi için tekil öğretmen bulunamadı (eşleşme: %).', v_count;
  end if;

  insert into public.school_moderators(profile_id, school_id)
  values (v_profile_id, v_school_id)
  on conflict (profile_id) do update set school_id = excluded.school_id;
end;
$$;
