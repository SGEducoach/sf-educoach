-- Kullanıcı isteği (17.10.2026): deneme yüklenirken denemeye giren sınıf
-- seviyesi sorulur ve eşleştirme kuyruğu satırında saklanır. Eşleştirme
-- ekranında öğrenci arama listesi bütün kurum yerine bu seviyeyle açılır.
-- Boş (null) = karışık / belirtilmedi; eski satırlar böyle kalır.
alter table public.pdf_deneme_eslesme_bekleyenler
  add column if not exists sinif_seviyesi text
  check (sinif_seviyesi is null or sinif_seviyesi in ('1','2','3','4','5','6','7','8','9','10','11','12'));

comment on column public.pdf_deneme_eslesme_bekleyenler.sinif_seviyesi is
  'Yükleyenin belirttiği, denemeye giren sınıf seviyesi (null = karışık). Eşleştirmede öğrenci listesini daraltır.';

-- 16.10.2026 Elbistan SDS yüklemeleri (adları SDS_BES_9 / SDS_BES_10).
update public.pdf_deneme_eslesme_bekleyenler set sinif_seviyesi = '9'
  where yayinevi = 'SDS_BES_9' and sinif_seviyesi is null;
update public.pdf_deneme_eslesme_bekleyenler set sinif_seviyesi = '10'
  where yayinevi = 'SDS_BES_10' and sinif_seviyesi is null;
