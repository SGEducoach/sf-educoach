-- 5-8. sınıf öğrenme çıktısı değerlendirmesi (kullanıcı isteği 27.10.2026).
-- Öğrenme çıktıları MEB'in ortak yazılı sınav senaryolarından gelir
-- (src/lib/ortaokul-senaryo-ciktilari.json); branş öğretmeni her öğrenciye
-- her çıktı için MEB'in dört düzeyinden birini verir. Gelişim Raporu
-- bölümünde, ilkokul raporunun yanında durur.
--
-- cikti_kod kaynak tablodaki koddur (ör. "MAT.5.3.1", "E7.1.R1"); ders ve
-- sınıf kodun içinde olduğu için tekillik ders sütununa bağlı değildir.
--
-- Yazma yalnız sunucu işlemleriyle (service role, bkz.
-- src/app/dashboard/ortaokul-cikti-actions.ts); okuma ilkokul gelişim
-- raporuyla aynı kural (kurum personeli kendi kapsamıyla, veli kendi çocuğu).

create table if not exists public.ortaokul_cikti_degerlendirmeleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  egitim_yili text not null check (egitim_yili ~ '^[0-9]{4}-[0-9]{4}$'),
  donem smallint not null check (donem in (1, 2)),
  yazili smallint not null check (yazili in (1, 2)),
  ders text not null check (ders in ('turkce', 'matematik', 'fen', 'sosyal', 'inkilap', 'ingilizce', 'din')),
  cikti_kod text not null check (char_length(cikti_kod) between 3 and 30),
  duzey text not null check (duzey in ('gelistirilmeli', 'yeterli', 'iyi', 'cok_iyi')),
  giren_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, egitim_yili, donem, yazili, cikti_kod)
);
create index if not exists ortaokul_cikti_degerlendirmeleri_ogrenci_idx
  on public.ortaokul_cikti_degerlendirmeleri (student_id, egitim_yili, donem, ders);

alter table public.ortaokul_cikti_degerlendirmeleri enable row level security;

drop policy if exists "ortaokul_cikti_degerlendirmeleri_select" on public.ortaokul_cikti_degerlendirmeleri;
create policy "ortaokul_cikti_degerlendirmeleri_select" on public.ortaokul_cikti_degerlendirmeleri for select using (
  (public.kurum_ogrencisini_gorebilir(student_id) and public.rehber_ogrenciyi_gorebilir(student_id))
  or public.has_student_access(student_id)
);

comment on table public.ortaokul_cikti_degerlendirmeleri is
  '5-8. sinif ogrenme ciktisi degerlendirmesi (MEB ortak yazili senaryolari, 4 duzey); migration 0182.';
