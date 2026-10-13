-- Öğrencinin kendi girdiği yeni takip kayıtları, sorumlu rehbere panel
-- bildirimi olur. Kurum/şube kapsamı servis üyeliği ve sınıf düzeyinden
-- belirlenir; toplu kurum yüklemeleri ve rehberin öğrencinin adına girdikleri
-- bildirim üretmez. Eski kayıtlar için geriye dönük bildirim yoktur.
create or replace function public.rehbere_ogrenci_takip_bildir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_seviye text;
  v_ad text;
  v_baslik text;
begin
  if auth.uid() is distinct from new.student_id then
    return new;
  end if;

  select s.school_id, c.seviye, p.ad
    into v_school_id, v_seviye, v_ad
  from public.students s
  join public.classes c on c.id = s.class_id
  join public.profiles p on p.id = s.id
  where s.id = new.student_id;
  if v_school_id is null then return new; end if;

  v_baslik := case tg_table_name
    when 'konu_calismalar' then 'Yeni konu çalışması'
    when 'soru_cozumleri' then 'Yeni soru çözümü'
    when 'denemeler' then 'Yeni deneme sonucu'
    else 'Yeni ortaokul çalışması'
  end;

  insert into public.bildirimler (profile_id, tur, baslik, mesaj)
  select distinct alici.profile_id, 'sistem', v_baslik,
    coalesce(v_ad, 'Bir öğrenci') || ' yeni bir takip kaydı girdi. Öğrenci profilinden inceleyebilirsiniz.'
  from (
    select rs.profile_id
    from public.rehberlik_servisi rs
    where rs.school_id = v_school_id and v_seviye = any(rs.sinif_duzeyleri)
    union
    select t.id as profile_id
    from public.teachers t
    join public.schools sch on sch.id = t.school_id
    where t.school_id = v_school_id
      and t.brans = 'Rehber Öğretmen'
      and sch.tur = 'dershane'
  ) alici
  where alici.profile_id <> new.student_id;
  return new;
end;
$$;

revoke all on function public.rehbere_ogrenci_takip_bildir() from public;

create trigger rehber_konu_calisma_bildir
  after insert on public.konu_calismalar
  for each row execute function public.rehbere_ogrenci_takip_bildir();
create trigger rehber_soru_cozumu_bildir
  after insert on public.soru_cozumleri
  for each row execute function public.rehbere_ogrenci_takip_bildir();
create trigger rehber_deneme_bildir
  after insert on public.denemeler
  for each row execute function public.rehbere_ogrenci_takip_bildir();
create trigger rehber_ortaokul_calisma_bildir
  after insert on public.ortaokul_calismalar
  for each row execute function public.rehbere_ogrenci_takip_bildir();
