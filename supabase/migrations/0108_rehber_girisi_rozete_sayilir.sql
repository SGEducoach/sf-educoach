-- Kullanıcı kararı (13.09.2026, 0107'yi günceller): "rehber öğretmen
-- güvenilir bir kullanıcı olduğu için rozet işleyişi devam etsin" — dershane
-- rehberinin öğrenci adına girdiği veri rozet/seri sayımına da girer. Üç
-- seviye fonksiyonu 0107 öncesi haline (giren_rehber_id filtresi olmadan)
-- döner. ogrenci_giris_sayisi (haftalık verimlilik anketi sayacı, rozet
-- değil) rehber girişlerini saymamaya devam eder; 30 günlük sınır ve kilitli
-- program kalemi de aynen kalır.
create or replace function public.ogrenci_konu_seviyesi(p_student_id uuid)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_yurt boolean;
  v_sifirlama date;
  v_sonuc text;
begin
  select yurt_ogrencisi, rozet_sifirlama_tarihi into v_yurt, v_sifirlama from public.students where id = p_student_id;

  if v_yurt then
    select case
      when count(*) >= 8 then 'altin'
      when count(*) >= 6 then 'gumus'
      when count(*) >= 4 then 'bronz'
      else 'yok'
    end into v_sonuc
    from (
      select distinct tarih from public.konu_calismalar
      where student_id = p_student_id
        and tarih between greatest(current_date - 30, coalesce(v_sifirlama, '-infinity'::date)) and current_date
        and extract(dow from tarih) in (0, 6)
    ) g;
    return v_sonuc;
  end if;

  return (
    with gunler as (
      select distinct tarih from public.konu_calismalar
      where student_id = p_student_id
        and tarih between greatest(current_date - 30, coalesce(v_sifirlama, '-infinity'::date)) and current_date
    ),
    sirali as (
      select tarih, lag(tarih) over (order by tarih) as onceki from gunler
    ),
    gruplu as (
      select tarih,
        sum(case when onceki is null or tarih - onceki > 3 then 1 else 0 end) over (order by tarih) as grup
      from sirali
    ),
    son_grup as (
      select count(*) as gun_sayisi, max(tarih) as son_tarih
      from gruplu
      where grup = (select max(grup) from gruplu)
    )
    select case
      when not exists (select 1 from son_grup) then 'yok'
      when current_date - (select son_tarih from son_grup) > 3 then 'yok'
      when (select gun_sayisi from son_grup) >= 30 then 'altin'
      when (select gun_sayisi from son_grup) >= 20 then 'gumus'
      when (select gun_sayisi from son_grup) >= 15 then 'bronz'
      else 'yok'
    end
  );
end;
$$;

create or replace function public.ogrenci_soru_seviyesi(p_student_id uuid)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_yurt boolean;
  v_sifirlama date;
  v_gecmis_gun int;
  v_alt_sinir date;
  v_sonuc text;
begin
  select yurt_ogrencisi, rozet_sifirlama_tarihi into v_yurt, v_sifirlama from public.students where id = p_student_id;
  v_gecmis_gun := case when v_yurt then 7 else 3 end;
  v_alt_sinir := greatest(current_date - v_gecmis_gun, coalesce(v_sifirlama, '-infinity'::date));

  with tum_dersler as (
    select unnest(array['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji']) as ders
  ),
  toplamlar as (
    select ders, sum(dogru + yanlis) as toplam
    from public.soru_cozumleri
    where student_id = p_student_id and tarih between v_alt_sinir and current_date
    group by ders
  ),
  birlesik as (
    select td.ders, coalesce(t.toplam, 0) as toplam
    from tum_dersler td left join toplamlar t on t.ders = td.ders
  )
  select case
    when (select min(toplam) from birlesik) >= 50 then 'altin'
    when (select min(toplam) from birlesik) >= 30 then 'gumus'
    when (select min(toplam) from birlesik) >= 20 then 'bronz'
    else 'yok'
  end into v_sonuc;

  return v_sonuc;
end;
$$;

create or replace function public.ogrenci_deneme_seviyesi(p_student_id uuid)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_seviye text;
  v_sifirlama date;
  v_sayi int;
begin
  select c.seviye, s.rozet_sifirlama_tarihi into v_seviye, v_sifirlama
  from public.students s
  left join public.classes c on c.id = s.class_id
  where s.id = p_student_id;

  select count(*) into v_sayi
  from public.denemeler
  where student_id = p_student_id
    and tarih between greatest(current_date - 30, coalesce(v_sifirlama, '-infinity'::date)) and current_date;

  if v_seviye in ('9', '10') then
    return case
      when v_sayi >= 3 then 'altin'
      when v_sayi >= 2 then 'gumus'
      when v_sayi >= 1 then 'bronz'
      else 'yok'
    end;
  end if;

  return case
    when v_sayi >= 8 then 'altin'
    when v_sayi >= 4 then 'gumus'
    when v_sayi >= 3 then 'bronz'
    else 'yok'
  end;
end;
$$;
