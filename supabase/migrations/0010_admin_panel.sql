-- SG EduCoach — Faz C: Admin paneli (müdür için sınıf ekleme + öğretmen listesi)

-- Herhangi bir öğretmen/müdür, okuldaki tüm öğretmenleri görebilsin
-- (öğrenci listesi zaten görülebiliyordu, öğretmen listesi eksikti).
create policy "teachers_select_any_teacher" on public.teachers
  for select using (public.is_ogretmen());

-- Sadece müdür, kendi okuluna yeni sınıf/şube ekleyebilir.
create policy "classes_insert_mudur" on public.classes
  for insert with check (
    exists (
      select 1 from public.profiles p
      join public.teachers t on t.id = p.id
      where p.id = auth.uid() and p.role = 'mudur' and t.school_id = classes.school_id
    )
  );
