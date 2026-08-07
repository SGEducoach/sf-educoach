-- KRİTİK DÜZELTME: okul_no sadece okul içinde benzersiz (unique(school_id,
-- okul_no)) ama giriş/talep akışlarındaki RPC'ler okul_no'yu OKUL AYRIMI
-- OLMADAN aramıyordu. Tek okul varken sorun yaratmıyordu; birden fazla okul
-- olunca (artık admin panelinden çoklu okul ekleniyor) aynı okul no'ya sahip
-- iki farklı okuldaki öğrenci birbirine karışabiliyor / giriş yapamıyordu.
-- Üç RPC de artık p_school_id parametresi alıyor ve ona göre filtreliyor.

drop function if exists public.resolve_ogrenci_email(text);
create function public.resolve_ogrenci_email(p_school_id uuid, p_okul_no text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.email
  from public.students s
  join public.profiles p on p.id = s.id
  where s.school_id = p_school_id and s.okul_no = p_okul_no
  limit 1;
$$;

revoke all on function public.resolve_ogrenci_email(uuid, text) from public;
grant execute on function public.resolve_ogrenci_email(uuid, text) to anon, authenticated;

drop function if exists public.resolve_veli_login(text, text);
create function public.resolve_veli_login(p_school_id uuid, p_okul_no text, p_kod text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select 'veli+' || r.id::text || '@sgeducoach.internal'
  from public.veli_link_requests r
  join public.students s on s.id = r.student_id
  where s.school_id = p_school_id
    and s.okul_no = p_okul_no
    and r.kod = p_kod
    and r.durum in ('onaylandi', 'kullanildi')
  limit 1;
$$;

revoke all on function public.resolve_veli_login(uuid, text, text) from public;
grant execute on function public.resolve_veli_login(uuid, text, text) to anon, authenticated;

drop function if exists public.find_student_id_by_okul_no(text);
create function public.find_student_id_by_okul_no(p_school_id uuid, p_okul_no text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.students where school_id = p_school_id and okul_no = p_okul_no limit 1;
$$;

revoke all on function public.find_student_id_by_okul_no(uuid, text) from public;
grant execute on function public.find_student_id_by_okul_no(uuid, text) to anon, authenticated;
