-- Faz 1 (yenilikler_1.txt): veri giriş formları revizyonu.
--
-- - Yayınevi: konu_calismalar / soru_cozumleri / denemeler'e serbest metin,
--   ZORUNLU alan (kullanıcı kararı — sabit liste değil, boş bırakılamaz).
--   Tek adımda "not null default" ile ekleniyor (Postgres 11+ metadata-only
--   fast path) — ayrı bir UPDATE ile dolduysaydı, eski (3/7 günden daha
--   geriye tarihli) satırlar konu_calismalar_gecmis_sinir /
--   soru_cozumleri_gecmis_sinir / benzeri check constraint'lere takılırdı
--   (Postgres, UPDATE'te değişmeyen kolonlar dahil TÜM satırı yeniden
--   doğruluyor). Tek adımlık ADD COLUMN DEFAULT bunu tetiklemiyor.
-- - soru_cozumleri: bos (boş sayısı), konu, kaynak eklendi. "Soru çözüm
--   sayım" (Az/Orta/Çok self-rating) formdan kaldırıldığı için bu tablodaki
--   hedefe_yakinlik kolonu artık anlamsız kalıyor — drop edildi. Rozet
--   fonksiyonları (ogrenci_soru_seviyesi, bkz. migration 0029) sadece
--   dogru/yanlis toplamını kullanıyor, hedefe_yakinlik'e hiç dokunmuyor —
--   bu drop rozet hesaplamasını etkilemiyor.
-- - denemeler: "süre" alanı formdan kalkıyor; sure_dakika nullable yapıldı
--   (geçmiş veri korunuyor, yeni kayıtlarda artık girilmeyecek — bu da
--   sadece kolon tipini/null iznini değiştirdiği, satırı UPDATE etmediği
--   için check constraint'i tetiklemiyor).

alter table public.konu_calismalar add column yayinevi text not null default 'Belirtilmedi';
alter table public.soru_cozumleri add column yayinevi text not null default 'Belirtilmedi';
alter table public.denemeler add column yayinevi text not null default 'Belirtilmedi';

alter table public.soru_cozumleri add column bos integer not null default 0 check (bos >= 0);
alter table public.soru_cozumleri add column konu text;
alter table public.soru_cozumleri add column kaynak text not null default 'ogrenci' check (kaynak in ('ogrenci', 'ogretmen'));
alter table public.soru_cozumleri drop column hedefe_yakinlik;

alter table public.denemeler alter column sure_dakika drop not null;
