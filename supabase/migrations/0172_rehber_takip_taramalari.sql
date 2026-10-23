-- Faz 1 · Adım 1 (23.10.2026): Rehber Takip Bildirimleri'nin son tarama
-- zamanı. Takip sayfası artık her açılışta tam kurum taraması yapmaz;
-- yalnız son tarama 26 saatten eskiyse tarar (bkz. src/lib/rehber-takip.ts
-- TARAMA_TAZELIK_SAAT). Günlük cron, "Şimdi tara" ve sayfa taraması bu
-- tabloya yazar; ekranda "Son tarama: …" etiketi buradan gelir.
--
-- kapsam: 'tumu' (dershane / grup koçluğu: kurumun bütün öğrencileri) ya da
-- sıralı sınıf düzeyleri ('10,11,9'). Okulda cron düzeylerin birleşimini
-- tarar; düzey alt kümesi olan rehber o kaydı kullanır.
--
-- Tablo yoksa uygulama eski davranışa (açılışta tarama) düşer; geri alma:
--   drop table if exists public.rehber_takip_taramalari;
create table if not exists public.rehber_takip_taramalari (
  school_id uuid not null references public.schools(id) on delete cascade,
  kapsam text not null check (char_length(kapsam) between 1 and 200),
  son_tarama_at timestamptz not null default now(),
  eklenen integer not null default 0,
  primary key (school_id, kapsam)
);

-- 0171 ile aynı düzen: okuma/yazma yalnız sunucuda servis anahtarıyla;
-- RLS açık ve politikasız, istemciye doğrudan erişim yok.
alter table public.rehber_takip_taramalari enable row level security;

comment on table public.rehber_takip_taramalari is
  'Rehber takip taramalarının son zamanı (0172). Kapsam: tumu ya da sıralı sınıf düzeyleri.';
