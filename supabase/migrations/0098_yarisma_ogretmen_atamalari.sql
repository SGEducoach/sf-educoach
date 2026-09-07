-- Sosyal etkinlik/yarışma görevi kurumdaki tüm öğretmenlere açık değildir;
-- moderatör veya müdürün seçtiği öğretmenlere atanır.
create table if not exists public.yarisma_ogretmen_atamalari (
  id uuid primary key default gen_random_uuid(),
  yarisma_id uuid not null references public.yarismalar(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  atayan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(yarisma_id, teacher_id)
);
create index if not exists yarisma_atama_teacher_idx on public.yarisma_ogretmen_atamalari(teacher_id);
create index if not exists yarisma_atama_yarisma_idx on public.yarisma_ogretmen_atamalari(yarisma_id);
alter table public.yarisma_ogretmen_atamalari enable row level security;

-- Önceden öğretmenin kendi eklediği kayıtları kaybetmeden yeni modele taşı.
insert into public.yarisma_ogretmen_atamalari(yarisma_id, teacher_id, atayan_id)
select id, teacher_id, coalesce(olusturan_id, teacher_id)
from public.yarismalar where teacher_id is not null
on conflict(yarisma_id, teacher_id) do nothing;
