-- Kullanıcı istekleri (02.10.2026):
--  1) "bilgisayar bilişim tek bir branş (birleşsin)"
--  2) "okul yapısı kurulurken yurtlu ve yurtsuz seçeneği ile yurtsuz kurum
--     dahilindeki kullanıcıların yurtlu kurum içeriklerinin gereksiz
--     görüntülenmesi önlensin"

-- ---------- 1) Bilişim / Bilgisayar tek branş ----------
--
-- OKUL_OZEL_BRANSLARI'nda "Bilişim" ve "Bilgisayar" ayrı duruyordu; aynı işi
-- yapan öğretmen iki ayrı branş gibi görünüyordu. Tek ada indiriliyor:
-- "Bilişim Teknolojileri" — MEB'in adı ve ORTAOKUL_BRANSLARI'nda da aynı
-- metin, böylece lise/ortaokul arasında da bölünmüyor (aynı ilke Türkçe
-- için de uygulanmıştı).
--
-- Canlı veride yalnız 1 satır "Bilişim", 0 satır "Bilgisayar" (02.10.2026).

update public.teachers
set brans = 'Bilişim Teknolojileri'
where brans in ('Bilişim', 'Bilgisayar');

update public.ogretmen_dersleri
set ders = 'Bilişim Teknolojileri'
where ders in ('Bilişim', 'Bilgisayar');

update public.ogretmen_ders_programi
set ders = 'Bilişim Teknolojileri'
where ders in ('Bilişim', 'Bilgisayar');

-- ---------- 2) Yurtlu kurum ----------
--
-- Yurt içeriği (yurt nöbeti, yurt öğrencisi işareti, nöbet devri, nöbet PDF
-- yükleme) şimdiye kadar BÜTÜN okullarda görünüyordu. Canlıda 8 kurumdan
-- yalnız 1'inin yurdu var; kalan 7'si bu alanları boşuna görüyordu.
--
-- Varsayılan FALSE ama aşağıdaki geri doldurma mevcut veriye bakıyor:
-- yurt öğrencisi ya da yurt nöbeti olan kurum yurtlu işaretlenir, böylece
-- gerçekten yurdu olan kurumda hiçbir şey kaybolmaz.
--
-- Dershanede yurt kavramı yok; seçenek formda yalnız okul türünde sunulur
-- (kod tarafı), kolon yine de tüm kurumlarda var çünkü dershane → okul
-- dönüşümü mümkün.

alter table public.schools
  add column if not exists yurtlu boolean not null default false;

comment on column public.schools.yurtlu is
  'Kurumun yurdu var mı. false ise yurt nöbeti / yurt öğrencisi / nöbet devri arayüzleri hiç gösterilmez.';

update public.schools sc
set yurtlu = true
where sc.yurtlu = false
  and (
    exists (select 1 from public.students s where s.school_id = sc.id and s.yurt_ogrencisi)
    or exists (
      select 1 from public.ogretmen_yurt_nobeti n
      join public.teachers t on t.id = n.teacher_id
      where t.school_id = sc.id
    )
    or exists (
      select 1 from public.yurt_nobet_gorevleri g
      join public.teachers t on t.id = g.teacher_id
      where t.school_id = sc.id
    )
  );
