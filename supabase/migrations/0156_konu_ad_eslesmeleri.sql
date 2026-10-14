-- Lise konu çalışması / soru çözümü serbest metinlerini kanonik müfredat
-- yaprak konularına bağlayan, admin tarafından onaylanan sözlük.
create table if not exists public.konu_ad_eslesmeleri (
  id uuid primary key default gen_random_uuid(),
  ders text not null,
  kaynak_konu text not null,
  hedef_konu text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (ders, kaynak_konu)
);

create index if not exists konu_ad_eslesmeleri_ders_idx on public.konu_ad_eslesmeleri (ders);
alter table public.konu_ad_eslesmeleri enable row level security;

drop policy if exists "konu_ad_eslesmeleri_select" on public.konu_ad_eslesmeleri;
create policy "konu_ad_eslesmeleri_select" on public.konu_ad_eslesmeleri
  for select to authenticated using (true);

drop policy if exists "konu_ad_eslesmeleri_admin_insert" on public.konu_ad_eslesmeleri;
create policy "konu_ad_eslesmeleri_admin_insert" on public.konu_ad_eslesmeleri
  for insert to authenticated with check (public.is_admin());

drop policy if exists "konu_ad_eslesmeleri_admin_update" on public.konu_ad_eslesmeleri;
create policy "konu_ad_eslesmeleri_admin_update" on public.konu_ad_eslesmeleri
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "konu_ad_eslesmeleri_admin_delete" on public.konu_ad_eslesmeleri;
create policy "konu_ad_eslesmeleri_admin_delete" on public.konu_ad_eslesmeleri
  for delete to authenticated using (public.is_admin());
