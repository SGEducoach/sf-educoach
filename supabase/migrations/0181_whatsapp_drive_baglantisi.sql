-- Genel WhatsApp duyurularının ekleri: dosyalar Drive'da, yalnız bağlantı ayarı DB'de.
-- OAuth yenileme anahtarı AES-256-GCM ile sunucuda şifrelenir. İstemci erişimi yok.
create table if not exists public.whatsapp_drive_baglantisi (
  id smallint primary key default 1 check (id = 1),
  refresh_token_sifreli text not null,
  klasor_id text,
  klasor_adi text,
  baglayan_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_drive_baglantisi enable row level security;
revoke all on table public.whatsapp_drive_baglantisi from public, anon, authenticated;
grant select, insert, update, delete on table public.whatsapp_drive_baglantisi to service_role;
comment on table public.whatsapp_drive_baglantisi is 'Yalnız sunucu/service_role: ortak duyuru Drive bağlantısı. Açık app_ayarlari tablosunda tutulmaz.';
-- Kullanıcı başına yükleme girişimi sınırını tam tablo taramadan okuyabilmek için.
create index if not exists admin_audit_log_drive_baslat_idx
  on public.admin_audit_log(actor_id, created_at desc) where eylem = 'whatsapp_drive_baslat';
