-- Kullanıcı isteği (26.09.2026): admin "Öğrenci Aktivitesi" bölümündeki
-- "en çok giriş yapan" kartı. Oturumlar açık kaldığı için "giriş yap"a basma
-- sayısı gerçek kullanımı yansıtmıyor — bunun yerine kullanıcının siteyi
-- kullandığı FARKLI gün sayısı tutulur (kullanıcı başına günde en fazla 1
-- satır). profiles.son_gorulme her istekte üzerine yazıldığı için geçmiş
-- vermiyordu. Yazma: middleware (src/lib/supabase/middleware.ts) günde bir
-- kez aktif_gun_kaydet() çağırır; okuma yalnızca service-role (admin paneli).
create table if not exists public.kullanici_aktif_gunler (
  user_id uuid not null references public.profiles(id) on delete cascade,
  gun date not null,
  primary key (user_id, gun)
);

create index if not exists kullanici_aktif_gunler_gun_idx on public.kullanici_aktif_gunler (gun);

alter table public.kullanici_aktif_gunler enable row level security;
revoke all on public.kullanici_aktif_gunler from anon, authenticated;

-- Kullanıcı yalnızca KENDİSİ için ve yalnızca BUGÜN (Türkiye saati) için
-- satır ekleyebilir — tabloya doğrudan yazma izni verilmiyor.
create or replace function public.aktif_gun_kaydet()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.kullanici_aktif_gunler (user_id, gun)
  select auth.uid(), (now() at time zone 'Europe/Istanbul')::date
  where auth.uid() is not null
  on conflict do nothing;
$$;

revoke all on function public.aktif_gun_kaydet() from public, anon;
grant execute on function public.aktif_gun_kaydet() to authenticated;
