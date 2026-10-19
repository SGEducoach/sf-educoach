-- Rehber Takip Bildirimleri (kullanıcı kararı 20.10.2026): ani net düşüşü
-- veya yükselişi, ders bazında düşüş, uzun süre sessizlik ve biriken
-- görevler rehberin takip modülüne tarihli kayıt olarak düşer. Bildirim
-- kutusuna (duyuru_aliciler) GİTMEZ.
--
-- Kayıt öğrenci başınadır; kurumun rehberleri ortak görür, biri kapatınca
-- herkes için kapanır. (student_id, anahtar) tekil: olay her gün yeniden
-- hesaplansa da çoğalmaz (bkz. src/lib/rehber-takip.ts).
create table if not exists public.rehber_takip_bildirimleri (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  -- Okul rehberinin düzey kapsamı için olay anındaki sınıf düzeyi.
  sinif_seviyesi text,
  tur text not null check (tur in ('net_dususu', 'net_yukselisi', 'ders_dususu', 'sessizlik', 'gorev_birikmesi')),
  anahtar text not null,
  baslik text not null,
  ayrinti jsonb not null default '{}'::jsonb,
  olay_tarihi date not null,
  durum text not null default 'yeni' check (durum in ('yeni', 'goruldu', 'ele_alindi')),
  not_metni text check (not_metni is null or char_length(not_metni) <= 1000),
  kapatan_id uuid references public.profiles(id) on delete set null,
  kapatilma_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, anahtar)
);

create index if not exists rehber_takip_okul_durum_idx
  on public.rehber_takip_bildirimleri (school_id, durum, olay_tarihi desc);

-- Okuma ve yazma yalnız sunucuda, yetki doğrulandıktan sonra servis
-- anahtarıyla yapılır; istemciye doğrudan erişim verilmez.
alter table public.rehber_takip_bildirimleri enable row level security;

comment on table public.rehber_takip_bildirimleri is
  'Rehber takip bildirimleri (0171). Bildirim kutusuna gitmez; rehber Takip Bildirimleri bölümünden izler.';
