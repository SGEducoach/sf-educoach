create table public.ana_sayfa_duyurulari (
  id uuid primary key default gen_random_uuid(),
  baslik text not null check (char_length(baslik) between 1 and 120),
  icerik text not null check (char_length(icerik) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ana_sayfa_duyurulari enable row level security;
create policy "ana_sayfa_duyurulari_select_all" on public.ana_sayfa_duyurulari for select using (true);
create policy "ana_sayfa_duyurulari_insert_admin" on public.ana_sayfa_duyurulari for insert with check (public.is_admin());
create policy "ana_sayfa_duyurulari_update_admin" on public.ana_sayfa_duyurulari for update using (public.is_admin());
create policy "ana_sayfa_duyurulari_delete_admin" on public.ana_sayfa_duyurulari for delete using (public.is_admin());

-- Aynı anda gelen eklemelerde dahi en yeni altı kayıt tutulur.
create or replace function public.ana_sayfa_duyurularini_sinirla()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(901006);
  delete from public.ana_sayfa_duyurulari
  where id in (
    select id from public.ana_sayfa_duyurulari
    order by created_at desc, id desc offset 6
  );
  return null;
end;
$$;
revoke all on function public.ana_sayfa_duyurularini_sinirla() from public, anon, authenticated;
create trigger ana_sayfa_duyurulari_limit
after insert on public.ana_sayfa_duyurulari
for each statement execute function public.ana_sayfa_duyurularini_sinirla();
