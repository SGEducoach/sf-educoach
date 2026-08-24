-- Faz H düzeltmesi (devam) — öğrenci kullanıcılar Konu Hakimiyeti
-- ekranından kaydet'e bastığında "new row violates row-level security
-- policy for table \"ogrenci_konu_hakimiyeti\"" hatası alıyordu.
--
-- Tanı: servis rolüyle yapılan kontrolde tablonun var olduğu ama
-- HİÇ satır içermediği görüldü — yani şimdiye kadar hiçbir öğrenci
-- başarıyla kayıt yapamamış. En olası neden: migration 0055 SQL
-- Editor'da TEK bir script olarak çalıştırıldığında, dosyanın SONUNDAKİ
-- "create or replace function public.konu_zayiflik_raporu(...)"
-- ifadesi (8→11 sütuna dönüş tipi değişikliği) muhtemelen O ZAMAN DA
-- "cannot change return type of existing function" hatası vermiş
-- olabilir (bkz. migration 0058) — Postgres, tek bir SQL Editor
-- çalıştırmasındaki BÜTÜN ifadeleri tek bir örtük işlem (transaction)
-- içinde yürütür; sondaki ifade hata verirse ÖNCEKİ ifadeler
-- (tablo/RLS/politikalar dahil) de geri alınmış olabilir. Tablonun
-- şu an var olması, muhtemelen daha sonra ayrı bir denemeyle (veya
-- kısmi bir çalıştırmayla) oluştuğunu, ama RLS politikalarının hiç
-- kalıcı olmadığını düşündürüyor.
--
-- Düzeltme: hem RLS'nin açık olduğunu hem iki politikanın da doğru
-- tanımlı olduğunu GÜVENCEYE ALIYORUZ — "drop policy if exists" +
-- "create policy" olduğu için birden çok kez çalıştırılsa da güvenli
-- (idempotent). İçerik migration 0055'tekiyle birebir aynı.
alter table public.ogrenci_konu_hakimiyeti enable row level security;

drop policy if exists "ogrenci_konu_hakimiyeti_select" on public.ogrenci_konu_hakimiyeti;
create policy "ogrenci_konu_hakimiyeti_select" on public.ogrenci_konu_hakimiyeti
  for select using (public.has_student_access(student_id));

drop policy if exists "ogrenci_konu_hakimiyeti_write" on public.ogrenci_konu_hakimiyeti;
create policy "ogrenci_konu_hakimiyeti_write" on public.ogrenci_konu_hakimiyeti
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
