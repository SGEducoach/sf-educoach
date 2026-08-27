-- TG Denemeleri — Google Drive bypass planı (27.08.2026 kullanıcı isteği):
-- Google Drive entegrasyonu (bkz. docs/tg-denemeleri-google-drive.md) yarım
-- kalmıştı ve hiç kod yazılmamıştı — onun yerine tamamen admin panelinden
-- yönetilen, harici bağımlılık gerektirmeyen bu yapı kuruldu. Admin panelin
-- Duyurular bölümünden PDF/JPEG yükleyip içerik yazıyor, süreli/süresiz
-- seçiyor; akış en yeni 20 kaydı gösteriyor, 21. kayıttan itibaren eski
-- kayıtlar otomatik "arşiv" sayılıyor (ayrı bir durum sütunu YOK — sadece
-- created_at sırasına göre ilk 20/sonrası, bkz. src/lib/tg-deneme-ilanlari.ts).

create table public.tg_deneme_ilanlari (
  id uuid primary key default gen_random_uuid(),
  icerik text not null check (char_length(icerik) between 1 and 500),
  dosya_yolu text not null,
  dosya_tipi text not null check (dosya_tipi in ('resim', 'pdf')),
  genislik int,
  yukseklik int,
  bitis_tarihi date,
  olusturan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.tg_deneme_ilanlari enable row level security;

-- Herkes (tüm roller, giriş yapmış olmak kaydıyla — dashboard zaten
-- oturum gerektiriyor) okuyabilir; yazma/silme sadece admin.
create policy "tg_deneme_ilanlari_select_all" on public.tg_deneme_ilanlari
  for select using (true);
create policy "tg_deneme_ilanlari_insert_admin" on public.tg_deneme_ilanlari
  for insert with check (public.is_admin());
create policy "tg_deneme_ilanlari_delete_admin" on public.tg_deneme_ilanlari
  for delete using (public.is_admin());

-- Storage: yüklenen PDF/JPEG dosyaları için PUBLIC bucket (bu projede
-- Supabase Storage'ın İLK kullanımı). Public — hassas veri yok, zaten
-- herkese açık bir duyuru/afiş; CDN üzerinden RLS'siz okunabiliyor.
insert into storage.buckets (id, name, public)
values ('tg-denemeleri', 'tg-denemeleri', true)
on conflict (id) do nothing;

-- storage.objects'te de açık bir select politikası (bucket public olsa
-- da API/listing tarafında tutarlılık için) + yazma/silme sadece admin.
create policy "tg_denemeleri_objects_select_all" on storage.objects
  for select using (bucket_id = 'tg-denemeleri');
create policy "tg_denemeleri_objects_insert_admin" on storage.objects
  for insert with check (bucket_id = 'tg-denemeleri' and public.is_admin());
create policy "tg_denemeleri_objects_delete_admin" on storage.objects
  for delete using (bucket_id = 'tg-denemeleri' and public.is_admin());
