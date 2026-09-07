create table public.yarismalar (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  isim text not null check(char_length(isim) between 2 and 200),
  tur text not null check(tur in ('proje', 'yarisma', 'program')),
  tarih date not null,
  son_basvuru_tarihi date,
  created_at timestamptz not null default now(),
  aktif boolean not null default true
);
create index yarismalar_school_idx on public.yarismalar(school_id);
create index yarismalar_teacher_idx on public.yarismalar(teacher_id);
create index yarismalar_tarih_idx on public.yarismalar(tarih);
create index yarismalar_aktif_idx on public.yarismalar(aktif);

create or replace function public.yarisma_kurum_kontrolu() returns trigger language plpgsql as $$
begin
  if new.school_id is null then raise exception 'Yarisma okula ait olmalidir.'; end if;
  if new.teacher_id is not null then
    if not exists(
      select 1 from public.teachers t join public.schools s on s.id=t.school_id
      where t.id=new.teacher_id and t.school_id=new.school_id
    ) then raise exception 'Yarismayi girebileceginiz ogretmen okuluna aittir.'; end if;
  end if;
  return new;
end $$;
create trigger yarisma_kurum_trg before insert or update on public.yarismalar
for each row execute function public.yarisma_kurum_kontrolu();

alter table public.yarismalar enable row level security;
create policy "yarisma_select" on public.yarismalar for select using((select 1 from public.schools s where s.id=school_id and s.tur='okul') or exists(select 1 from public.teachers t where t.id=teacher_id and t.school_id=school_id));
create policy "yarisma_insert" on public.yarismalar for insert with check((select 1 from public.schools s where s.id=school_id and s.tur='okul'));
create policy "yarisma_update" on public.yarismalar for update using((select 1 from public.schools s where s.id=school_id and s.tur='okul'));
create policy "yarisma_delete" on public.yarismalar for delete using((select 1 from public.schools s where s.id=school_id and s.tur='okul'));

-- Yurt nöbeti tablosu - sadece okul için, öğretmen kendi nöbet tarihlerini girer
create table public.ogretmen_yurt_nobeti (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  sutun integer not null check(sutun in (1,2)),
  sira integer not null check(sira between 1 and 6),
  tarih date not null,
  created_at timestamptz not null default now(),
  unique(teacher_id, sutun, sira)
);
create index ogretmen_yurt_nobeti_teacher_idx on public.ogretmen_yurt_nobeti(teacher_id);
create index ogretmen_yurt_nobeti_tarih_idx on public.ogretmen_yurt_nobeti(tarih);

-- Takvim ayarları ve tercihleri
create table public.takvim_tercihler (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gunluk_gorunum boolean not null default true,
  haftalik_gorunum boolean not null default true,
  aylik_gorunum boolean not null default true,
  goster_passed_dates boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id)
);

-- Okudum işaretleme (görev okuma onayı)
create table public.gorev_okuma_onaylari (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  etkinlik_id uuid not null references public.yarismalar(id) on delete cascade,
  okunma_tarihi timestamptz not null default now(),
  okudum boolean not null default false,
  unique(teacher_id, etkinlik_id)
);
create index gorev_okuma_onaylari_teacher_idx on public.gorev_okuma_onaylari(teacher_id);
create index gorev_okuma_onaylari_etkinlik_idx on public.gorev_okuma_onaylari(etkinlik_id);

-- Görev takvim atamaları - takvime yerleştirilen görevler
create table public.gorev_takvim_atamalari (
  id uuid primary key default gen_random_uuid(),
  yarisma_id uuid not null references public.yarismalar(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null,
  baslangic_saat time,
  bitis_saat time,
  durum text not null default 'kabul' check(durum in('kabul','iptal')),
  created_at timestamptz not null default now(),
  unique(yarisma_id, student_id, tarih)
);
create index gorev_takvim_atamalari_student_idx on public.gorev_takvim_atamalari(student_id);
create index gorev_takvim_atamalari_tarih_idx on public.gorev_takvim_atamalari(tarih);

-- Debug/veri Kontrol fonksiyonu
comment on table public.yarismalar is 'Okul kurumlarında faal sosyal etkinliklar ve yarışmalar';
comment on column public.yarismalar.tur is 'Etkinlik türü: proje/yarışma/program';
comment on column public.yarismalar.tarih is 'Etkinlik tarihi';
comment on column public.yarismalar.son_basvuru_tarihi is 'Son başvuru tarihi (opsiyonel)';
comment on column public.yarismalar.aktif is 'Tarih geçince pasifleşir (soft delete yerine aktif=false)';
comment on table public.ogretmen_yurt_nobeti is 'Öğretmen yurt nöbet tarihleri';
comment on table public.gorev_okuma_onaylari is 'Öğretmen "okudum" onayı';
comment on table public.gorev_takvim_atamalari is 'Takvimde görüntülenecek görev atamaları';