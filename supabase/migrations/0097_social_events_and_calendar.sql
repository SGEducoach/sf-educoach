-- Revizyon_2: okul sosyal etkinlikleri ve öğretmen ajandası.
-- Idempotent tutulur. ogretmen_yurt_nobeti 0066'da zaten oluşturulduğu
-- için burada tekrar oluşturulmaz.
create table if not exists public.yarismalar (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  olusturan_id uuid references public.profiles(id) on delete set null,
  isim text not null check(char_length(isim) between 2 and 200),
  tur text not null check(tur in ('proje', 'yarisma', 'program')),
  tarih date not null,
  son_basvuru_tarihi date,
  created_at timestamptz not null default now(),
  aktif boolean not null default true
);
alter table public.yarismalar add column if not exists olusturan_id uuid references public.profiles(id) on delete set null;
create index if not exists yarismalar_school_idx on public.yarismalar(school_id);
create index if not exists yarismalar_tarih_idx on public.yarismalar(tarih);

create or replace function public.yarisma_kurum_kontrolu() returns trigger language plpgsql as $$
begin
  if not exists(select 1 from public.schools where id=new.school_id and tur='okul') then
    raise exception 'Sosyal etkinlikler yalnız okul kurumlarında kullanılabilir.';
  end if;
  if new.teacher_id is not null and not exists(select 1 from public.teachers where id=new.teacher_id and school_id=new.school_id) then
    raise exception 'Etkinliği ekleyen öğretmen bu okula ait değildir.';
  end if;
  return new;
end $$;
drop trigger if exists yarisma_kurum_trg on public.yarismalar;
create trigger yarisma_kurum_trg before insert or update on public.yarismalar
for each row execute function public.yarisma_kurum_kontrolu();

alter table public.yarismalar enable row level security;
drop policy if exists "yarisma_select" on public.yarismalar;
drop policy if exists "yarisma_insert" on public.yarismalar;
drop policy if exists "yarisma_update" on public.yarismalar;
drop policy if exists "yarisma_delete" on public.yarismalar;

create table if not exists public.gorev_okuma_onaylari (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  etkinlik_id uuid not null references public.yarismalar(id) on delete cascade,
  okunma_tarihi timestamptz not null default now(),
  okudum boolean not null default true,
  unique(teacher_id, etkinlik_id)
);
create index if not exists gorev_okuma_onaylari_teacher_idx on public.gorev_okuma_onaylari(teacher_id);
alter table public.gorev_okuma_onaylari enable row level security;

comment on table public.yarismalar is 'Okullardaki sosyal etkinlik, proje, program ve yarışmalar';
comment on table public.gorev_okuma_onaylari is 'Öğretmenin etkinlik görevini okuduğu ve ajandasına aldığı kayıtlar';
