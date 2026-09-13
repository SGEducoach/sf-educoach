-- Dershane rehberlik servisi (kullanıcı isteği 13.09.2026): dershane
-- öğretmenleri öğrenci takibine genelde bakmadığı ve öğrenciler veri
-- girişine direndiği için rehber öğretmen öğrenci adına ödev verir, veri
-- girer ve program yapar (bkz. src/app/dashboard/rehber-ogrenci-actions.ts).
--
-- Kullanıcı kararları:
--   * Rehberin girdiği veri analizde sayılır, rozet/seri sayımına girmez
--     (giren_rehber_id dolu satırlar rozet fonksiyonlarında hariç).
--   * Rehber 30 gün geriye dönük girebilir (öğrenci: konu/soru 3, deneme 7).
--   * Rehberin program kalemini öğrenci taşıyamaz, yalnızca tamamlar.
--   * Rehberin girdiği soru çözümü onaylı sayılır (uygulama katmanında).
alter table public.konu_calismalar
  add column if not exists giren_rehber_id uuid references public.teachers(id) on delete set null;
alter table public.soru_cozumleri
  add column if not exists giren_rehber_id uuid references public.teachers(id) on delete set null;
alter table public.denemeler
  add column if not exists giren_rehber_id uuid references public.teachers(id) on delete set null;
alter table public.gorev_atamalari
  add column if not exists rehber_yerlestirdi boolean not null default false;

-- Geçmiş tarih sınırı: rehber kaydında 30 gün. giren_rehber_id'yi yalnızca
-- sunucu (servis anahtarı, auth.uid() boş) doldurabilir — öğrenci kendi
-- oturumuyla doldurup 30 günlük sınırı ya da rozet hariç tutmayı kullanamaz.
create or replace function public.gecmis_tarih_sinir_kontrol()
returns trigger
language plpgsql
as $$
declare
  v_sinir_gun integer := TG_ARGV[0]::integer;
begin
  if new.giren_rehber_id is not null then
    if auth.uid() is not null then
      raise exception 'Rehber girişi yalnızca rehberlik servisi ekranından yapılabilir.';
    end if;
    v_sinir_gun := 30;
  end if;
  if new.tarih < current_date - v_sinir_gun then
    raise exception 'En fazla % gün geriye dönük giriş yapılabilir.', v_sinir_gun;
  end if;
  return new;
end;
$$;

-- Rozet/seri fonksiyonları: rehber girişleri hariç. Gövdeler öncekiyle
-- aynı, yalnızca "giren_rehber_id is null" koşulu eklendi.
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
        and giren_rehber_id is null
        and tarih between greatest(current_date - 30, coalesce(v_sifirlama, '-infinity'::date)) and current_date
        and extract(dow from tarih) in (0, 6)
    ) g;
    return v_sonuc;
  end if;

  return (
    with gunler as (
      select distinct tarih from public.konu_calismalar
      where student_id = p_student_id
        and giren_rehber_id is null
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
    where student_id = p_student_id and giren_rehber_id is null and tarih between v_alt_sinir and current_date
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
    and giren_rehber_id is null
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

-- Haftalık verimlilik anketi her 3 girişte bir soruluyor; rehber girişleri
-- öğrencinin anket sayacını ilerletmesin.
create or replace function public.ogrenci_giris_sayisi(p_student_id uuid)
returns integer
language sql
stable security definer
set search_path to 'public'
as $$
  select
    (select count(*) from public.konu_calismalar where student_id = p_student_id and giren_rehber_id is null)
    + (select count(*) from public.soru_cozumleri where student_id = p_student_id and giren_rehber_id is null)
    + (select count(*) from public.denemeler where student_id = p_student_id and kaynak = 'ogrenci' and giren_rehber_id is null)::integer;
$$;

-- Rehberin öğrencinin programına yerleştirdiği kalem kilitli: öğrenci kendi
-- oturumuyla (gorev_atamalari_update_own) kilidi kaldıramaz, tarih/saatini
-- değiştiremez, programdan çıkaramaz. Durumu (tamamlandı) güncelleyebilir.
create or replace function public.rehber_programi_koru()
returns trigger
language plpgsql
as $$
begin
  if old.rehber_yerlestirdi and auth.uid() is not null and auth.uid() = old.student_id and (
    new.rehber_yerlestirdi is distinct from old.rehber_yerlestirdi
    or new.programa_eklendi_mi is distinct from old.programa_eklendi_mi
    or new.ogrenci_tarih is distinct from old.ogrenci_tarih
    or new.ogrenci_baslangic_saat is distinct from old.ogrenci_baslangic_saat
    or new.ogrenci_bitis_saat is distinct from old.ogrenci_bitis_saat
    or new.gorev_id is distinct from old.gorev_id
    or new.student_id is distinct from old.student_id
  ) then
    raise exception 'Bu program rehberlik servisi tarafından hazırlandı; yalnızca tamamlayabilirsiniz.';
  end if;
  return new;
end;
$$;

drop trigger if exists rehber_programi_koru on public.gorev_atamalari;
create trigger rehber_programi_koru
  before update on public.gorev_atamalari
  for each row execute function public.rehber_programi_koru();
