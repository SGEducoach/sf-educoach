-- SG EduCoach — AI destekli konu anlatımı içerik önbelleği.
-- Bir ders+konu kombinasyonu için anlatım TEK SEFER üretilir (Claude API),
-- burada saklanır; sonraki her istek bu tablodan okunur — tekrar API
-- çağrısı yapılmaz. Yazma yalnızca service-role (server action) ile yapılır,
-- normal kullanıcılar sadece okuyabilir.

create table public.konu_anlatimlari (
  id uuid primary key default gen_random_uuid(),
  ders text not null,
  konu text not null,
  icerik text not null,
  created_at timestamptz not null default now(),
  unique (ders, konu)
);

alter table public.konu_anlatimlari enable row level security;

create policy "konu_anlatimlari_select_all" on public.konu_anlatimlari
  for select using (true);
