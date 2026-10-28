-- SMS modülü (kullanıcı kararı 28.10.2026): kurum KENDİ SMS paketini bağlar,
-- Sefu paket satmaz. Başlık (gönderici adı) servis sağlayıcıdan çekilir ve
-- kullanıcı tarafından yazılamaz; yalnız içerik düzenlenir.
--
-- Üç tablo da YALNIZ sunucu/service_role ile okunur-yazılır: kimlik bilgileri
-- (API şifresi) AES-256-GCM ile uygulama katmanında şifrelenir, istemciye hiç
-- dönmez. Yetki (müdür / müdür yardımcısı / rehberlik servisi) sunucu
-- işlemlerinde doğrulanır. Kurum modül anahtarı: schools.modul_yetkileri->>'sms'
-- (varsayılan KAPALI; yönetici Kurum Yetkileri'nden açar).

create table if not exists public.kurum_sms_ayarlari (
  school_id uuid primary key references public.schools(id) on delete cascade,
  saglayici text not null check (saglayici in ('netgsm', 'iletimerkezi', 'verimor')),
  kimlik_sifreli text not null,
  -- Sağlayıcıdan son çekilen onaylı başlıklar ve seçili olan.
  basliklar jsonb not null default '[]'::jsonb check (jsonb_typeof(basliklar) = 'array'),
  secili_baslik text,
  bakiye text,
  son_dogrulama_at timestamptz,
  guncelleyen_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sms_sablonlari (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad text not null check (char_length(ad) between 1 and 80),
  icerik text not null check (char_length(icerik) between 1 and 1000),
  olusturan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists sms_sablonlari_okul_idx on public.sms_sablonlari(school_id, created_at desc);

-- Gönderim geçmişi. Telefon numarası SAKLANMAZ; alıcılar öğrenci kimliğiyle
-- tutulur (kişisel veri depoya/günlüğe girmesin).
create table if not exists public.sms_gonderimleri (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  gonderen_id uuid references public.profiles(id) on delete set null,
  saglayici text not null,
  baslik text not null,
  icerik text not null,
  -- 'mezun': rehberliğe eklenecek mezun öğrenciler modülü için ayrıldı.
  alici_turu text not null default 'veli' check (alici_turu in ('veli', 'mezun')),
  hedef_ozeti text,
  alici_sayisi integer not null check (alici_sayisi >= 0),
  gecersiz_sayisi integer not null default 0 check (gecersiz_sayisi >= 0),
  durum text not null check (durum in ('gonderildi', 'zamanlandi', 'kismen', 'hata')),
  zamanlanmis_at timestamptz,
  saglayici_is_id text,
  hata text,
  created_at timestamptz not null default now()
);
create index if not exists sms_gonderimleri_okul_idx on public.sms_gonderimleri(school_id, created_at desc);
create index if not exists sms_gonderimleri_gonderen_idx on public.sms_gonderimleri(gonderen_id, created_at desc);

alter table public.kurum_sms_ayarlari enable row level security;
alter table public.sms_sablonlari enable row level security;
alter table public.sms_gonderimleri enable row level security;
revoke all on table public.kurum_sms_ayarlari from public, anon, authenticated;
revoke all on table public.sms_sablonlari from public, anon, authenticated;
revoke all on table public.sms_gonderimleri from public, anon, authenticated;
grant select, insert, update, delete on table public.kurum_sms_ayarlari to service_role;
grant select, insert, update, delete on table public.sms_sablonlari to service_role;
grant select, insert, update, delete on table public.sms_gonderimleri to service_role;

comment on table public.kurum_sms_ayarlari is 'Yalnız sunucu/service_role: kurumun SMS sağlayıcı bağlantısı. kimlik_sifreli AES-256-GCM (SMS_KIMLIK_ANAHTARI).';
comment on table public.sms_gonderimleri is 'Yalnız sunucu/service_role: SMS gönderim geçmişi. Telefon numarası tutulmaz.';
