-- Kurum moderatörü sınıf öğretmeni atayabilsin (kullanıcı isteği 03.10.2026:
-- moderatör menüsünde "sınıf öğretmeni tanımlama").
--
-- teachers_class_id_guard (0014) yalnızca public.is_admin() ile yöneticiyi
-- muaf tutuyordu. is_admin() auth.uid()'e bakar; moderatör işlemleri ise
-- sunucuda SERVICE-ROLE client'la çalışır (auth.uid() boş) ve yetki
-- kontrolü uygulama katmanında, requireModerator() + "öğretmen ve sınıf bu
-- kurumda mı" doğrulamasıyla yapılır (bkz. src/app/moderator/actions.ts
-- moderatorSinifOgretmeniAta). Aynı muafiyet 0075'te students_transfer_guard
-- için yapıldı. Öğretmenin KENDİ oturumuyla (auth.role() = 'authenticated')
-- class_id değiştirmesi hâlâ engelli.
create or replace function public.teachers_class_id_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.class_id is distinct from old.class_id
     and not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Sınıf öğretmeni ataması sadece yönetici tarafından yapılabilir.';
  end if;
  return new;
end;
$$;
