-- Grup Koçluk Faz 5 (kullanıcı kararı 18.09.2026): grup öğrencisi ilk
-- girişte isteğe bağlı gerçek e-postasını ekler; e-posta DOĞRULANINCA hesaba
-- yazılır. Supabase'in yerleşik e-posta değiştirme akışı eski adrese de onay
-- gönderebildiği için (öğrencinin eski adresi sistem içi sahte bir adres,
-- onay hiç ulaşmaz) kendi bağlantımızı kullanıyoruz: e-postaya tek kullanımlık
-- bağlantı gider, tıklanınca hesap ve profil e-postası birlikte güncellenir.
-- Belirtecin kendisi saklanmaz, yalnızca SHA-256 özeti. Yalnızca sunucu erişir.
create table if not exists public.eposta_dogrulamalari (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  token_ozeti text not null unique,
  son_gecerlilik timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists eposta_dogrulamalari_profil on public.eposta_dogrulamalari (profile_id);

alter table public.eposta_dogrulamalari enable row level security;
revoke all on public.eposta_dogrulamalari from anon, authenticated;
