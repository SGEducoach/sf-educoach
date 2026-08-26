-- 2026-08-26 kullanıcı isteği — "Admin panelinde sitedeki aktif kullanıcı
-- sayısı görüntülenecek." Gerçek zamanlı bir presence/websocket sistemi
-- kurmak yerine (bu ölçekte gereksiz karmaşıklık), her istekte middleware
-- (src/lib/supabase/middleware.ts) oturumdaki kullanıcının son_gorulme
-- alanını günceller (en fazla dakikada bir — throttle koşulu WHERE'de).
-- "Şu an aktif" = son 5 dakika içinde son_gorulme'si güncellenen kullanıcı.

alter table public.profiles add column if not exists son_gorulme timestamptz;

comment on column public.profiles.son_gorulme is
  'Her istekte middleware tarafından güncellenir (en fazla dakikada bir) — admin panelindeki "şu an aktif kullanıcı" sayısı bunun üzerinden hesaplanır.';

create index if not exists profiles_son_gorulme_idx on public.profiles (son_gorulme);
