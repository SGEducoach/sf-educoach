create table if not exists public.yonetici_mesajlari (
  id uuid primary key default gen_random_uuid(),
  kurum_yetkilisi_id uuid not null references public.profiles(id),
  gonderen_id uuid not null references public.profiles(id),
  school_id uuid not null references public.schools(id),
  mesaj text not null check (char_length(mesaj) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists yonetici_mesajlari_konusma_idx on public.yonetici_mesajlari(kurum_yetkilisi_id, created_at);
alter table public.yonetici_mesajlari enable row level security;
revoke all on public.yonetici_mesajlari from anon, authenticated;
grant all on public.yonetici_mesajlari to service_role;
