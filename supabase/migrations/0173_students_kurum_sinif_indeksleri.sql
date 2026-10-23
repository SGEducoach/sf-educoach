-- Faz 1 · Adım 2 (23.10.2026): students(school_id) ve students(class_id)
-- indeksleri. Rehber takip/kapsam, sınıf analizi, kohort sorguları ve
-- kurum sınırı RLS yardımcıları (0114) bu kolonlarla süzüyor; depodaki
-- migration'larda bu kolonlara indeks bulunmadı (FAZ1_KESIF_RAPORU B7).
--
-- ÖNCE canlıda kontrol: select indexname, indexdef from pg_indexes
--   where schemaname = 'public' and tablename = 'students';
-- Aynı kolonda farklı adla indeks varsa bu dosya uygulanmamalı.
--
-- Not: SQL Editor deyimleri tek işlemde çalıştırır; "concurrently" işlem
-- içinde çalışmaz. students tablosu küçük olduğundan kısa süreli yazma
-- kilidi kabul edilir. Geri alma:
--   drop index if exists public.students_school_id_idx;
--   drop index if exists public.students_class_id_idx;
create index if not exists students_school_id_idx on public.students (school_id);
create index if not exists students_class_id_idx on public.students (class_id);
