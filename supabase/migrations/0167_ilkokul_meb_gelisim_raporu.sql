-- İlkokul gelişim raporu MEB Maarif Modeli'ne uyum (kullanıcı kararı
-- 19.10.2026). Kaynak: MEB, İlkokul 1. Sınıf Gelişim Raporu Öğretmen
-- Bilgilendirme Kılavuzu (2024-2025).
--
-- 1) Ders düzeyleri dörde çıkar: Geliştirilmeli / Yeterli / İyi / Çok İyi.
--    Eski kayıtlar: gelisiyor → yeterli, basarili → iyi.
-- 2) Sosyal duygusal öğrenme becerileri: 5 başlık, 26 gösterge; dönemde bir
--    kez, dört düzey (Düşük / Orta / Yüksek / Çok Yüksek Düzeyde Yansıtıyor).
-- 3) Dönem görüşü: sınıf öğretmeninin dönem sonu raporundaki görüşü.
--
-- Yazma yalnız sunucu işlemleriyle (service role, bkz.
-- src/app/dashboard/ilkokul-actions.ts); okuma 0157'deki gelişim raporuyla
-- aynı kural (kurum personeli kendi kapsamıyla, veli kendi çocuğu).

alter table public.ilkokul_gelisim drop constraint if exists ilkokul_gelisim_duzey_check;
update public.ilkokul_gelisim set duzey = case duzey when 'gelisiyor' then 'yeterli' when 'basarili' then 'iyi' else duzey end
  where duzey in ('gelisiyor', 'basarili');
alter table public.ilkokul_gelisim add constraint ilkokul_gelisim_duzey_check
  check (duzey in ('gelistirilmeli', 'yeterli', 'iyi', 'cok_iyi'));

create table if not exists public.ilkokul_sosyal_duygusal (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  egitim_yili text not null check (egitim_yili ~ '^[0-9]{4}-[0-9]{4}$'),
  donem smallint not null check (donem in (1, 2)),
  gosterge text not null check (gosterge ~ '^(kt|kd|ib|kv|sf)[1-6]$'),
  duzey text not null check (duzey in ('dusuk', 'orta', 'yuksek', 'cok_yuksek')),
  giren_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, egitim_yili, donem, gosterge)
);
create index if not exists ilkokul_sosyal_duygusal_ogrenci_idx on public.ilkokul_sosyal_duygusal (student_id, egitim_yili, donem);

create table if not exists public.ilkokul_donem_gorusleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  egitim_yili text not null check (egitim_yili ~ '^[0-9]{4}-[0-9]{4}$'),
  donem smallint not null check (donem in (1, 2)),
  metin text not null check (char_length(metin) between 1 and 1000),
  giren_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, egitim_yili, donem)
);

alter table public.ilkokul_sosyal_duygusal enable row level security;
alter table public.ilkokul_donem_gorusleri enable row level security;

drop policy if exists "ilkokul_sosyal_duygusal_select" on public.ilkokul_sosyal_duygusal;
create policy "ilkokul_sosyal_duygusal_select" on public.ilkokul_sosyal_duygusal for select using (
  (public.kurum_ogrencisini_gorebilir(student_id) and public.rehber_ogrenciyi_gorebilir(student_id))
  or public.has_student_access(student_id)
);

drop policy if exists "ilkokul_donem_gorusleri_select" on public.ilkokul_donem_gorusleri;
create policy "ilkokul_donem_gorusleri_select" on public.ilkokul_donem_gorusleri for select using (
  (public.kurum_ogrencisini_gorebilir(student_id) and public.rehber_ogrenciyi_gorebilir(student_id))
  or public.has_student_access(student_id)
);

comment on table public.ilkokul_sosyal_duygusal is
  'Ilkokul sosyal duygusal ogrenme becerileri (MEB 5 baslik, 26 gosterge), donemlik; migration 0167.';
