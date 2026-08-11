-- İzinli öğrenci listesi (migration 0026, ad eşleme mantığı 0034'te
-- güncellendi) okul bazında kontrol ediyordu: bir okulda liste yüklüyse
-- (o listede bugüne kadar hep 11-12. sınıf isimleri vardı) TÜM self-signup
-- kayıtları o listeye göre denetleniyordu — 9 ve 10. sınıf için henüz liste
-- hazırlanmadığından bu, 9-10 öğrencisinin kaydını reddediyordu.
-- Şimdilik 9 ve 10. sınıf kayıtları bu kontrolden muaf tutuluyor; ileride
-- 9-10 için de liste hazırlanınca aynı mekanizmaya tabi tutulacak şekilde
-- (v_class_seviye not in ('9','10') koşulu kaldırılarak) geri alınabilir.
--
-- Fonksiyonun geri kalanı (ad eşleme mantığı, gecici_sifre vb.) migration
-- 0034/0027'deki hâliyle AYNEN korunuyor — sadece bu muafiyet eklendi.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := coalesce(new.raw_user_meta_data->>'role', 'ogrenci')::public.user_role;
  v_request record;
  v_school_id uuid;
  v_class_seviye text;
  v_girilen_ad text := coalesce(new.raw_user_meta_data->>'ad', new.email);
  v_profile_ad text;
  v_izinli_ad text;
  v_admin_ekledi boolean := coalesce((new.raw_user_meta_data->>'admin_ekledi')::boolean, false);
  v_gecici_sifre boolean := coalesce((new.raw_user_meta_data->>'gecici_sifre')::boolean, false);
begin
  v_profile_ad := public.ad_baslik(v_girilen_ad);

  if v_role = 'ogrenci' then
    v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;
    select seviye into v_class_seviye from public.classes where id = (new.raw_user_meta_data->>'class_id')::uuid;

    if not v_admin_ekledi and coalesce(v_class_seviye not in ('9', '10'), true) and exists (
      select 1 from public.izinli_ogrenciler where school_id = v_school_id
    ) then
      select io.ad_soyad into v_izinli_ad
      from public.izinli_ogrenciler io
      cross join lateral (select string_to_array(public.ad_esleme_anahtari(io.ad_soyad), ' ') as p) izinli
      cross join lateral (select string_to_array(public.ad_esleme_anahtari(v_girilen_ad), ' ') as p) girilen
      where io.school_id = v_school_id
        and array_length(izinli.p, 1) >= 2
        and array_length(girilen.p, 1) >= 2
        and izinli.p[array_length(izinli.p, 1)] = girilen.p[array_length(girilen.p, 1)]
        and exists (
          select 1
          from unnest(izinli.p[1:array_length(izinli.p, 1)-1]) izinli_ad
          join unnest(girilen.p[1:array_length(girilen.p, 1)-1]) girilen_ad
            on izinli_ad = girilen_ad
        )
      limit 1;

      if v_izinli_ad is null then
        raise exception 'Bu isim okulun kayıtlı öğrenci listesinde bulunamadı. İsimlerinizden birini ve soyadınızı doğru yazın.';
      end if;
      v_profile_ad := v_izinli_ad;
    end if;
  end if;

  insert into public.profiles (id, ad, email, telefon, role, gecici_sifre)
  values (new.id, v_profile_ad, new.email, new.raw_user_meta_data->>'telefon', v_role, v_gecici_sifre);

  if v_role = 'ogrenci' then
    insert into public.students (id, school_id, class_id, okul_no, ayt_alan, hedef_bolum, veri_giris_sikligi)
    values (
      new.id, v_school_id, (new.raw_user_meta_data->>'class_id')::uuid,
      new.raw_user_meta_data->>'okul_no', (new.raw_user_meta_data->>'ayt_alan')::public.ayt_alan,
      coalesce(new.raw_user_meta_data->>'hedef_bolum', ''),
      coalesce((new.raw_user_meta_data->>'veri_giris_sikligi')::public.veri_giris_sikligi, 'haftalik')
    );
  elsif v_role = 'ogretmen' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (new.id, (new.raw_user_meta_data->>'school_id')::uuid, nullif(new.raw_user_meta_data->>'class_id', '')::uuid, coalesce(new.raw_user_meta_data->>'brans', ''));
  elsif v_role = 'mudur' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (new.id, (new.raw_user_meta_data->>'school_id')::uuid, null, 'Müdür');
  elsif v_role = 'veli' and new.raw_user_meta_data->>'request_id' is not null then
    select * into v_request from public.veli_link_requests
    where id = (new.raw_user_meta_data->>'request_id')::uuid and durum = 'onaylandi';
    if found then
      insert into public.parent_students (parent_id, student_id) values (new.id, v_request.student_id) on conflict do nothing;
      update public.veli_link_requests set durum = 'kullanildi' where id = v_request.id;
    end if;
  end if;
  return new;
end;
$$;
