-- Öğrenci analizindeki Konu Hakimiyeti grafiği için öğretmen/müdür okuma izni.
-- 0055/0059 yalnızca öğrencinin kendisini, bağlı velisini ve sınıf
-- öğretmenini kapsıyordu. Diğer öğretmenler ve class_id'si olmayan müdürler
-- kayıtları okuyamadığından grafik işaretlenmemiş konular gösteriyordu.
-- Diğer analiz tablolarındaki 0008 okuma politikasıyla aynı kapsam:
-- is_ogretmen(), 0009/0014 itibarıyla müdür ve admin'i de kapsar.
-- Öğrencinin kendi kaydını yazma ve bağlı velinin okuma izinleri değişmez.

drop policy if exists "ogrenci_konu_hakimiyeti_select_any_teacher"
  on public.ogrenci_konu_hakimiyeti;
create policy "ogrenci_konu_hakimiyeti_select_any_teacher"
  on public.ogrenci_konu_hakimiyeti
  for select to authenticated
  using (public.is_ogretmen());
