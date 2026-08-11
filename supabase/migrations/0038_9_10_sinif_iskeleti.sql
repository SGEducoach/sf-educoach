-- 9 ve 10. sınıfların sisteme eklenebilmesi için temel seviye iskeleti.
-- Mevcut 11 ve 12. sınıf kayıtlarını değiştirmez.

alter table public.classes
  drop constraint if exists classes_seviye_check;

alter table public.classes
  add constraint classes_seviye_check
  check (seviye in ('9', '10', '11', '12'));
