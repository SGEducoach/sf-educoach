-- Ortaokul müfredatı: temanın alt başlıkları.
--
-- Neden (01.10.2026, kullanıcı bildirimi "dersler eksik"): İngilizce tasarım
-- belgesi §1.1'de KAPSAMDA ama müfredata hiç yüklenmemişti. Sebebi şema:
-- diğer dersler tema > NUMARALI öğrenme çıktısı olarak geliyor, MEB İngilizce
-- programında numaralı öğrenme çıktısı YOK — içerik tema > alt tema
-- ("Sub-themes: classroom rules and language; school subjects; …") biçiminde.
--
-- Alt başlıkları `ortaokul_mufredat_kazanimlari` satırı yapmak yanlış olurdu:
-- onlar öğrenme ÇIKTISI değil, temanın içindeki konu başlıkları. Ekranda da
-- "öğrenme hedefi" diye gösterilirlerdi. Bu yüzden temanın kendi alanı.
--
-- Diğer dersler için NULL kalır; yalnız İngilizce dolduruyor.

alter table public.ortaokul_mufredat_temalari
  add column if not exists alt_basliklar text[];

comment on column public.ortaokul_mufredat_temalari.alt_basliklar is
  'Temanın içindeki konu başlıkları. Numaralı öğrenme çıktısı olmayan programlar için (İngilizce); diğer derslerde NULL, ayrıntı ortaokul_mufredat_kazanimlari''nda.';
