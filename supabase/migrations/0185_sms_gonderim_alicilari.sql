-- Kurum SMS Geçmişi (kullanıcı isteği 02.11.2026): admin, seçtiği kurumdan
-- kimin, ne zaman, hangi numaralara, hangi içerikle SMS gönderdiğini görür.
-- 0183'te numaralar bilerek tutulmuyordu; bu istekle her gönderimin
-- sağlayıcıya GİDEN alıcıları (numara + kimin numarası olduğu) ayrı tabloya
-- yazılır. Tablo YALNIZ sunucu/service_role ile okunur; ekranı yalnız admin
-- görür (src/components/yonetici/KurumSmsGecmisi.tsx). Bu tarihten önceki
-- gönderimlerin alıcı listesi yoktur.

create table if not exists public.sms_gonderim_alicilari (
  id uuid primary key default gen_random_uuid(),
  gonderim_id uuid not null references public.sms_gonderimleri(id) on delete cascade,
  telefon text not null check (telefon ~ '^905[0-9]{9}$'),
  -- "Ayşe Yılmaz velisi (9-A)" ya da mezunun adı.
  alici text check (alici is null or char_length(alici) <= 200)
);
create index if not exists sms_gonderim_alicilari_gonderim_idx on public.sms_gonderim_alicilari (gonderim_id);

alter table public.sms_gonderim_alicilari enable row level security;
revoke all on table public.sms_gonderim_alicilari from public, anon, authenticated;
grant select, insert, update, delete on table public.sms_gonderim_alicilari to service_role;

comment on table public.sms_gonderim_alicilari is
  'Yalniz sunucu/service_role: SMS gonderiminin alicilari (numara + kim); admin Kurum SMS Gecmisi; migration 0185.';
