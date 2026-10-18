-- Cinsiyet bilgisi (kullanıcı kararı 18.10.2026): yurt listesi kartlarında
-- kız öğrencilerin listesini kadın, erkek öğrencilerinkini erkek
-- öğretmenler hazırlar (bkz. src/lib/yurt-listesi.ts). Bilgiyi kurum müdürü
-- girer; yazma yalnız sunucuda service-role ile ve müdür doğrulandıktan
-- sonra yapılır (yurt-cinsiyet-actions.ts), bu yüzden yeni politika yok.
--
-- Yurt listesi resmî öğrenci listesinden (ön kayıt) geldiği için cinsiyet
-- oraya da yazılır: sisteme henüz girmemiş yurt öğrencisi de listede görünür.

alter table public.resmi_ogrenci_listesi add column if not exists cinsiyet text
  check (cinsiyet in ('kiz', 'erkek'));
alter table public.students add column if not exists cinsiyet text
  check (cinsiyet in ('kiz', 'erkek'));
alter table public.teachers add column if not exists cinsiyet text
  check (cinsiyet in ('kadin', 'erkek'));

comment on column public.resmi_ogrenci_listesi.cinsiyet is 'kiz | erkek — yurt listesi kartlarında kız/erkek ayrımı.';
comment on column public.students.cinsiyet is 'kiz | erkek — resmî listede kaydı olmayan öğrenci için.';
comment on column public.teachers.cinsiyet is 'kadin | erkek — öğretmen yalnız kendi grubunun yurt listesini hazırlar.';
