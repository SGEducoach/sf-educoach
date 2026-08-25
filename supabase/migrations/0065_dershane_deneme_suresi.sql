-- Dershane modülü 1 haftalık deneme süresi (2026-08-25 kullanıcı isteği).
-- Süre dolunca dershane rolleri (öğrenci/veli/öğretmen/müdür) "deneme
-- süreniz sona erdi" ekranıyla karşılanır — okul tarafı hiç etkilenmez.
-- Bilinçli olarak sabit koda GÖMÜLMEDİ — /yonetici panelinden tarih
-- uzatılabilir/kısaltılabilir (kullanıcı kararı).

-- Tek satırlık ayar tablosu — id sabit 1 olacak şekilde kısıtlanmış,
-- ikinci bir satır eklenmesini engelliyor (RLS'e gerek kalmadan tekillik).
create table if not exists public.platform_ayarlari (
  id integer primary key default 1 check (id = 1),
  dershane_deneme_bitis timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.platform_ayarlari is
  'Tek satırlık platform geneli ayarlar. dershane_deneme_bitis: bu tarih geçtiğinde dershane rolleri (öğrenci/veli/öğretmen/müdür) "deneme süreniz sona erdi" ekranıyla karşılanır; null ise süre sınırı yok.';

-- Deploy anında saat başlasın (bugünden +7 gün) — kullanıcı /yonetici'den
-- istediği zaman uzatabilir/kısaltabilir/kaldırabilir (null yaparak).
insert into public.platform_ayarlari (id, dershane_deneme_bitis)
values (1, now() + interval '7 days')
on conflict (id) do nothing;

alter table public.platform_ayarlari enable row level security;

-- Herkes (anon dahil — login sayfası kimlik doğrulamadan ÖNCE de bu
-- tarihi bilmeli, örn. dershane girişini engellemek için) okuyabilir;
-- sadece admin yazabilir.
drop policy if exists "platform_ayarlari_select" on public.platform_ayarlari;
create policy "platform_ayarlari_select" on public.platform_ayarlari
  for select using (true);

drop policy if exists "platform_ayarlari_admin_all" on public.platform_ayarlari;
create policy "platform_ayarlari_admin_all" on public.platform_ayarlari
  for all using (public.is_admin()) with check (public.is_admin());
