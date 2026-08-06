-- SG EduCoach — arkadaş testi bulguları: format kısıtları + sınıf öğretmeni
-- atamasının müdüre taşınması.
-- NOT VALID kullanıyoruz ki mevcut (test aşamasında girilmiş, formatı bozuk
-- olabilecek) satırlar migration'ı patlatmasın; sadece BUNDAN SONRAKİ
-- insert/update'lerde kural uygulanır.

-- 5) okul_no: sadece rakam, en fazla 5 hane
alter table public.students
  add constraint students_okul_no_format check (okul_no ~ '^[0-9]{1,5}$') not valid;

-- 2) telefon: sadece rakam, 10-11 hane (profiles.telefon nullable olduğu için boşsa serbest)
alter table public.profiles
  add constraint profiles_telefon_format check (telefon is null or telefon ~ '^[0-9]{10,11}$') not valid;

alter table public.veli_link_requests
  add constraint veli_link_requests_telefon_format check (veli_telefon ~ '^[0-9]{10,11}$') not valid;

-- 4/8) Sınıf öğretmeni ataması sadece müdür yapabilsin, bir sınıfa birden
-- fazla sınıf öğretmeni atanamasın.
create unique index if not exists teachers_class_id_unique on public.teachers (class_id) where class_id is not null;

create policy "teachers_update_mudur" on public.teachers
  for update using (
    exists (
      select 1 from public.profiles p
      join public.teachers t on t.id = p.id
      where p.id = auth.uid() and p.role = 'mudur' and t.school_id = teachers.school_id
    )
  );
