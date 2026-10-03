-- Moderatörün eklediği branş alt konuları yalnız kendi kurumunda görünür.
create table if not exists public.kurum_mufredat_alt_konulari (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ders text not null,
  ust_konu text not null,
  alt_baslik text not null check (char_length(alt_baslik) between 2 and 120),
  created_at timestamptz not null default now(),
  unique (school_id, ders, alt_baslik)
);

create index if not exists kurum_mufredat_alt_konulari_school_idx
  on public.kurum_mufredat_alt_konulari (school_id, ders, ust_konu);

alter table public.kurum_mufredat_alt_konulari enable row level security;

create policy "kurum_mufredat_alt_konulari_select" on public.kurum_mufredat_alt_konulari
  for select using (
    public.is_admin()
    or exists (select 1 from public.students s where s.id = auth.uid() and s.school_id = kurum_mufredat_alt_konulari.school_id)
    or exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = kurum_mufredat_alt_konulari.school_id)
    or exists (select 1 from public.school_moderators m where m.profile_id = auth.uid() and m.school_id = kurum_mufredat_alt_konulari.school_id)
  );
