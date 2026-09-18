-- Öğretmenin kendine ek yurt nöbeti eklemesi (kullanıcı isteği 18.09.2026):
-- "takas harici nöbet gelmişse nöbet ekle yeterli". Öğretmen yalnızca
-- KENDİ eklediği nöbeti silebilir; PDF'ten ya da yöneticiden gelen
-- nöbetlerde ekleyen_id boştur ve öğretmen onlara dokunamaz. Yazma yine
-- yalnızca sunucu (servis anahtarı) — bkz. src/app/dashboard/nobet-devir-actions.ts.
alter table public.yurt_nobet_gorevleri
  add column if not exists ekleyen_id uuid references public.profiles(id) on delete set null;
