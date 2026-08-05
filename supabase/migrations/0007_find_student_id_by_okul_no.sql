-- SG EduCoach — giriş yapmamış veli "kod talep et" adımında okul_no ile
-- öğrenci id'sini bulabilsin diye (RLS'i bypass eder, sadece id döner).
create or replace function public.find_student_id_by_okul_no(p_okul_no text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.students where okul_no = p_okul_no limit 1;
$$;

revoke all on function public.find_student_id_by_okul_no(text) from public;
grant execute on function public.find_student_id_by_okul_no(text) to anon, authenticated;
