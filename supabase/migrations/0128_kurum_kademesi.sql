-- Kurum kademesi — Ortaokul Paneli.
--
-- Kullanıcı bildirimi (01.10.2026): "okul eklede ortaokul özelliği yok, lise
-- gibi açılıyor yeni okul". Doğru: sınıf seviyeleri kodda 9-12'ye sabitliydi,
-- ortaokul sınıfı hiç oluşturulamıyordu.
--
-- Not: öğrencinin panelinin hangi kademeye göre çizileceği DEĞİŞMEDİ, o hâlâ
-- `classes.seviye`den türetiliyor (bkz. src/lib/kademe.ts). Bu kolon yalnızca
-- kurumun hangi sınıf seviyelerini AÇABİLECEĞİNİ belirler: yönetici "ortaokul"
-- seçmedikçe 5-8 seçenekleri hiç görünmez, yanlışlıkla 5. sınıf açılmaz.
--
-- Varsayılan 'lise': mevcut 6 kurumun hepsi bugünkü davranışını aynen sürdürür.

alter table public.schools
  add column if not exists kademe text not null default 'lise'
  check (kademe in ('lise', 'ortaokul', 'ikisi'));

comment on column public.schools.kademe is
  'Kurumun barındırdığı kademe(ler): lise | ortaokul | ikisi. Sınıf ekleme formundaki seviye seçeneklerini belirler; öğrenci panelinin kademesi classes.seviye''den türetilir.';

-- classes.seviye 9-12'ye kilitliydi: ortaokul sınıfı veritabanı düzeyinde de
-- açılamıyordu (geri alınan bir testte yakalandı). 5-8 ekleniyor.
alter table public.classes drop constraint if exists classes_seviye_check;
alter table public.classes
  add constraint classes_seviye_check
  check (seviye = any (array['5','6','7','8','9','10','11','12']));
