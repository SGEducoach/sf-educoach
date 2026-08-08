-- "Mesajınız var" kutusu — push bildirimine EK olarak (yerine değil), her
-- duyuruGonder çağrısı artık alıcıları burada da kalıcı olarak kaydediyor.
-- Push kaçırılsa bile (izin yok, bildirim silindi, telefon kapalıydı) mesaj
-- header'daki ikonla görülebiliyor.
--
-- Basit tasarım: duyurular (tek satır = tek gönderim) + duyuru_aliciler
-- (kime gitti + okundu mu). Alıcı listesi, push'un GERÇEKTEN gittiği aynı
-- profil id listesi (öğrenci + bağlı veliler) — kapsam mantığını burada
-- tekrar etmiyoruz, src/lib/push-send.ts'teki duyuruGonder tek yerden
-- besliyor.
create table public.duyurular (
  id uuid primary key default gen_random_uuid(),
  gonderen_id uuid references public.profiles(id) on delete set null,
  baslik text not null,
  mesaj text not null,
  created_at timestamptz not null default now()
);

create table public.duyuru_aliciler (
  duyuru_id uuid not null references public.duyurular(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  okundu boolean not null default false,
  primary key (duyuru_id, profile_id)
);

create index on public.duyuru_aliciler (profile_id, okundu);

alter table public.duyurular enable row level security;
alter table public.duyuru_aliciler enable row level security;

-- Bir duyuruyu sadece gerçek bir alıcısıysan görebiliyorsun.
create policy "duyurular_select_alici" on public.duyurular
  for select using (
    exists (select 1 from public.duyuru_aliciler da where da.duyuru_id = duyurular.id and da.profile_id = auth.uid())
  );

-- Kendi alıcı satırını görebilir ve "okundu" bayrağını kendisi
-- güncelleyebilir (mesajı açınca) — başka hiçbir alanı değiştiremez, insert/
-- delete client'a kapalı (sadece service-role, duyuruGonder üzerinden).
create policy "duyuru_aliciler_select_own" on public.duyuru_aliciler
  for select using (profile_id = auth.uid());
create policy "duyuru_aliciler_update_own" on public.duyuru_aliciler
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
