-- SG EduCoach — veli rıza beyanı takibi
alter table public.profiles
  add column if not exists kvkk_onay_at timestamptz,
  add column if not exists kvkk_onay_versiyon text;
