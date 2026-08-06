-- SG EduCoach — admin yetkileri.
-- "Müdür sadece gözlemci, tüm kontrol admin'de" kararı: sınıf ekleme ve
-- sınıf öğretmeni atama yetkisi müdürden alınıp admin'e taşınıyor.
-- NOT: bu dosya 0013'ün (enum'a 'admin' eklenmesi) AYRI bir çalıştırmada
-- commit edilmiş olmasını gerektirir.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- is_ogretmen(): platform geneli okuma erişimi artık admin'i de kapsıyor
-- (teachers tablosunda kaydı olmasa da admin her şeyi görebilmeli).
create or replace function public.is_ogretmen()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.teachers where id = auth.uid())
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Sınıf ekleme: artık sadece admin (müdür değil).
drop policy if exists "classes_insert_mudur" on public.classes;
create policy "classes_insert_admin" on public.classes
  for insert with check (public.is_admin());

-- Sınıf öğretmeni ataması (teachers.class_id güncellemesi): artık sadece admin.
drop policy if exists "teachers_update_mudur" on public.teachers;
create policy "teachers_update_admin" on public.teachers
  for update using (public.is_admin());

-- GERÇEK AÇIK: "teachers_update_own" politikası herkesin KENDİ satırındaki
-- HER alanı (class_id dahil!) değiştirmesine izin veriyordu — yani bugüne
-- kadar herhangi bir öğretmen kendini istediği sınıfa "sınıf öğretmeni"
-- olarak atayabiliyordu (arkadaş testi madde 4'ün asıl kök nedeni).
-- RLS policy'leri kolon bazlı kısıtlama yapamadığı için trigger ile kapatıyoruz:
-- class_id değişikliği, satırın sahibi olsa bile, sadece admin tarafından
-- yapılabilir.
create or replace function public.teachers_class_id_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.class_id is distinct from old.class_id and not public.is_admin() then
    raise exception 'Sınıf öğretmeni ataması sadece yönetici tarafından yapılabilir.';
  end if;
  return new;
end;
$$;

drop trigger if exists teachers_class_id_guard on public.teachers;
create trigger teachers_class_id_guard
  before update on public.teachers
  for each row execute function public.teachers_class_id_guard();
