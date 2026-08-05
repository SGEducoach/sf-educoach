-- SG EduCoach — hatırlatma sistemi için students'a takip kolonu.
alter table public.students
  add column if not exists son_hatirlatma_deadline timestamptz;
