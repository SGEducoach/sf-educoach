-- Ortaokul panelini lise izlerinden arındırma, O2 — 1/2 (kullanıcı kararı
-- 08.10.2026: "deneme kavramı olacak").
--
-- deneme_turu enum'u TYT, AYT, BRANS idi — LGS YOKTU. Yani ortaokul
-- öğrencisinin denemesi girilirse TYT ya da AYT etiketi almak ZORUNDAYDI.
-- Şema lise varsayımını veriye dayatıyordu.
--
-- NEDEN AYRI MIGRATION: PostgreSQL'de ALTER TYPE ... ADD VALUE ile eklenen
-- değer AYNI TRANSACTION içinde KULLANILAMAZ ("unsafe use of new value").
-- Bu yüzden enum değeri tek başına burada eklenir, onu kullanan her şey
-- (kısıt, backfill, politika) 0148'e bırakılır.

alter type public.deneme_turu add value if not exists 'LGS';
