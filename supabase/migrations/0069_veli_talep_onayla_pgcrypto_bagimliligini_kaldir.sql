-- Migration 0068 (create extension if not exists pgcrypto schema public)
-- YETMEDİ — canlıda tekrar test edildi (gerçek bir öğretmen JWT'siyle RPC
-- doğrudan çağrıldı), "function gen_random_bytes(integer) does not exist"
-- hatası AYNEN devam ediyor. En olası açıklama: pgcrypto zaten Supabase
-- tarafından farklı bir şemaya (muhtemelen "extensions") kurulmuş
-- durumdaydı — "if not exists" bunu görüp hiçbir şey yapmadı, "schema
-- public" isteğimiz yok sayıldı; fonksiyon search_path=public olduğundan
-- gen_random_bytes'ı hâlâ bulamıyor.
--
-- Kalıcı ve sağlam çözüm: pgcrypto'ya HİÇ ihtiyaç duymamak. gen_random_uuid()
-- PostgreSQL 13+ çekirdeğinde yerleşik (bu proje zaten HER YERDE id
-- üretmek için bunu kullanıyor, hiçbir eklenti gerektirmiyor) — ondan
-- aynı uzunlukta (12 hex karakter = eski 6 byte'ın aynısı) rastgele bir
-- kod türetiyoruz. Hangi şemada hangi eklenti kurulu olursa olsun çalışır.
create or replace function public.veli_talep_onayla(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kod text;
  v_guncellendi uuid;
begin
  if not exists (
    select 1
    from public.veli_link_requests r
    join public.students s on s.id = r.student_id
    join public.teachers t on t.class_id = s.class_id
    where r.id = p_request_id and r.durum = 'bekliyor' and t.id = auth.uid()
  ) then
    raise exception 'Bu talep bulunamadı, daha önce işlendi veya onaylama yetkiniz yok.';
  end if;

  v_kod := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  update public.veli_link_requests
  set durum = 'onaylandi',
      kod = v_kod,
      onaylayan_ogretmen_id = auth.uid(),
      onaylanma_at = now(),
      kod_expires_at = now() + interval '48 hours'
  where id = p_request_id and durum = 'bekliyor'
  returning id into v_guncellendi;

  if v_guncellendi is null then
    raise exception 'Talep daha önce işlenmiş.';
  end if;

  return v_kod;
end;
$$;
