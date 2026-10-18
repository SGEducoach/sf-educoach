-- Kurum dışı belletmen (kullanıcı isteği 18.10.2026, Faz 4): ayrı kayıt
-- sayfasından öğretmen olarak kaydolur; admin onaylayana kadar hesabı
-- kapalıdır (profiles.aktif = false) ve giriş yapamaz. Onaydan sonra
-- kurumda göreve başlar: panelinde yalnız Yoklama ve Nöbetlerim (takas
-- hakkıyla) bulunur. Yurt nöbet listesiyle eşleşme öğretmen satırı
-- eklenirken mevcut tetikleyiciyle (ad eşleşmesi) olur.
--
-- Okuma/yazma yalnız sunucuda service-role ile; istemciye politika yok.

create table if not exists public.kurum_disi_belletmenler (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  cinsiyet text not null check (cinsiyet in ('kadin', 'erkek')),
  telefon text,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'onaylandi', 'reddedildi')),
  created_at timestamptz not null default now(),
  karar_veren_id uuid references public.profiles(id) on delete set null,
  karar_at timestamptz
);
create index if not exists kurum_disi_belletmenler_durum on public.kurum_disi_belletmenler (durum, created_at desc);
alter table public.kurum_disi_belletmenler enable row level security;
