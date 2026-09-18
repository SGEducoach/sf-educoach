-- Grup Koçluk Faz 1 (kullanıcı isteği ve kararları 18.09.2026) + kurum
-- sınırı güvenlik düzeltmesi.
--
-- A) KURUM SINIRI. 10 tabloda "*_select_any_teacher" politikası HERHANGİ bir
--    öğretmen hesabına (is_ogretmen()) TÜM kurumların öğrenci verisini
--    okutuyordu (öğrenci listesi, profiller, denemeler, deneme sonuçları,
--    konu çalışmaları, soru çözümleri, konu hakimiyeti, haftalık verimlilik).
--    Grup Koçluk'ta kurum dışı koçlara öğretmen hesabı açılacağı için bu,
--    bir koçun okulun tüm öğrencilerini okuyabilmesi demekti. Politikalar
--    "kendi kurumunun ya da moderatörü olduğu kurumun öğrencileri" ile
--    daraltıldı; yönetici her şeyi görmeye devam eder. Öğrencinin kendisi,
--    sınıf öğretmeni ve veli erişimi (has_student_access) ve moderatör
--    politikaları dokunulmadan duruyor.
--
-- B) GRUP. Grup = dershanenin alt türü (kullanıcı kararı): schools.
--    grup_kapasitesi (5/10/15/20, boşsa normal kurum) + grup_bitis_tarihi.
--    Kapasite yalnızca AKTİF öğrencileri sayar (pasifleştirilen yer açar) ve
--    veritabanında zorlanır — arayüz atlatılsa bile aşılamaz. Grup kodu =
--    mevcut benzersiz schools.okul_kodu.
--
-- C) GİZLİLİK. schools herkese açık okunuyordu (giriş/kayıt açılır listeleri
--    için). Gruplar yalnızca üyelerine ve yöneticiye görünür: koç adları ve
--    grup kodları oturumsuz ziyaretçiye listelenmez.

-- ============ A) Kurum sınırı ============

create or replace function public.ogretmen_okulu()
returns uuid
language sql stable security definer set search_path = public
as $$
  select school_id from public.teachers where id = auth.uid();
$$;

-- Öğretmen (ya da yönetici) bu kurumun verisini görebilir mi: kendi kurumu
-- ya da öğretmen olarak moderatörü olduğu kurum.
create or replace function public.kurumu_gorebilir(p_school_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
    or (
      p_school_id is not null
      and public.ogretmen_okulu() is not null
      and (p_school_id = public.ogretmen_okulu() or public.is_school_moderator(p_school_id))
    );
$$;

create or replace function public.kurum_ogrencisini_gorebilir(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.students s
    where s.id = p_student_id and public.kurumu_gorebilir(s.school_id)
  );
$$;

-- Profil: aynı kurumdaki öğrenci, öğretmen ya da o kurumdaki bir öğrencinin velisi.
create or replace function public.kurum_profilini_gorebilir(p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from (
      select s.school_id from public.students s where s.id = p_profile_id
      union all
      select t.school_id from public.teachers t where t.id = p_profile_id
      union all
      select s.school_id
      from public.parent_students ps join public.students s on s.id = ps.student_id
      where ps.parent_id = p_profile_id
    ) k
    where public.kurumu_gorebilir(k.school_id)
  );
$$;

create or replace function public.kurum_denemesini_gorebilir(p_deneme_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.denemeler d
    where d.id = p_deneme_id and public.kurum_ogrencisini_gorebilir(d.student_id)
  );
$$;

revoke all on function public.ogretmen_okulu() from anon;
revoke all on function public.kurumu_gorebilir(uuid) from anon;
revoke all on function public.kurum_ogrencisini_gorebilir(uuid) from anon;
revoke all on function public.kurum_profilini_gorebilir(uuid) from anon;
revoke all on function public.kurum_denemesini_gorebilir(uuid) from anon;

drop policy if exists "students_select_any_teacher" on public.students;
create policy "students_select_ayni_kurum" on public.students
  for select using (public.kurumu_gorebilir(school_id));

drop policy if exists "teachers_select_any_teacher" on public.teachers;
create policy "teachers_select_ayni_kurum" on public.teachers
  for select using (public.kurumu_gorebilir(school_id));

drop policy if exists "profiles_select_any_teacher" on public.profiles;
create policy "profiles_select_ayni_kurum" on public.profiles
  for select using (public.is_admin() or (role <> 'admin'::user_role and public.kurum_profilini_gorebilir(id)));

drop policy if exists "denemeler_select_any_teacher" on public.denemeler;
create policy "denemeler_select_ayni_kurum" on public.denemeler
  for select using (public.kurum_ogrencisini_gorebilir(student_id));

drop policy if exists "deneme_ders_sonuclari_select_any_teacher" on public.deneme_ders_sonuclari;
create policy "deneme_ders_sonuclari_select_ayni_kurum" on public.deneme_ders_sonuclari
  for select using (public.kurum_denemesini_gorebilir(deneme_id));

drop policy if exists "deneme_kazanim_sonuclari_select_any_teacher" on public.deneme_kazanim_sonuclari;
create policy "deneme_kazanim_sonuclari_select_ayni_kurum" on public.deneme_kazanim_sonuclari
  for select using (public.kurum_denemesini_gorebilir(deneme_id));

drop policy if exists "haftalik_verimlilikler_select_any_teacher" on public.haftalik_verimlilikler;
create policy "haftalik_verimlilikler_select_ayni_kurum" on public.haftalik_verimlilikler
  for select using (public.kurum_ogrencisini_gorebilir(student_id));

drop policy if exists "konu_calismalar_select_any_teacher" on public.konu_calismalar;
create policy "konu_calismalar_select_ayni_kurum" on public.konu_calismalar
  for select using (public.kurum_ogrencisini_gorebilir(student_id));

drop policy if exists "ogrenci_konu_hakimiyeti_select_any_teacher" on public.ogrenci_konu_hakimiyeti;
create policy "ogrenci_konu_hakimiyeti_select_ayni_kurum" on public.ogrenci_konu_hakimiyeti
  for select using (public.kurum_ogrencisini_gorebilir(student_id));

drop policy if exists "soru_cozumleri_select_any_teacher" on public.soru_cozumleri;
create policy "soru_cozumleri_select_ayni_kurum" on public.soru_cozumleri
  for select using (public.kurum_ogrencisini_gorebilir(student_id));

-- ============ B) Grup alanları ve kapasite ============

alter table public.schools
  add column if not exists grup_kapasitesi smallint,
  add column if not exists grup_bitis_tarihi date,
  add column if not exists koc_taahhut_at timestamptz;

alter table public.schools drop constraint if exists schools_grup_kapasitesi_check;
alter table public.schools add constraint schools_grup_kapasitesi_check
  check (grup_kapasitesi is null or grup_kapasitesi in (5, 10, 15, 20));
alter table public.schools drop constraint if exists schools_grup_dershane_check;
alter table public.schools add constraint schools_grup_dershane_check
  check (grup_kapasitesi is null or (tur = 'dershane' and grup_bitis_tarihi is not null));

-- Öğrencinin (grup öğrencisi dahil) KVKK / veli onayı — Faz 5'te ilk girişte doldurulur.
alter table public.profiles add column if not exists kvkk_onay_at timestamptz;

create or replace function public.grup_aktif_ogrenci_sayisi(p_school_id uuid, p_haric uuid default null)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::integer
  from public.students s join public.profiles p on p.id = s.id
  where s.school_id = p_school_id and p.aktif
    and (p_haric is null or s.id <> p_haric);
$$;

-- Kurumun satırı kilitlenir: aynı anda iki ekleme kapasiteyi aşamaz.
create or replace function public.grup_kapasitesini_denetle(p_school_id uuid, p_ogrenci_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_kapasite smallint;
begin
  select grup_kapasitesi into v_kapasite from public.schools where id = p_school_id for update;
  if v_kapasite is null then
    return;
  end if;
  if public.grup_aktif_ogrenci_sayisi(p_school_id, p_ogrenci_id) >= v_kapasite then
    raise exception 'GRUP_KAPASITESI_DOLU: Grup kapasitesi dolu (% öğrenci).', v_kapasite
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.grup_ogrenci_kapasite_tetik()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.school_id is not distinct from old.school_id then
    return new;
  end if;
  -- Pasif bir öğrenci taşınıyorsa yer kaplamaz.
  if coalesce((select aktif from public.profiles where id = new.id), true) then
    perform public.grup_kapasitesini_denetle(new.school_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists grup_ogrenci_kapasite on public.students;
create trigger grup_ogrenci_kapasite
  before insert or update of school_id on public.students
  for each row execute function public.grup_ogrenci_kapasite_tetik();

-- Pasif öğrenci yeniden aktifleştirilirken de sınır geçerli.
create or replace function public.grup_aktiflestirme_kapasite_tetik()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_school_id uuid;
begin
  if new.aktif and not old.aktif then
    select school_id into v_school_id from public.students where id = new.id;
    if v_school_id is not null then
      perform public.grup_kapasitesini_denetle(v_school_id, new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists grup_aktiflestirme_kapasite on public.profiles;
create trigger grup_aktiflestirme_kapasite
  before update of aktif on public.profiles
  for each row execute function public.grup_aktiflestirme_kapasite_tetik();

-- Kapasite mevcut aktif öğrenci sayısının altına indirilemez.
create or replace function public.grup_kapasite_dusurme_tetik()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.grup_kapasitesi is not null
     and public.grup_aktif_ogrenci_sayisi(new.id) > new.grup_kapasitesi then
    raise exception 'GRUP_KAPASITESI_DUSUK: Grupta % aktif öğrenci var; kapasite bunun altına indirilemez.',
      public.grup_aktif_ogrenci_sayisi(new.id)
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists grup_kapasite_dusurme on public.schools;
create trigger grup_kapasite_dusurme
  before insert or update of grup_kapasitesi on public.schools
  for each row execute function public.grup_kapasite_dusurme_tetik();

-- Süre doldu mu (Faz 8'de salt okunur kuralı bunu kullanacak).
create or replace function public.grup_suresi_doldu(p_school_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select grup_kapasitesi is not null and grup_bitis_tarihi < (now() at time zone 'Europe/Istanbul')::date
    from public.schools where id = p_school_id
  ), false);
$$;

revoke all on function public.grup_aktif_ogrenci_sayisi(uuid, uuid) from anon;
revoke all on function public.grup_kapasitesini_denetle(uuid, uuid) from anon, authenticated;

-- ============ C) Grupların gizliliği ============

create or replace function public.kurum_uyesi_mi(p_school_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
    or exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = p_school_id)
    or exists (select 1 from public.students s where s.id = auth.uid() and s.school_id = p_school_id)
    or exists (select 1 from public.school_moderators m where m.profile_id = auth.uid() and m.school_id = p_school_id)
    or exists (
      select 1 from public.parent_students ps join public.students s on s.id = ps.student_id
      where ps.parent_id = auth.uid() and s.school_id = p_school_id
    );
$$;

drop policy if exists "schools_select_all" on public.schools;
create policy "schools_select_acik_veya_uye" on public.schools
  for select using (grup_kapasitesi is null or public.kurum_uyesi_mi(id));
