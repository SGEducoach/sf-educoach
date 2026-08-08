-- Gerçek bug: migration 0023, resolve_ogrenci_email(p_school_id uuid,
-- p_okul_no text) (okul-bazlı, çok okullu giriş için) fonksiyonunu
-- eklemişti — ama canlı veritabanında hiç oluşmamış görünüyor (muhtemelen
-- o migration'ın "must be owner of function" hatalarıyla boğuştuğumuz
-- kısmında bu CREATE FUNCTION satırı sessizce atlanmış). Sonuç: login
-- formu her zaman bu 2 parametreli fonksiyonu çağırıyordu ama PostgREST'in
-- şema önbelleğinde SADECE eski 1 parametreli (okul-bağımsız) sürüm vardı
-- — yani okul seçilerek yapılan HİÇBİR öğrenci girişi çalışmıyordu
-- ("Bu okul numarasıyla kayıtlı bir öğrenci bulunamadı" hatası).
--
-- Bu migration eksik fonksiyonu (yeniden) oluşturuyor. Aynı imza daha önce
-- hiç var olmadığı için CREATE OR REPLACE güvenli.
create or replace function public.resolve_ogrenci_email(p_school_id uuid, p_okul_no text)
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
