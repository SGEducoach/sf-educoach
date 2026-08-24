-- Analiz Motoru Faz A4 — Katman 5 (hedefe uzaklık/projeksiyon).
-- Bkz. "Analiz Motoru" raporu (artifact, 24.08.2026) + kullanıcının açık
-- soru 1 kararı (25.08.2026): "sisteme en faydalı inisiyatifi al" —
-- hedef net alanını ÖĞRENCİ KENDİ girer, hedef_bolum deseniyle tutarlı
-- olarak admin de düzeltebilir.
--
-- TYT ve AYT AYRI tutuluyor (tek "hedef net" yetmez): ikisi farklı
-- ölçekte puanlanıyor (TYT azami ~120, AYT alana göre değişiyor) ve
-- ayrı ayrı deneme trendleri var (bkz. Faz A2, denemeTrend.tur).
alter table public.students add column if not exists hedef_net_tyt numeric;
alter table public.students add column if not exists hedef_net_ayt numeric;

alter table public.students drop constraint if exists students_hedef_net_tyt_araligi;
alter table public.students
  add constraint students_hedef_net_tyt_araligi check (hedef_net_tyt is null or (hedef_net_tyt >= 0 and hedef_net_tyt <= 120));

alter table public.students drop constraint if exists students_hedef_net_ayt_araligi;
alter table public.students
  add constraint students_hedef_net_ayt_araligi check (hedef_net_ayt is null or (hedef_net_ayt >= 0 and hedef_net_ayt <= 160));

comment on column public.students.hedef_net_tyt is
  'Öğrencinin kendi belirlediği TYT hedef net puanı — Analiz Motoru Faz A4 (hedefe uzaklık/projeksiyon) için. Nullable: girilmemişse o katman devre dışı kalır.';
comment on column public.students.hedef_net_ayt is
  'Öğrencinin kendi belirlediği AYT hedef net puanı — Analiz Motoru Faz A4 için. Nullable.';

-- Öğrenci kendi hedef_net_tyt/hedef_net_ayt alanlarını güncelleyebilsin
-- diye (mevcut students UPDATE RLS politikaları zaten öğrencinin kendi
-- satırını genel olarak güncellemesine izin veriyorsa ek bir politika
-- GEREKMEZ — bu proje boyunca öğrenciler zaten kendi ayt_alan/hedef_bolum
-- gibi alanlarını benzer şekilde güncelleyebiliyor, aynı politika bu yeni
-- sütunları da otomatik kapsar). Bu migration'da RLS'e DOKUNULMUYOR.
