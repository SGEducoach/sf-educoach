-- SG EduCoach — öğretmen yetki ayrımı:
-- - Sınıf öğretmeni (teachers.class_id eşleşen): kendi sınıfında işlem
--   yapabilir (veli onayı, ileride görev/değerlendirme).
-- - Diğer öğretmenler: herhangi bir sınıfı seçip SADECE görüntüleyebilir
--   (yazma/onaylama yetkisi yok).

create or replace function public.is_ogretmen()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'ogretmen');
$$;

revoke all on function public.is_ogretmen() from public;
grant execute on function public.is_ogretmen() to authenticated;

-- Herhangi bir öğretmen, herhangi bir öğrencinin profilini/verisini görebilsin
-- (mevcut has_student_access politikaları -kendi sınıfı, kendisi, velisi-
-- olduğu gibi kalıyor; bu ek politikalar sadece "her öğretmen her şeyi
-- okuyabilir" kuralını OR olarak ekliyor).
create policy "profiles_select_any_teacher" on public.profiles
  for select using (public.is_ogretmen());

create policy "students_select_any_teacher" on public.students
  for select using (public.is_ogretmen());

create policy "konu_calismalar_select_any_teacher" on public.konu_calismalar
  for select using (public.is_ogretmen());

create policy "soru_cozumleri_select_any_teacher" on public.soru_cozumleri
  for select using (public.is_ogretmen());

create policy "denemeler_select_any_teacher" on public.denemeler
  for select using (public.is_ogretmen());

create policy "deneme_ders_sonuclari_select_any_teacher" on public.deneme_ders_sonuclari
  for select using (public.is_ogretmen());

create policy "haftalik_verimlilikler_select_any_teacher" on public.haftalik_verimlilikler
  for select using (public.is_ogretmen());

-- classes tablosu zaten herkese açıktı (classes_select_all), değişiklik yok.
-- veli_talep_onayla RPC'si zaten sadece ilgili sınıfın öğretmenine izin
-- veriyordu (class_id eşleşmesi kontrolü) — değişiklik gerekmiyor.
