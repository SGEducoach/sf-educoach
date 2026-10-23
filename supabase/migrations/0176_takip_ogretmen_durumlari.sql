-- Sınıf öğretmenine özel Takip Bildirimleri (kullanıcı kararı 23.10.2026).
--
-- rehber_takip_bildirimleri (0171) kayıtları öğrenci başına TEK ve rehberler
-- arasında ortaktır: durum (yeni/görüldü/ele alındı) ve rehberin yazdığı not
-- (not_metni) o kaydın üstünde durur. Sınıf öğretmeni aynı kayıtları kendi
-- sınıfı için görecek ama:
--   * rehberin NOTU ona gösterilmez (rehberlik görüşmesi gizliliğiyle aynı
--     kaygı; bkz. 0145),
--   * onun "görüldü / ele alındı" işaretlemesi rehberin listesini değiştirmez.
-- Bu yüzden sınıf öğretmeninin durum ve notu ayrı tabloda, KİŞİ başına tutulur.
-- Satır yoksa o öğretmen için bildirim "yeni"dir.
--
-- RLS açık, politikasız: okuma ve yazma yalnız sunucuda, yetki doğrulandıktan
-- sonra servis anahtarıyla yapılır (0171 ile aynı desen).
create table if not exists public.takip_ogretmen_durumlari (
  bildirim_id uuid not null references public.rehber_takip_bildirimleri(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  durum text not null check (durum in ('goruldu', 'ele_alindi')),
  not_metni text check (not_metni is null or char_length(not_metni) <= 500),
  guncellenme_at timestamptz not null default now(),
  primary key (bildirim_id, teacher_id)
);

create index if not exists takip_ogretmen_durumlari_ogretmen_idx
  on public.takip_ogretmen_durumlari (teacher_id);

alter table public.takip_ogretmen_durumlari enable row level security;

comment on table public.takip_ogretmen_durumlari is
  'Sınıf öğretmeninin kendi Takip Bildirimleri durumu/notu (0176). Rehberin ortak durumundan ve notundan bağımsız; satır yoksa "yeni". Yalnız servis anahtarıyla erişilir.';
