-- Hata bildirimleri açıkken admin ve bildiren kişi ek bilgi alışverişi yapabilir.
-- Çözüldü işlemi ana bildirimi siler; yanıtlar da onunla birlikte kaldırılır.
create table if not exists public.hata_bildirimi_yanitlari (
  id uuid primary key default gen_random_uuid(),
  hata_id uuid not null references public.hata_bildirimleri(id) on delete cascade,
  gonderen_id uuid references public.profiles(id) on delete set null,
  gonderen_rol text not null check (gonderen_rol in ('admin', 'kullanici')),
  mesaj text not null check (char_length(mesaj) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists hata_bildirimi_yanitlari_hata_idx
  on public.hata_bildirimi_yanitlari (hata_id, created_at);

alter table public.hata_bildirimi_yanitlari enable row level security;
-- Yalnızca yetki kontrolü yapan sunucu işlemleri service-role ile erişir.
