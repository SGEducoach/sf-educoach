-- Kullanıcı isteği (26.08.2026, Bildirimler yeniden tasarımı — devam):
-- migration 0077 sadece tercih (opt-out) sütunlarını eklemişti; asıl
-- "Sistem içerisindeki bildirimleri kullanıcı buradan takip edecek"
-- kısmı için gerçek bir bildirim FEED'i hiç yoktu — "Bildirimler" kutusu
-- sadece tarayıcı push ayarlarını gösteriyordu. Bu tablo o feed'i
-- sağlıyor. İlk kullanım: yanlış giriş denemesi uyarısı artık buraya
-- yazılacak (daha önce duyurular/duyuru_aliciler'a, yani "Mesajlarım"
-- kutusuna gidiyordu — kullanıcı isteği: "bunlar bildirim paneline
-- gidecek").
create table public.bildirimler (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tur text not null check (tur in ('yanlis_giris', 'sistem')),
  baslik text not null,
  mesaj text not null,
  okundu boolean not null default false,
  created_at timestamptz not null default now()
);

create index bildirimler_profile_id_created_at_idx on public.bildirimler (profile_id, created_at desc);

alter table public.bildirimler enable row level security;

-- Sadece kendi bildirimini görebilir/okundu işaretleyebilir. Ekleme
-- (insert) için bilinçli olarak bir politika YOK — tüm yazma işlemleri
-- sunucu tarafında admin/service-role client ile yapılıyor (bkz.
-- src/lib/bildirim-gonder.ts), RLS bunu zaten atlıyor.
create policy "bildirimler_select_own" on public.bildirimler
  for select using (profile_id = auth.uid());

create policy "bildirimler_update_own" on public.bildirimler
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
