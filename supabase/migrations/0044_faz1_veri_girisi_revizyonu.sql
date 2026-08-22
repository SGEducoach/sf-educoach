-- Faz 1 (yenilikler_1.txt): veri giriş formları revizyonu.
--
-- - Yayınevi: konu_calismalar / soru_cozumleri / denemeler'e serbest metin,
--   ZORUNLU alan (kullanıcı kararı — sabit liste değil, boş bırakılamaz).
--   Mevcut kayıtlar "Belirtilmedi" ile dolduruluyor, sonra NOT NULL.
-- - soru_cozumleri: bos (boş sayısı), konu, kaynak eklendi. "Soru çözüm
--   sayım" (Az/Orta/Çok self-rating) formdan kaldırıldığı için bu tablodaki
--   hedefe_yakinlik kolonu artık anlamsız kalıyor — drop edildi. Rozet
--   fonksiyonları (ogrenci_soru_seviyesi, bkz. migration 0029) sadece
--   dogru/yanlis toplamını kullanıyor, hedefe_yakinlik'e hiç dokunmuyor —
--   bu drop rozet hesaplamasını etkilemiyor.
-- - denemeler: "süre" alanı formdan kalkıyor; sure_dakika nullable yapıldı
--   (geçmiş veri korunuyor, yeni kayıtlarda artık girilmeyecek).

alter table public.konu_calismalar add column yayinevi text;
update public.konu_calismalar set yayinevi = 'Belirtilmedi' where yayinevi is null;
alter table public.konu_calismalar alter column yayinevi set not null;

alter table public.soru_cozumleri add column yayinevi text;
update public.soru_cozumleri set yayinevi = 'Belirtilmedi' where yayinevi is null;
alter table public.soru_cozumleri alter column yayinevi set not null;

alter table public.soru_cozumleri add column bos integer not null default 0 check (bos >= 0);
alter table public.soru_cozumleri add column konu text;
alter table public.soru_cozumleri add column kaynak text not null default 'ogrenci' check (kaynak in ('ogrenci', 'ogretmen'));
alter table public.soru_cozumleri drop column hedefe_yakinlik;

alter table public.denemeler add column yayinevi text;
update public.denemeler set yayinevi = 'Belirtilmedi' where yayinevi is null;
alter table public.denemeler alter column yayinevi set not null;
alter table public.denemeler alter column sure_dakika drop not null;
