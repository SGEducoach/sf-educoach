-- Manipülasyon uyarı/ban sistemi (F) + hata bildirimi kayıt defteri (G).
-- Kullanıcı isteği (2026-08-25): "sistemi manipüle etme girişimlerine 4.de
-- uyarı 5'te ban... ban kaldırma moderatörde ve adminde olsun" +
-- "tüm kullanıcılara hata bildir bölümü... adminin hata kaydı ise burada
-- oturum açtığımızda seninle beraber çözülsün. hepsi için kayıt defteri".

-- ============ F: Manipülasyon uyarı/ban ============
-- Ban MEKANİZMASI olarak YENİ bir kolon açılmadı — profiles.aktif ZATEN
-- vardı (moderatorAktiflikDegistir/hesapAktiflikDegistir ile
-- moderatör/admin zaten aç/kapat yapabiliyordu) ama login akışı bunu HİÇ
-- kontrol etmiyordu (bkz. api/giris/route.ts düzeltmesi) — yani "ban
-- kaldırma moderatörde ve adminde olsun" isteği zaten var olan altyapıyla
-- karşılanıyor, sadece login'in buna uyması gerekiyordu.
alter table public.profiles add column if not exists manipulasyon_sayaci integer not null default 0;

comment on column public.profiles.manipulasyon_sayaci is
  'Server-side validasyonun reddettiği veri girişi denemesi sayısı (öğrenci/veli) — 4''te uyarı, 5''te otomatik aktif=false (ban). bkz. src/lib/manipulasyon-takip.ts.';

create table if not exists public.manipulasyon_loglari (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  detay text not null,
  created_at timestamptz not null default now()
);

create index if not exists manipulasyon_loglari_user_idx on public.manipulasyon_loglari (user_id);

comment on table public.manipulasyon_loglari is
  'Her manipülasyon girişiminin (server-side validasyon reddi) kaydı — moderatör/admin bir kullanıcıyı neden banladığını görebilsin diye.';

alter table public.manipulasyon_loglari enable row level security;
-- Bilinçli olarak HİÇBİR select/insert policy YOK — bu tablo SADECE
-- service-role (admin) client üzerinden yazılıp okunuyor (bkz.
-- src/lib/manipulasyon-takip.ts, yonetici/actions.ts). Kullanıcının
-- kendi sayacını/loglarını görebilmesi istenmiyor (sınırın tam ne zaman
-- dolacağını bilmesi manipülasyonu kolaylaştırır).

-- ============ G: Hata bildirimi + kayıt defteri ============
create table if not exists public.hata_bildirimleri (
  id uuid primary key default gen_random_uuid(),
  bildiren_id uuid references public.profiles(id) on delete set null,
  -- Sunucu tarafında bildiren_id'nin KENDİ profiles.role'ünden türetilir
  -- (client'tan asla alınmaz) — admin'in kendi bildirdiği kayıtlar bu
  -- alanla ayırt edilir (bkz. dosya başı G notu).
  bildiren_rol public.user_role not null,
  mesaj text not null check (char_length(mesaj) between 1 and 2000),
  sayfa text,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'cozuldu')),
  created_at timestamptz not null default now(),
  cozuldu_at timestamptz
);

create index if not exists hata_bildirimleri_durum_idx on public.hata_bildirimleri (durum, created_at desc);

comment on table public.hata_bildirimleri is
  'Tüm rollerden gelen "hata bildir" kayıtları — admin panelinde (/yonetici) görülüp çözüldü işaretlenir. bildiren_rol=''admin'' olanlar İSTİSNA: bunlar admin''in Claude Code oturumunda birlikte çözülmesi için bırakılan notlardır (bkz. proje notları), admin panelinden değil kod değişikliğiyle çözülür.';

alter table public.hata_bildirimleri enable row level security;
-- Yine sadece service-role — yazma requireUser() korumalı bir server
-- action'dan (hataBildir), okuma requireAdmin() korumalı admin
-- action'larından yapılıyor; RLS policy'sine gerek yok.
