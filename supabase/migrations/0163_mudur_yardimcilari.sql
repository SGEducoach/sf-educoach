-- Müdür yardımcısı (kullanıcı kararı 18.10.2026): kurumdaki bir öğretmen
-- atanır; öğretmen girişiyle öğretmen paneline, İdare girişiyle müdür
-- yardımcısı paneline girer. Rehberlik Servisi gibi seçilen sınıf
-- düzeylerinden sorumludur; yurtlu okulda "yurt" sorumluluğu da alabilir
-- (yurt öğrencilerinin müdür gibi gözlemcisi, yoklamaların alıcısı).
-- Her kurum türünde (okul ve dershane) olur.
--
-- Atamayı admin ve kurum müdürü/moderatörü yapar; yazma yalnız sunucuda
-- service-role ile (bkz. src/app/moderator/mudur-yardimcisi-actions.ts).
-- Kullanıcı yalnız kendi satırını okuyabilir.

create table if not exists public.mudur_yardimcilari (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  sinif_duzeyleri text[] not null default '{}',
  yurt boolean not null default false,
  atayan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists mudur_yardimcilari_okul on public.mudur_yardimcilari (school_id);

alter table public.mudur_yardimcilari enable row level security;
drop policy if exists mudur_yardimcilari_kendi on public.mudur_yardimcilari;
create policy mudur_yardimcilari_kendi on public.mudur_yardimcilari
  for select to authenticated using (profile_id = auth.uid());

comment on table public.mudur_yardimcilari is
  'Müdür yardımcısı ataması: sorumlu sınıf düzeyleri ve (yurtlu okulda) yurt sorumluluğu.';
