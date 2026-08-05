-- SG EduCoach — Faz B: öğrenci veri girişi (konu çalışma, soru çözümü,
-- deneme sonuçları, hedefe yakınlık, haftalık verimlilik)
-- Mevcut şemayı bozmaz, sadece ekler.

create type public.hedefe_yakinlik as enum ('yakin', 'belirsiz', 'uzak');
create type public.verimlilik_duzeyi as enum ('cok_dusuk', 'dusuk', 'orta', 'iyi', 'cok_iyi');
create type public.deneme_turu as enum ('TYT', 'AYT');

-- 1) Konu çalışma
create table public.konu_calismalar (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null default current_date,
  ders text not null,
  konu text not null,
  sure_dakika integer not null check (sure_dakika > 0),
  hedefe_yakinlik public.hedefe_yakinlik not null,
  created_at timestamptz not null default now()
);

-- 2) Soru çözümü (net = dogru - yanlis/4, uygulama tarafında hesaplanır)
create table public.soru_cozumleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null default current_date,
  ders text not null,
  dogru integer not null check (dogru >= 0),
  yanlis integer not null check (yanlis >= 0),
  sure_dakika integer not null check (sure_dakika > 0),
  hedefe_yakinlik public.hedefe_yakinlik not null,
  created_at timestamptz not null default now()
);

-- 3) Deneme sonuçları (üst kayıt + ders bazlı doğru/yanlış)
create table public.denemeler (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null default current_date,
  tur public.deneme_turu not null,
  sure_dakika integer not null check (sure_dakika > 0),
  hedefe_yakinlik public.hedefe_yakinlik not null,
  kaynak text not null default 'ogrenci' check (kaynak in ('ogrenci', 'ogretmen')),
  created_at timestamptz not null default now()
);

create table public.deneme_ders_sonuclari (
  id uuid primary key default gen_random_uuid(),
  deneme_id uuid not null references public.denemeler(id) on delete cascade,
  ders text not null,
  dogru integer not null check (dogru >= 0),
  yanlis integer not null check (yanlis >= 0),
  unique (deneme_id, ders)
);

-- 4) Haftalık verimlilik
create table public.haftalik_verimlilikler (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  duzey public.verimlilik_duzeyi not null,
  created_at timestamptz not null default now()
);

create index on public.konu_calismalar (student_id, tarih);
create index on public.soru_cozumleri (student_id, tarih);
create index on public.denemeler (student_id, tarih);
create index on public.deneme_ders_sonuclari (deneme_id);
create index on public.haftalik_verimlilikler (student_id, created_at);

-- ============ RLS ============
alter table public.konu_calismalar enable row level security;
alter table public.soru_cozumleri enable row level security;
alter table public.denemeler enable row level security;
alter table public.deneme_ders_sonuclari enable row level security;
alter table public.haftalik_verimlilikler enable row level security;

create policy "konu_calismalar_select" on public.konu_calismalar for select using (public.has_student_access(student_id));
create policy "konu_calismalar_insert" on public.konu_calismalar for insert with check (student_id = auth.uid());

create policy "soru_cozumleri_select" on public.soru_cozumleri for select using (public.has_student_access(student_id));
create policy "soru_cozumleri_insert" on public.soru_cozumleri for insert with check (student_id = auth.uid());

create policy "denemeler_select" on public.denemeler for select using (public.has_student_access(student_id));
create policy "denemeler_insert" on public.denemeler for insert with check (
  student_id = auth.uid()
  or (kaynak = 'ogretmen' and exists (
    select 1 from public.teachers t join public.students s on s.class_id = t.class_id
    where s.id = denemeler.student_id and t.id = auth.uid()
  ))
);

create policy "deneme_ders_sonuclari_select" on public.deneme_ders_sonuclari for select using (
  exists (select 1 from public.denemeler d where d.id = deneme_ders_sonuclari.deneme_id and public.has_student_access(d.student_id))
);
create policy "deneme_ders_sonuclari_insert" on public.deneme_ders_sonuclari for insert with check (
  exists (
    select 1 from public.denemeler d where d.id = deneme_ders_sonuclari.deneme_id
    and (d.student_id = auth.uid() or exists (
      select 1 from public.teachers t join public.students s on s.class_id = t.class_id
      where s.id = d.student_id and t.id = auth.uid()
    ))
  )
);

create policy "haftalik_verimlilikler_select" on public.haftalik_verimlilikler for select using (public.has_student_access(student_id));
create policy "haftalik_verimlilikler_insert" on public.haftalik_verimlilikler for insert with check (student_id = auth.uid());

-- ============ Bu hafta / bugün özet için yardımcı RPC ============
-- Öğrencinin toplam veri girişi sayısını döner (haftalık verimlilik
-- tetiklemesi için: günlük->7'de bir, 3günlük->3'te bir, haftalık->her seferinde)
create or replace function public.ogrenci_giris_sayisi(p_student_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.konu_calismalar where student_id = p_student_id)
    + (select count(*) from public.soru_cozumleri where student_id = p_student_id)
    + (select count(*) from public.denemeler where student_id = p_student_id and kaynak = 'ogrenci');
$$;

revoke all on function public.ogrenci_giris_sayisi(uuid) from public;
grant execute on function public.ogrenci_giris_sayisi(uuid) to authenticated;
