-- Sosyal görev türlerine "Diğer" seçeneği ve 7/3/1 günlük öğretmen
-- hatırlatmalarının aynı görev için yalnız bir kez gönderilmesi.
alter table public.yarismalar
  drop constraint if exists yarismalar_tur_check;
alter table public.yarismalar
  add constraint yarismalar_tur_check
  check (tur in ('proje', 'yarisma', 'program', 'diger'));

create table if not exists public.yarisma_hatirlatmalari (
  id uuid primary key default gen_random_uuid(),
  yarisma_id uuid not null references public.yarismalar(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  hedef_tarih date not null,
  kalan_gun smallint not null check (kalan_gun in (1, 3, 7)),
  created_at timestamptz not null default now(),
  unique (yarisma_id, teacher_id, hedef_tarih, kalan_gun)
);

create index if not exists yarisma_hatirlatma_teacher_idx
  on public.yarisma_hatirlatmalari(teacher_id, created_at desc);
alter table public.yarisma_hatirlatmalari enable row level security;

comment on table public.yarisma_hatirlatmalari is
  'Sosyal görevlerin son başvuru veya görev tarihi için gönderilen 7/3/1 günlük tekil hatırlatmalar';
