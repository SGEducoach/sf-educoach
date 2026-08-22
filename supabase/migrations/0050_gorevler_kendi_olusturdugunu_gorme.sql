-- Hotfix: öğrenci kendi planını eklerken "new row violates row-level
-- security policy for table gorevler" hatası alıyordu.
--
-- Kök neden: supabase-js'teki .insert(...).select("id").single() bir
-- "INSERT ... RETURNING" — RETURNING'in çalışması için Postgres, eklenen
-- satırın SELECT policy'sine göre de görünür olmasını istiyor. Öğretmen
-- görevinde bu sorun yoktu çünkü gorevler_select_related zaten
-- "olusturan_ogretmen_id = auth.uid()" ile kendi oluşturduğunu direkt
-- görebiliyordu. Ama öğrenci planında böyle bir kendi-oluşturduğunu-görme
-- kuralı YOKTU — sadece gorev_ilgili_mi() (gorev_atamalari'nda bir kayıt
-- var mı) kontrol ediliyordu, o kayıt ise henüz eklenmemişti (gorevler
-- insert edilip DÖNDÜKTEN sonra gorev_atamalari ekleniyor) — bu yüzden
-- RETURNING anında satır görünmüyor, INSERT "başarısız" gibi görünüyordu.
drop policy if exists "gorevler_select_related" on public.gorevler;
create policy "gorevler_select_related" on public.gorevler
  for select using (
    olusturan_ogretmen_id = auth.uid()
    or olusturan_ogrenci_id = auth.uid()
    or public.gorev_ilgili_mi(id)
  );
