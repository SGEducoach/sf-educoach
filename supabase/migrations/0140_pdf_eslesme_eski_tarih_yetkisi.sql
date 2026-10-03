-- PDF sonuçlarını admin veya dershane moderatörü eşleştirirken 7 günlük
-- deneme giriş sınırı uygulanmaz. Müdür ve öğrenci girişleri aynı sınırda kalır.
-- Yalnızca sunucudaki service-role istemcisi bu fonksiyonu çağırabilir.

create or replace function public.gecmis_tarih_sinir_kontrol()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sinir_gun integer := TG_ARGV[0]::integer;
begin
  if public.hesap_senkron_aktif() then
    return new;
  end if;

  -- İşlem-yerel işaret yalnızca aşağıdaki yetki denetimli fonksiyonda açılır.
  if TG_TABLE_NAME = 'denemeler'
     and new.kaynak = 'ogretmen'
     and auth.role() = 'service_role'
     and coalesce(current_setting('sefu.pdf_eslesme', true), '') = 'on' then
    return new;
  end if;

  if new.giren_rehber_id is not null then
    if auth.uid() is not null then
      raise exception 'Rehber girişi yalnızca rehberlik servisi ekranından yapılabilir.';
    end if;
    v_sinir_gun := 30;
  elsif new.gorev_atama_id is not null and exists (
    select 1 from public.gorev_atamalari a
    where a.id = new.gorev_atama_id and a.student_id = new.student_id
  ) then
    v_sinir_gun := greatest(v_sinir_gun, 5);
  end if;

  if new.tarih < current_date - v_sinir_gun then
    raise exception 'En fazla % gün geriye dönük giriş yapılabilir.', v_sinir_gun;
  end if;
  return new;
end;
$$;

create or replace function public.pdf_deneme_eski_tarih_olustur(
  p_actor_id uuid,
  p_student_id uuid,
  p_tarih date,
  p_tur public.deneme_turu,
  p_yayinevi text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_role text;
  v_admin boolean;
  v_moderator boolean;
  v_mudur boolean;
  v_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Bu işlem yalnızca kurum sunucusundan yapılabilir.';
  end if;

  select school_id into v_school_id from public.students where id = p_student_id;
  select role into v_role from public.profiles where id = p_actor_id and aktif;
  if v_school_id is null or v_role is null then
    raise exception 'Öğrenci veya yetkili kullanıcı bulunamadı.';
  end if;

  v_admin := v_role = 'admin';
  v_moderator := v_role = 'ogretmen' and exists (
    select 1 from public.school_moderators m
    where m.profile_id = p_actor_id and m.school_id = v_school_id
  );
  v_mudur := v_role = 'mudur' and exists (
    select 1 from public.teachers t
    where t.id = p_actor_id and t.school_id = v_school_id
  );
  if not (v_admin or v_moderator or v_mudur) then
    raise exception 'Bu öğrenci için PDF sonucu kaydetme yetkiniz yok.';
  end if;
  if p_tarih < current_date - 7 and not (v_admin or v_moderator) then
    raise exception 'En fazla 7 gün geriye dönük giriş yapılabilir.';
  end if;

  if p_tarih < current_date - 7 then
    perform set_config('sefu.pdf_eslesme', 'on', true);
  end if;
  insert into public.denemeler
    (student_id, tarih, tur, kaynak, hedefe_yakinlik, zorluk, yayinevi)
  values
    (p_student_id, p_tarih, p_tur, 'ogretmen', 'belirsiz', 'orta', p_yayinevi)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.pdf_deneme_eski_tarih_olustur(uuid, uuid, date, public.deneme_turu, text)
  from public, anon, authenticated;
grant execute on function public.pdf_deneme_eski_tarih_olustur(uuid, uuid, date, public.deneme_turu, text)
  to service_role;
