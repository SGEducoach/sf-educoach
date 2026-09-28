-- Soru çözümü süre üst sınırı: boş sorular da sayılsın.
--
-- Öğrenci hatası (28.09.2026): 9 doğru + 0 yanlış + 3 boş girip 20 dakika
-- yazan öğrenciye ham veritabanı mesajı düştü:
--   new row for relation "soru_cozumleri" violates check constraint
--   "soru_cozumleri_sure_ust_sinir"
--
-- Sebep: uygulama katmanı (veri-actions.ts, rehber-ogrenci-actions.ts ve
-- formun kendisi) sınırı TOPLAM soru (doğru + yanlış + BOŞ) üzerinden
-- hesaplarken 0028'de eklenen kısıt boş soruları saymıyordu. Öğrenciye
-- "en fazla 24 dakika" yazılıp 18 dakikada reddediliyordu. Boş bırakılan
-- soru da okunup düşünüldüğü için süreden sayılır — ürün kuralı uygulama
-- tarafındaki hesaptır, kısıt ona hizalanıyor.
--
-- 0028'deki gibi NOT VALID: eski satırlar yeniden doğrulanmaz (yeni kural
-- daha geniş olduğu için zaten hepsi geçerli, tam tablo kilidi gereksiz).

alter table public.soru_cozumleri
  drop constraint if exists soru_cozumleri_sure_ust_sinir;
alter table public.soru_cozumleri
  add constraint soru_cozumleri_sure_ust_sinir
  check (sure_dakika <= 2 * (dogru + yanlis + bos)) not valid;
