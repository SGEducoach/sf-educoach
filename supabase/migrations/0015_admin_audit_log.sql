-- SG EduCoach — arkadaş testi madde 1: "admin paneli işlem kaydı tutuyor mu?"
-- Admin'in yaptığı kontrol işlemlerini (sınıf ekleme, sınıf öğretmeni atama)
-- kaydeden minimal bir audit log.

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  eylem text not null,
  detay jsonb,
  created_at timestamptz not null default now()
);

create index on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "admin_audit_log_select_admin" on public.admin_audit_log
  for select using (public.is_admin());

create policy "admin_audit_log_insert_admin" on public.admin_audit_log
  for insert with check (actor_id = auth.uid() and public.is_admin());
