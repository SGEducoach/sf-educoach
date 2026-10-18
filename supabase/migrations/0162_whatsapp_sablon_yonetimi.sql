-- WhatsApp duyuru sisteminin admin yönetimi (kullanıcı isteği 18.10.2026):
-- admin şablonların adını ve karttaki başlığını değiştirir, şablonu
-- gizler, şablon başına fotoğraf ekler/siler (yerleşik fotoğrafı da
-- gizleyebilir). Kart hazırlayan, şablonun fotoğrafları arasından seçer.
--
-- Okuma ve yazma yalnız sunucuda service-role ile yapılır (admin
-- doğrulandıktan sonra, bkz. src/app/yonetici/whatsapp-actions.ts); bu
-- yüzden tablolarda RLS açık ve istemciye politika yok.

create table if not exists public.whatsapp_sablon_ayarlari (
  anahtar text primary key,                       -- 'veli-toplantisi', 'devamsizlik', 'aksam-yoklamasi'…
  ad text check (ad is null or char_length(ad) between 2 and 60),
  baslik text check (baslik is null or char_length(baslik) between 2 and 80),
  gizli boolean not null default false,
  yerlesik_foto_gizli boolean not null default false,
  guncelleyen_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_sablon_ayarlari enable row level security;

create table if not exists public.whatsapp_sablon_fotograflari (
  id uuid primary key default gen_random_uuid(),
  anahtar text not null,
  dosya_yolu text not null,                       -- kurum-dışı depo: duyuru-fotograflari/<anahtar>/<id>
  sira integer not null default 0,
  olusturan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_sablon_fotograflari_anahtar on public.whatsapp_sablon_fotograflari (anahtar, sira, created_at);
alter table public.whatsapp_sablon_fotograflari enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('duyuru-fotograflari', 'duyuru-fotograflari', true, 3145728, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
