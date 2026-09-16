-- 23.00–01.00 gibi ertesi güne taşan öğrenci çalışmalarına izin ver.
-- Aynı başlangıç/bitiş saati sıfır süre olduğu için geçersiz kalır.
alter table public.gorevler drop constraint if exists gorevler_saat_sirali;
alter table public.gorevler add constraint gorevler_saat_sirali check (
  baslangic_saat is null or bitis_saat is null or bitis_saat <> baslangic_saat
);
