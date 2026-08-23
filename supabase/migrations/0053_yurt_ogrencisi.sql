-- Yurt öğrencisi işareti: hafta içi telefonuna erişemeyen öğrenciler için
-- (1) rozet sistemi hafta sonuna göre esnetiliyor, (2) hafta içi "sisteme
-- girmedi" hatırlatmaları (öğrenciye ve veliye) bastırılıyor — bkz.
-- src/app/api/cron/hatirlatmalar/route.ts. İşareti admin, okul moderatörü
-- ve öğrencinin sınıf öğretmeni koyabiliyor; sınıf öğretmeni zaten mevcut
-- students_update_sinif_ogretmeni RLS politikasından geçiyor (migration
-- 0045), yeni bir politika gerekmedi.
alter table public.students add column if not exists yurt_ogrencisi boolean not null default false;

comment on column public.students.yurt_ogrencisi is
  'Yurtta kalan öğrenci — hafta içi telefonuna erişemediği için rozet sistemi ve "sisteme girmedi" hatırlatmaları hafta sonuna göre esnetilir.';

-- ============ Konu Çalışma seviyesi — yurt öğrencisi esnetmesi ============
-- Normal mantık (30 günlük seri, en fazla 3 gün boşluk) yurt öğrencisi için
-- imkânsız: hafta içi 5 gün erişimi olmadığından her hafta seri kırılırdı.
-- Yurt öğrencisi için seri/boşluk cezası tamamen kaldırılıp, kayan 30 günde
-- kaç hafta sonu (Cmt/Paz) günü aktif olduğu sayılıyor (30 günde ~8-9 hafta
-- sonu günü olur; eşikler buna göre ölçeklendi).
create or replace function public.ogrenci_konu_seviyesi(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_yurt boolean;
  v_sonuc text;
begin
  select yurt_ogrencisi into v_yurt from public.students where id = p_student_id;

  if v_yurt then
    select case
      when count(*) >= 8 then 'altin'
      when count(*) >= 6 then 'gumus'
      when count(*) >= 4 then 'bronz'
      else 'yok'
    end into v_sonuc
    from (
      select distinct tarih from public.konu_calismalar
      where student_id = p_student_id and tarih between current_date - 30 and current_date
        and extract(dow from tarih) in (0, 6)
    ) g;
    return v_sonuc;
  end if;

  return (
    with gunler as (
      select distinct tarih from public.konu_calismalar
      where student_id = p_student_id and tarih between current_date - 30 and current_date
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

revoke all on function public.ogrenci_konu_seviyesi(uuid) from public;
grant execute on function public.ogrenci_konu_seviyesi(uuid) to authenticated;

-- ============ Soru Çözümü seviyesi — yurt öğrencisi esnetmesi ============
-- Normal pencere (son 3 gün) hafta içi kontrol edildiğinde hiç hafta sonu
-- içermeyebilir. Yurt öğrencisi için pencere son 7 güne genişletiliyor —
-- böylece hangi gün kontrol edilirse edilsin en az bir hafta sonu dahil
-- olur. Eşikler aynı kalıyor (bir hafta sonuna sığdırılabilir).
create or replace function public.ogrenci_soru_seviyesi(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_yurt boolean;
  v_gecmis_gun int;
  v_sonuc text;
begin
  select yurt_ogrencisi into v_yurt from public.students where id = p_student_id;
  v_gecmis_gun := case when v_yurt then 7 else 3 end;

  with tum_dersler as (
    select unnest(array['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji']) as ders
  ),
  toplamlar as (
    select ders, sum(dogru + yanlis) as toplam
    from public.soru_cozumleri
    where student_id = p_student_id and tarih between current_date - v_gecmis_gun and current_date
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

revoke all on function public.ogrenci_soru_seviyesi(uuid) from public;
grant execute on function public.ogrenci_soru_seviyesi(uuid) to authenticated;

-- Not: Deneme seviyesi (ogrenci_deneme_seviyesi) zaten kayan 30 günde
-- TOPLAM giriş sayısına bakıyor, seri/gün bazlı bir ceza içermiyor — hafta
-- sonu toplu giriş yapan bir yurt öğrencisi için de sorunsuz çalışıyor,
-- bu yüzden değiştirilmedi.
