-- Yoklama akışı (kullanıcı isteği 18.10.2026, Faz 3): öğretmen yoklama
-- listesini (akşam yoklaması, evci izni, çarşı izni) WhatsApp'ta paylaşır
-- ya da yurt sorumlusu müdür yardımcısına gönderir. Gönderilen liste burada
-- saklanır; müdür yardımcısına "Yoklamalar alındı" bildirimi gider, o da
-- listeyi açıp ekleme yapar ve kartı kendisi paylaşır.
--
-- Okuma/yazma yalnız sunucuda service-role ile (bkz.
-- src/app/dashboard/yoklama-actions.ts); istemciye politika yok.

create table if not exists public.yurt_yoklamalari (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  tur text not null check (tur in ('aksam-yoklamasi', 'evci-izni', 'carsi-izni')),
  grup text not null check (grup in ('kiz', 'erkek')),
  tarih date not null,
  alanlar jsonb not null default '{}'::jsonb,
  ogrenciler jsonb not null default '[]'::jsonb,
  hazirlayan_id uuid references public.profiles(id) on delete set null,
  hazirlayan_adi text,
  created_at timestamptz not null default now()
);
create index if not exists yurt_yoklamalari_okul_tarih on public.yurt_yoklamalari (school_id, tarih desc, created_at desc);
alter table public.yurt_yoklamalari enable row level security;

-- Bildirim türüne "yoklama" eklenir.
alter table public.bildirimler drop constraint if exists bildirimler_tur_check;
alter table public.bildirimler add constraint bildirimler_tur_check
  check (tur = any (array['yanlis_giris', 'sistem', 'ders_programi', 'yurt_nobeti', 'yoklama']));
