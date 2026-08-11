-- 9 ve 10. sınıf ekleme senaryosu (Senaryo A + Branş Denemesi) — 9-10
-- öğrencilerinde TYT/AYT yerine "Branş Denemesi" (Türk Dili ve Edebiyatı /
-- Sosyal Bilimler / Matematik / Fen Bilimleri, her biri 30 soru) kullanılacak.
-- deneme_turu enum'una yeni değer ekleniyor.
--
-- ÖNEMLİ: Postgres'te enum'a değer ekleme aynı transaction içinde hemen
-- kullanılamaz (migration 0013/0014'te de aynı sebeple ayrı çalıştırılmıştı).
-- Bu dosyayı SQL Editor'de TEK BAŞINA, sonraki migration'lardan (0042 vb.)
-- AYRI bir çalıştırmada uygulayın.
alter type public.deneme_turu add value if not exists 'BRANS';
