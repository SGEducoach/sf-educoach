-- Okul CRUD admin panelinden yapılabilsin: şu ana kadar schools tablosunda
-- sadece "select" RLS policy'si vardı (okul ekleme/düzenleme sadece SQL ile
-- yapılabiliyordu). Artık admin panelden ekleme/düzenleme/pasifleştirme
-- mümkün; pasifleştirme hard-delete değil, "aktif" bayrağı ile yapılıyor.

alter table public.schools add column if not exists aktif boolean not null default true;

drop policy if exists "schools_insert_admin" on public.schools;
create policy "schools_insert_admin" on public.schools
  for insert with check (public.is_admin());

drop policy if exists "schools_update_admin" on public.schools;
create policy "schools_update_admin" on public.schools
  for update using (public.is_admin());
