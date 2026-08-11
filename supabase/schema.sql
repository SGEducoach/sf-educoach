-- SG EduCoach — Şema v2 (Faz A: okul/sınıf/öğretmen/öğrenci/veli akışı)
-- NOT: Bu, önceki basit prototip şemasının tamamen yerini alır (dev aşamasında
-- güvenle sıfırlanabilir — henüz gerçek kullanıcı verisi yok).
-- Faz B'de: konu çalışma, soru çözümü, deneme sonuçları, hedefe yakınlık,
-- haftalık verimlilik tabloları eklenecek.

-- ============ RESET ============
drop table if exists public.notifications cascade;
drop table if exists public.study_sessions cascade;
drop table if exists public.exams cascade;
drop table if exists public.veli_link_requests cascade;
drop table if exists public.parent_students cascade;
drop table if exists public.coach_students cascade;
drop table if exists public.teachers cascade;
drop table if exists public.students cascade;
drop table if exists public.classes cascade;
drop table if exists public.schools cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.has_student_access(uuid) cascade;
drop function if exists public.find_student_by_email(text) cascade;
drop function if exists public.find_student_by_code(text, text) cascade;
drop function if exists public.veli_kod_onayla(uuid) cascade;
drop sequence if exists public.ogrenci_no_seq;

drop type if exists public.user_role cascade;
drop type if exists public.notification_type cascade;
drop type if exists public.ayt_alan cascade;
drop type if exists public.veri_giris_sikligi cascade;
drop type if exists public.veli_talep_durum cascade;
drop type if exists public.kurum_turu cascade;

-- ============ 1) schools (okul / dershane) ============
create type public.kurum_turu as enum ('okul', 'dershane');

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  tur public.kurum_turu not null default 'okul',
  okul_kodu text unique, -- müdür girişi için (Okul Kodu + Şifre)
  created_at timestamptz not null default now()
);

-- ============ 2) classes (şube) ============
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  seviye text not null check (seviye in ('11', '12')),
  sube text not null,
  created_at timestamptz not null default now(),
  unique (school_id, seviye, sube)
);

-- ============ 3) profiles ============
create type public.user_role as enum ('ogrenci', 'ogretmen', 'veli', 'mudur');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ad text not null,
  email text,
  telefon text,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

-- ============ 4) students ============
create type public.ayt_alan as enum ('SAY', 'EA', 'SOZ');
create type public.veri_giris_sikligi as enum ('gunluk', '3gunluk', 'haftalik');

create table public.students (
  id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id),
  class_id uuid not null references public.classes(id),
  okul_no text not null,
  ayt_alan public.ayt_alan not null,
  hedef_bolum text not null,
  veri_giris_sikligi public.veri_giris_sikligi not null default 'haftalik',
  created_at timestamptz not null default now(),
  unique (school_id, okul_no)
);

-- ============ 5) teachers (öğretmen) ============
create table public.teachers (
  id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id),
  class_id uuid references public.classes(id), -- sınıf öğretmeni olduğu şube (dershanede boş kalabilir)
  brans text not null,
  created_at timestamptz not null default now()
);

-- ============ 6) parent_students (onaylı veli-öğrenci bağlantısı) ============
create table public.parent_students (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

-- ============ 7) veli_link_requests (kod talebi + öğretmen onayı) ============
create type public.veli_talep_durum as enum ('bekliyor', 'onaylandi', 'reddedildi', 'kullanildi');

create table public.veli_link_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  veli_ad text not null,
  veli_telefon text not null,
  durum public.veli_talep_durum not null default 'bekliyor',
  kod text, -- öğretmen onaylayınca üretilir
  onaylayan_ogretmen_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  onaylanma_at timestamptz
);

create index on public.veli_link_requests (student_id);
create index on public.veli_link_requests (durum);

-- ============ Yardımcı: bir kullanıcının bir öğrenciye erişimi var mı? ============
create or replace function public.has_student_access(target_student_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select
    target_student_id = auth.uid()
    or exists (
      select 1 from public.teachers t
      join public.students s on s.class_id = t.class_id
      where s.id = target_student_id and t.id = auth.uid()
    )
    or exists (
      select 1 from public.parent_students ps
      where ps.student_id = target_student_id and ps.parent_id = auth.uid()
    );
$$;

-- ============ RLS ============
alter table public.schools enable row level security;
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.parent_students enable row level security;
alter table public.veli_link_requests enable row level security;

-- schools/classes: kayıt formlarında herkes (giriş yapmamış kullanıcı dahil) okuyabilmeli
create policy "schools_select_all" on public.schools for select using (true);
create policy "classes_select_all" on public.classes for select using (true);

-- profiles
create policy "profiles_select_own_or_related" on public.profiles
  for select using (id = auth.uid() or public.has_student_access(id));
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- students
create policy "students_select_related" on public.students
  for select using (public.has_student_access(id));
create policy "students_update_own" on public.students
  for update using (id = auth.uid());
create policy "students_insert_own" on public.students
  for insert with check (id = auth.uid());

-- teachers: öğrencisi olan herkes (kendi sınıfındaki) + kendisi görebilir
create policy "teachers_select_related" on public.teachers
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.students s
      where s.class_id = teachers.class_id and s.id = auth.uid()
    )
  );
create policy "teachers_insert_own" on public.teachers
  for insert with check (id = auth.uid());
create policy "teachers_update_own" on public.teachers
  for update using (id = auth.uid());

-- parent_students
create policy "parent_students_select" on public.parent_students
  for select using (parent_id = auth.uid() or student_id = auth.uid());

-- veli_link_requests:
-- - talep oluşturma: herkese açık (henüz hesabı olmayan veli formu dolduruyor)
-- - görme: ilgili öğretmen (öğrencisinin sınıfı eşleşen) + öğrencinin kendisi
-- - onaylama (update): sadece ilgili öğretmen
create policy "veli_link_requests_insert_public" on public.veli_link_requests
  for insert with check (true);
create policy "veli_link_requests_select_teacher" on public.veli_link_requests
  for select using (
    exists (
      select 1 from public.teachers t
      join public.students s on s.class_id = t.class_id
      where s.id = veli_link_requests.student_id and t.id = auth.uid()
    )
    or student_id = auth.uid()
  );
create policy "veli_link_requests_update_teacher" on public.veli_link_requests
  for update using (
    exists (
      select 1 from public.teachers t
      join public.students s on s.class_id = t.class_id
      where s.id = veli_link_requests.student_id and t.id = auth.uid()
    )
  );

-- ============ Öğretmen onay RPC'si: kod üretir, durumu günceller ============
create or replace function public.veli_talep_onayla(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kod text;
  v_yetkili boolean;
begin
  select exists (
    select 1 from public.veli_link_requests r
    join public.teachers t on t.class_id = (select class_id from public.students where id = r.student_id)
    where r.id = p_request_id and t.id = auth.uid()
  ) into v_yetkili;

  if not v_yetkili then
    raise exception 'Bu talebi onaylama yetkiniz yok.';
  end if;

  v_kod := upper(substr(md5(random()::text || p_request_id::text), 1, 8));

  update public.veli_link_requests
  set durum = 'onaylandi', kod = v_kod, onaylayan_ogretmen_id = auth.uid(), onaylanma_at = now()
  where id = p_request_id;

  return v_kod;
end;
$$;

revoke all on function public.veli_talep_onayla(uuid) from public;
grant execute on function public.veli_talep_onayla(uuid) to authenticated;

-- ============ Yeni kullanıcı trigger'ı ============
-- ogrenci/ogretmen: normal signUp akışıyla. veli: admin API ile hesap
-- oluşunca (raw_user_meta_data.request_id ile) parent_students bağlantısını
-- otomatik kurar ve talebi 'kullanildi' işaretler.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := coalesce(new.raw_user_meta_data->>'role', 'ogrenci')::public.user_role;
  v_request record;
begin
  insert into public.profiles (id, ad, email, telefon, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'ad', new.email),
    new.email,
    new.raw_user_meta_data->>'telefon',
    v_role
  );

  if v_role = 'ogrenci' then
    insert into public.students (id, school_id, class_id, okul_no, ayt_alan, hedef_bolum, veri_giris_sikligi)
    values (
      new.id,
      (new.raw_user_meta_data->>'school_id')::uuid,
      (new.raw_user_meta_data->>'class_id')::uuid,
      new.raw_user_meta_data->>'okul_no',
      (new.raw_user_meta_data->>'ayt_alan')::public.ayt_alan,
      coalesce(new.raw_user_meta_data->>'hedef_bolum', ''),
      coalesce((new.raw_user_meta_data->>'veri_giris_sikligi')::public.veri_giris_sikligi, 'haftalik')
    );
  elsif v_role = 'ogretmen' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (
      new.id,
      (new.raw_user_meta_data->>'school_id')::uuid,
      nullif(new.raw_user_meta_data->>'class_id', '')::uuid,
      coalesce(new.raw_user_meta_data->>'brans', '')
    );
  elsif v_role = 'mudur' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (new.id, (new.raw_user_meta_data->>'school_id')::uuid, null, 'Müdür');
  elsif v_role = 'veli' and new.raw_user_meta_data->>'request_id' is not null then
    select * into v_request
    from public.veli_link_requests
    where id = (new.raw_user_meta_data->>'request_id')::uuid
      and durum = 'onaylandi';

    if found then
      insert into public.parent_students (parent_id, student_id)
      values (new.id, v_request.student_id)
      on conflict do nothing;

      update public.veli_link_requests set durum = 'kullanildi' where id = v_request.id;
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Giriş çözümleyicileri ============
-- Öğrenci "okul no" ile giriş yapsın diye: okul no -> gerçek e-posta.
-- (Şu an tek okul var; çoklu okul eklenince okul seçimi de gerekecek.)
create or replace function public.resolve_ogrenci_email(p_okul_no text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.email
  from public.students s
  join public.profiles p on p.id = s.id
  where s.okul_no = p_okul_no
  limit 1;
$$;

revoke all on function public.resolve_ogrenci_email(text) from public;
grant execute on function public.resolve_ogrenci_email(text) to anon, authenticated;

-- Veli "öğrenci no + kod" ile giriş yapsın diye: sentetik hesap e-postasını bulur.
create or replace function public.resolve_veli_login(p_okul_no text, p_kod text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select 'veli+' || r.id::text || '@sgeducoach.internal'
  from public.veli_link_requests r
  join public.students s on s.id = r.student_id
  where s.okul_no = p_okul_no
    and r.kod = p_kod
    and r.durum in ('onaylandi', 'kullanildi')
  limit 1;
$$;

revoke all on function public.resolve_veli_login(text, text) from public;
grant execute on function public.resolve_veli_login(text, text) to anon, authenticated;

-- ============ Seed: Elbistan Bist Fen Lisesi + 11-12 A-D şubeleri ============
insert into public.schools (ad, tur, okul_kodu) values ('Elbistan Bist Fen Lisesi', 'okul', '758130');

insert into public.classes (school_id, seviye, sube)
select s.id, seviye, sube
from public.schools s
cross join (values ('11'),('12')) as sv(seviye)
cross join (values ('A'),('B'),('C'),('D')) as sb(sube)
where s.ad = 'Elbistan Bist Fen Lisesi';

-- ============ Faz B: öğrenci veri girişi ============
create type public.hedefe_yakinlik as enum ('yakin', 'belirsiz', 'uzak');
create type public.verimlilik_duzeyi as enum ('cok_dusuk', 'dusuk', 'orta', 'iyi', 'cok_iyi');
create type public.deneme_turu as enum ('TYT', 'AYT');

create table public.konu_calismalar (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null default current_date,
  ders text not null,
  konu text not null,
  sure_dakika integer not null check (sure_dakika > 0),
  hedefe_yakinlik public.hedefe_yakinlik not null,
  created_at timestamptz not null default now()
);

create table public.soru_cozumleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null default current_date,
  ders text not null,
  dogru integer not null check (dogru >= 0),
  yanlis integer not null check (yanlis >= 0),
  sure_dakika integer not null check (sure_dakika > 0),
  hedefe_yakinlik public.hedefe_yakinlik not null,
  created_at timestamptz not null default now()
);

create table public.denemeler (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null default current_date,
  tur public.deneme_turu not null,
  sure_dakika integer not null check (sure_dakika > 0),
  hedefe_yakinlik public.hedefe_yakinlik not null,
  kaynak text not null default 'ogrenci' check (kaynak in ('ogrenci', 'ogretmen')),
  created_at timestamptz not null default now()
);

create table public.deneme_ders_sonuclari (
  id uuid primary key default gen_random_uuid(),
  deneme_id uuid not null references public.denemeler(id) on delete cascade,
  ders text not null,
  dogru integer not null check (dogru >= 0),
  yanlis integer not null check (yanlis >= 0),
  unique (deneme_id, ders)
);

create table public.haftalik_verimlilikler (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  duzey public.verimlilik_duzeyi not null,
  created_at timestamptz not null default now()
);

create index on public.konu_calismalar (student_id, tarih);
create index on public.soru_cozumleri (student_id, tarih);
create index on public.denemeler (student_id, tarih);
create index on public.deneme_ders_sonuclari (deneme_id);
create index on public.haftalik_verimlilikler (student_id, created_at);

alter table public.konu_calismalar enable row level security;
alter table public.soru_cozumleri enable row level security;
alter table public.denemeler enable row level security;
alter table public.deneme_ders_sonuclari enable row level security;
alter table public.haftalik_verimlilikler enable row level security;

create policy "konu_calismalar_select" on public.konu_calismalar for select using (public.has_student_access(student_id));
create policy "konu_calismalar_insert" on public.konu_calismalar for insert with check (student_id = auth.uid());

create policy "soru_cozumleri_select" on public.soru_cozumleri for select using (public.has_student_access(student_id));
create policy "soru_cozumleri_insert" on public.soru_cozumleri for insert with check (student_id = auth.uid());

create policy "denemeler_select" on public.denemeler for select using (public.has_student_access(student_id));
create policy "denemeler_insert" on public.denemeler for insert with check (
  student_id = auth.uid()
  or (kaynak = 'ogretmen' and exists (
    select 1 from public.teachers t join public.students s on s.class_id = t.class_id
    where s.id = denemeler.student_id and t.id = auth.uid()
  ))
);

create policy "deneme_ders_sonuclari_select" on public.deneme_ders_sonuclari for select using (
  exists (select 1 from public.denemeler d where d.id = deneme_ders_sonuclari.deneme_id and public.has_student_access(d.student_id))
);
create policy "deneme_ders_sonuclari_insert" on public.deneme_ders_sonuclari for insert with check (
  exists (
    select 1 from public.denemeler d where d.id = deneme_ders_sonuclari.deneme_id
    and (d.student_id = auth.uid() or exists (
      select 1 from public.teachers t join public.students s on s.class_id = t.class_id
      where s.id = d.student_id and t.id = auth.uid()
    ))
  )
);

create policy "haftalik_verimlilikler_select" on public.haftalik_verimlilikler for select using (public.has_student_access(student_id));
create policy "haftalik_verimlilikler_insert" on public.haftalik_verimlilikler for insert with check (student_id = auth.uid());

create or replace function public.ogrenci_giris_sayisi(p_student_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.konu_calismalar where student_id = p_student_id)
    + (select count(*) from public.soru_cozumleri where student_id = p_student_id)
    + (select count(*) from public.denemeler where student_id = p_student_id and kaynak = 'ogrenci');
$$;

revoke all on function public.ogrenci_giris_sayisi(uuid) from public;
grant execute on function public.ogrenci_giris_sayisi(uuid) to authenticated;

-- ============ Hatırlatma sistemi ============
alter table public.students
  add column if not exists son_hatirlatma_deadline timestamptz;

-- ============ Veli rıza beyanı (KVKK) ============
alter table public.profiles
  add column if not exists kvkk_onay_at timestamptz,
  add column if not exists kvkk_onay_versiyon text;

-- ============ Giriş yapmamış veli için öğrenci arama ============
create or replace function public.find_student_id_by_okul_no(p_okul_no text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.students where okul_no = p_okul_no limit 1;
$$;

revoke all on function public.find_student_id_by_okul_no(text) from public;
grant execute on function public.find_student_id_by_okul_no(text) to anon, authenticated;

-- ============ Öğretmen yetki ayrımı ============
-- Sınıf öğretmeni kendi sınıfında işlem yapabilir (has_student_access +
-- veli_talep_onayla zaten bunu sağlıyor); herhangi bir öğretmen herhangi
-- bir sınıfı SADECE görüntüleyebilir.
-- teachers tablosunda kaydı olan herkes (role='ogretmen' veya 'mudur',
-- ikisi de bu tabloya satır ekliyor) bu fonksiyondan true alır.
create or replace function public.is_ogretmen()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.teachers where id = auth.uid());
$$;

revoke all on function public.is_ogretmen() from public;
grant execute on function public.is_ogretmen() to authenticated;

create policy "profiles_select_any_teacher" on public.profiles for select using (public.is_ogretmen());
create policy "students_select_any_teacher" on public.students for select using (public.is_ogretmen());
create policy "konu_calismalar_select_any_teacher" on public.konu_calismalar for select using (public.is_ogretmen());
create policy "soru_cozumleri_select_any_teacher" on public.soru_cozumleri for select using (public.is_ogretmen());
create policy "denemeler_select_any_teacher" on public.denemeler for select using (public.is_ogretmen());
create policy "deneme_ders_sonuclari_select_any_teacher" on public.deneme_ders_sonuclari for select using (public.is_ogretmen());
create policy "haftalik_verimlilikler_select_any_teacher" on public.haftalik_verimlilikler for select using (public.is_ogretmen());

-- ============ Müdür girişi: Okul Kodu -> e-posta çözümleme ============
create or replace function public.resolve_mudur_email(p_okul_kodu text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.email
  from public.schools s
  join public.teachers t on t.school_id = s.id
  join public.profiles p on p.id = t.id
  where s.okul_kodu = p_okul_kodu and p.role = 'mudur'
  limit 1;
$$;

revoke all on function public.resolve_mudur_email(text) from public;
grant execute on function public.resolve_mudur_email(text) to anon, authenticated;

-- ============ Admin paneli (müdür: sınıf ekleme + öğretmen listesi) ============
create policy "teachers_select_any_teacher" on public.teachers for select using (public.is_ogretmen());

create policy "classes_insert_mudur" on public.classes
  for insert with check (
    exists (
      select 1 from public.profiles p
      join public.teachers t on t.id = p.id
      where p.id = auth.uid() and p.role = 'mudur' and t.school_id = classes.school_id
    )
  );

-- ============ Web Push abonelikleri ============
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions for select using (profile_id = auth.uid());
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert with check (profile_id = auth.uid());
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete using (profile_id = auth.uid());

-- ============ Format doğrulamaları + sınıf öğretmeni ataması müdürde ============
alter table public.students
  add constraint students_okul_no_format check (okul_no ~ '^[0-9]{1,5}$') not valid;

alter table public.profiles
  add constraint profiles_telefon_format check (telefon is null or telefon ~ '^[0-9]{10,11}$') not valid;

alter table public.veli_link_requests
  add constraint veli_link_requests_telefon_format check (veli_telefon ~ '^[0-9]{10,11}$') not valid;

create unique index if not exists teachers_class_id_unique on public.teachers (class_id) where class_id is not null;

-- Not: bu policy 0014 tarafından "teachers_update_admin" ile değiştirildi,
-- aşağıda duruyor çünkü fresh-install script'i sırasıyla yürütülüyor
-- (önce enum'a 'admin' eklenmeli — bkz. dosyanın sonu).
create policy "teachers_update_mudur" on public.teachers
  for update using (
    exists (
      select 1 from public.profiles p
      join public.teachers t on t.id = p.id
      where p.id = auth.uid() and p.role = 'mudur' and t.school_id = teachers.school_id
    )
  );

-- ============ Admin rolü: müdür artık gözlemci, tüm kontrol admin'de ============
-- ÖNEMLİ (fresh install): 'alter type ... add value' aynı transaction'da
-- kullanılamadığı için gerçek Supabase ortamında bu iki parça (enum ekleme /
-- geri kalanı) ayrı çalıştırmalar olarak uygulandı (migration 0013 + 0014).
-- Tek seferde çalışan fresh-install script'i (psql \i ile, transaction
-- olmadan) için burada art arda duruyorlar.
alter type public.user_role add value if not exists 'admin';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.is_ogretmen()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.teachers where id = auth.uid())
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "classes_insert_mudur" on public.classes;
create policy "classes_insert_admin" on public.classes
  for insert with check (public.is_admin());

drop policy if exists "teachers_update_mudur" on public.teachers;
create policy "teachers_update_admin" on public.teachers
  for update using (public.is_admin());

create or replace function public.teachers_class_id_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.class_id is distinct from old.class_id and not public.is_admin() then
    raise exception 'Sınıf öğretmeni ataması sadece yönetici tarafından yapılabilir.';
  end if;
  return new;
end;
$$;

drop trigger if exists teachers_class_id_guard on public.teachers;
create trigger teachers_class_id_guard
  before update on public.teachers
  for each row execute function public.teachers_class_id_guard();

-- ============ Admin işlem kaydı (audit log) ============
-- "Admin paneli işlem kaydı tutuyor mu?" sorusuna yanıt: evet, admin'in
-- yaptığı kontrol işlemleri (sınıf ekleme, sınıf öğretmeni atama) kaydedilir.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  eylem text not null,
  detay jsonb,
  created_at timestamptz not null default now()
);

create index on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "admin_audit_log_select_admin" on public.admin_audit_log
  for select using (public.is_admin());

create policy "admin_audit_log_insert_admin" on public.admin_audit_log
  for insert with check (actor_id = auth.uid() and public.is_admin());

-- ============ AI destekli konu anlatımı içerik önbelleği ============
-- Bir ders+konu kombinasyonu için anlatım TEK SEFER Claude API ile üretilir,
-- burada saklanır; sonraki her istek tekrar API çağırmadan buradan okunur.
create table public.konu_anlatimlari (
  id uuid primary key default gen_random_uuid(),
  ders text not null,
  konu text not null,
  icerik text not null,
  created_at timestamptz not null default now(),
  unique (ders, konu)
);

alter table public.konu_anlatimlari enable row level security;

create policy "konu_anlatimlari_select_all" on public.konu_anlatimlari
  for select using (true);

-- Konu anlatımına sınıf/seviye etiketi (bkz. migration 0017)
alter table public.konu_anlatimlari add column if not exists seviye text;

-- ============ Deneme seviyesi (Kolay/Orta/Zor) — hedefe_yakinlik'ten ayrı ============
create type public.deneme_zorlugu as enum ('kolay', 'orta', 'zor');
alter table public.denemeler add column if not exists zorluk public.deneme_zorlugu;

-- ============ Veri giriş sıklığı: bir kez seçilip kilitlensin ============
alter table public.students add column if not exists veri_giris_sikligi_kilitli boolean not null default false;

-- ============ Okul CRUD admin panelinden (bkz. migration 0020) ============
alter table public.schools add column if not exists aktif boolean not null default true;

drop policy if exists "schools_insert_admin" on public.schools;
create policy "schools_insert_admin" on public.schools
  for insert with check (public.is_admin());

drop policy if exists "schools_update_admin" on public.schools;
create policy "schools_update_admin" on public.schools
  for update using (public.is_admin());

-- ============ Hesap pasifleştirme (bkz. migration 0021) ============
alter table public.profiles add column if not exists aktif boolean not null default true;

-- ============ Genel amaçlı ayar tablosu (bkz. migration 0022) ============
create table if not exists public.app_ayarlari (
  anahtar text primary key,
  deger text not null,
  guncelleyen_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_ayarlari enable row level security;

drop policy if exists "app_ayarlari_select_all" on public.app_ayarlari;
create policy "app_ayarlari_select_all" on public.app_ayarlari for select using (true);

insert into public.app_ayarlari (anahtar, deger) values
  ('kurallar_versiyon', 'v1'),
  ('kurallar_metni', $$SG EduCoach'a hoş geldiniz. Platforma kayıt olarak veya bir öğrencinin verisine veli olarak bağlanarak aşağıdaki kuralları kabul etmiş sayılırsınız.

1. HESAP VE BİLGİ DOĞRULUĞU
Ad, telefon, okul/sınıf, e-posta gibi bilgileri doğru ve güncel girmekle yükümlüsünüz. Öğrenci hesapları okul numarası + şifre, öğretmen hesapları e-posta + şifre, veli hesapları ise öğretmen onaylı bir kod ile açılır. Hesabınızın ve şifrenizin güvenliğinden siz sorumlusunuz; şifrenizi başkasıyla paylaşmayın.

2. ROLLER VE YETKİLER
- Öğrenci: yalnızca kendi verisini girer ve görür.
- Öğretmen: kendi sınıfının öğrencilerine görev/onay verebilir; diğer sınıfları yalnızca görüntüleyebilir (salt okunur).
- Sınıf öğretmenliği ataması, kayıt sırasında kendiliğinden yapılamaz; yalnızca okul yönetimi (admin) tarafından atanır.
- Müdür: kendi okulundaki verileri görüntüleyebilir (gözlemci); kontrol yetkileri (sınıf ekleme, sınıf öğretmeni atama) platform yöneticisine (admin) aittir.
- Veli: onay kodunu aldığı öğrencinin akademik verilerini görüntüleyebilir.

3. VELİ ONAYI (18 YAŞ ALTI ÖĞRENCİLER)
Öğrenci 18 yaşından küçükse, verilerinin veli tarafından görüntülenebilmesi için velinin ayrıca KVKK Aydınlatma Metni'ni onaylaması gerekir.

4. VERİ TOPLAMA VE KULLANIM AMACI
Platform; konu çalışması, soru çözümü, deneme sonuçları, motivasyon ve haftalık verimlilik gibi akademik verileri, öğrencinin gelişiminin takip edilmesi ve ilgili öğretmen/veli ile paylaşılması amacıyla toplar. Veriler yalnızca öğrencinin kendisi, bağlı olduğu öğretmen(ler), velisi ve okul yönetimiyle paylaşılır; üçüncü taraflarla paylaşılmaz. Ayrıntılar için KVKK Aydınlatma Metni'ne bakınız.

5. BİLDİRİMLER
Hatırlatma ve bilgilendirme amacıyla e-posta ve (izin verirseniz) anlık bildirim gönderilebilir. Bildirim izinlerini istediğiniz zaman cihaz/tarayıcı ayarlarından kapatabilirsiniz.

6. YASAKLI KULLANIM
Başkası adına veya başkasının bilgileriyle kayıt olmak, başka bir kullanıcının hesabına izinsiz erişmeye çalışmak, sisteme yanlış/yanıltıcı veri girmek ve platformun işleyişini bozmaya yönelik her türlü davranış yasaktır. Bu kurallara aykırı kullanım tespit edilirse hesabınız uyarılmadan askıya alınabilir.

7. DEĞİŞİKLİKLER
Bu kurallar ve platformun işleyişi zaman içinde güncellenebilir; önemli değişikliklerde kayıt sırasında tekrar onayınız istenir.

Sorularınız için: sg.educoach@gmail.com$$)
on conflict (anahtar) do nothing;

-- ============ KRİTİK DÜZELTME: okul_no aramaları okul bazlı olsun ============
-- (bkz. migration 0023) — okul_no sadece kendi okulu içinde benzersiz;
-- birden fazla okul varken bu üç RPC okul ayrımı yapmadan arıyordu. DROP
-- edilmiyor (canlı projede "must be owner of function" hatası çıkabiliyor);
-- yeni parametre listesiyle ayrı bir overload olarak ekleniyor.
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

-- ============ Süre alanına üst sınır (bkz. migration 0024) ============
alter table public.konu_calismalar
  add constraint konu_calismalar_sure_ust_sinir check (sure_dakika <= 480) not valid;

alter table public.soru_cozumleri
  add constraint soru_cozumleri_sure_ust_sinir check (sure_dakika <= 480) not valid;

alter table public.denemeler
  add constraint denemeler_sure_ust_sinir check (sure_dakika <= 300) not valid;

-- ============ Rozet sistemi (bkz. migration 0025) ============
create table public.student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  badge_id text not null check (badge_id in ('bronz', 'gumus', 'altin')),
  earned_at date not null default current_date,
  unique (student_id, badge_id)
);

create index on public.student_badges (student_id);

alter table public.student_badges enable row level security;

create policy "student_badges_select" on public.student_badges
  for select using (public.has_student_access(student_id));

create policy "student_badges_select_any_teacher" on public.student_badges
  for select using (public.is_ogretmen());

create or replace function public.ogrenci_aktif_gun_sayisi_pencere(p_student_id uuid, p_gun_sayisi int)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(distinct tarih)::int from (
    select tarih from public.konu_calismalar where student_id = p_student_id and tarih >= current_date - p_gun_sayisi
    union
    select tarih from public.soru_cozumleri where student_id = p_student_id and tarih >= current_date - p_gun_sayisi
    union
    select tarih from public.denemeler where student_id = p_student_id and tarih >= current_date - p_gun_sayisi
  ) t;
$$;

revoke all on function public.ogrenci_aktif_gun_sayisi_pencere(uuid, int) from public;
grant execute on function public.ogrenci_aktif_gun_sayisi_pencere(uuid, int) to authenticated;

create or replace function public.rozet_kontrol_et(p_student_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aktif_gun int;
  v_yeni text[] := '{}';
begin
  if p_student_id <> auth.uid() then
    raise exception 'Yetkisiz.';
  end if;

  select public.ogrenci_aktif_gun_sayisi_pencere(p_student_id, 30) into v_aktif_gun;

  if v_aktif_gun >= 15 and not exists (select 1 from public.student_badges where student_id = p_student_id and badge_id = 'bronz') then
    insert into public.student_badges (student_id, badge_id) values (p_student_id, 'bronz');
    v_yeni := array_append(v_yeni, 'bronz');
  end if;
  if v_aktif_gun >= 20 and not exists (select 1 from public.student_badges where student_id = p_student_id and badge_id = 'gumus') then
    insert into public.student_badges (student_id, badge_id) values (p_student_id, 'gumus');
    v_yeni := array_append(v_yeni, 'gumus');
  end if;
  if v_aktif_gun >= 30 and not exists (select 1 from public.student_badges where student_id = p_student_id and badge_id = 'altin') then
    insert into public.student_badges (student_id, badge_id) values (p_student_id, 'altin');
    v_yeni := array_append(v_yeni, 'altin');
  end if;

  return v_yeni;
end;
$$;

revoke all on function public.rozet_kontrol_et(uuid) from public;
grant execute on function public.rozet_kontrol_et(uuid) to authenticated;

-- ============ İzinli öğrenci listesi (bkz. migration 0026) ============
create table public.izinli_ogrenciler (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad_soyad text not null,
  created_at timestamptz not null default now(),
  unique (school_id, ad_soyad)
);

create index on public.izinli_ogrenciler (school_id);

alter table public.izinli_ogrenciler enable row level security;

create policy "izinli_ogrenciler_select_admin" on public.izinli_ogrenciler
  for select using (public.is_admin());

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
  v_ad text;
  v_admin_ekledi boolean := coalesce((new.raw_user_meta_data->>'admin_ekledi')::boolean, false);
begin
  insert into public.profiles (id, ad, email, telefon, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'ad', new.email),
    new.email,
    new.raw_user_meta_data->>'telefon',
    v_role
  );

  if v_role = 'ogrenci' then
    v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;
    v_ad := new.raw_user_meta_data->>'ad';

    if not v_admin_ekledi
       and exists (select 1 from public.izinli_ogrenciler where school_id = v_school_id)
       and not exists (select 1 from public.izinli_ogrenciler where school_id = v_school_id and ad_soyad = v_ad) then
      raise exception 'Bu isim okulun kayıtlı öğrenci listesinde bulunamadı. Lütfen öğretmeninizle/okul yönetimiyle iletişime geçin.';
    end if;

    insert into public.students (id, school_id, class_id, okul_no, ayt_alan, hedef_bolum, veri_giris_sikligi)
    values (
      new.id,
      v_school_id,
      (new.raw_user_meta_data->>'class_id')::uuid,
      new.raw_user_meta_data->>'okul_no',
      (new.raw_user_meta_data->>'ayt_alan')::public.ayt_alan,
      coalesce(new.raw_user_meta_data->>'hedef_bolum', ''),
      coalesce((new.raw_user_meta_data->>'veri_giris_sikligi')::public.veri_giris_sikligi, 'haftalik')
    );
  elsif v_role = 'ogretmen' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (
      new.id,
      (new.raw_user_meta_data->>'school_id')::uuid,
      nullif(new.raw_user_meta_data->>'class_id', '')::uuid,
      coalesce(new.raw_user_meta_data->>'brans', '')
    );
  elsif v_role = 'mudur' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (new.id, (new.raw_user_meta_data->>'school_id')::uuid, null, 'Müdür');
  elsif v_role = 'veli' and new.raw_user_meta_data->>'request_id' is not null then
    select * into v_request
    from public.veli_link_requests
    where id = (new.raw_user_meta_data->>'request_id')::uuid
      and durum = 'onaylandi';

    if found then
      insert into public.parent_students (parent_id, student_id)
      values (new.id, v_request.student_id)
      on conflict do nothing;

      update public.veli_link_requests set durum = 'kullanildi' where id = v_request.id;
    end if;
  end if;

  return new;
end;
$$;

-- ==== 0027_gecici_sifre.sql ====
-- Öğrenci kendi kendine kayıt olurken artık şifresini kendi girmiyor;
-- sistem rastgele bir "geçici şifre" üretip ekranda gösteriyor. Bu
-- kolonu true olarak işaretleyip, ilk girişte öğrenciye zorunlu şifre
-- belirleme ekranı gösterip false'a çekiyoruz (bkz.
-- src/components/dashboard/ZorunluSifreDegisikligi.tsx).
alter table public.profiles add column if not exists gecici_sifre boolean not null default false;

-- handle_new_user()'ı aynı imzayla güncelliyoruz (DROP FUNCTION YOK —
-- migration 0023'te "must be owner of function" hatasına yol açmıştı,
-- CREATE OR REPLACE aynı imza için sorunsuz çalışıyor).
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
  v_ad text;
  v_admin_ekledi boolean := coalesce((new.raw_user_meta_data->>'admin_ekledi')::boolean, false);
  v_gecici_sifre boolean := coalesce((new.raw_user_meta_data->>'gecici_sifre')::boolean, false);
begin
  insert into public.profiles (id, ad, email, telefon, role, gecici_sifre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'ad', new.email),
    new.email,
    new.raw_user_meta_data->>'telefon',
    v_role,
    v_gecici_sifre
  );

  if v_role = 'ogrenci' then
    v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;
    v_ad := new.raw_user_meta_data->>'ad';

    if not v_admin_ekledi
       and exists (select 1 from public.izinli_ogrenciler where school_id = v_school_id)
       and not exists (select 1 from public.izinli_ogrenciler where school_id = v_school_id and ad_soyad = v_ad) then
      raise exception 'Bu isim okulun kayıtlı öğrenci listesinde bulunamadı. Lütfen öğretmeninizle/okul yönetimiyle iletişime geçin.';
    end if;

    insert into public.students (id, school_id, class_id, okul_no, ayt_alan, hedef_bolum, veri_giris_sikligi)
    values (
      new.id,
      v_school_id,
      (new.raw_user_meta_data->>'class_id')::uuid,
      new.raw_user_meta_data->>'okul_no',
      (new.raw_user_meta_data->>'ayt_alan')::public.ayt_alan,
      coalesce(new.raw_user_meta_data->>'hedef_bolum', ''),
      coalesce((new.raw_user_meta_data->>'veri_giris_sikligi')::public.veri_giris_sikligi, 'haftalik')
    );
  elsif v_role = 'ogretmen' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (
      new.id,
      (new.raw_user_meta_data->>'school_id')::uuid,
      nullif(new.raw_user_meta_data->>'class_id', '')::uuid,
      coalesce(new.raw_user_meta_data->>'brans', '')
    );
  elsif v_role = 'mudur' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (new.id, (new.raw_user_meta_data->>'school_id')::uuid, null, 'Müdür');
  elsif v_role = 'veli' and new.raw_user_meta_data->>'request_id' is not null then
    select * into v_request
    from public.veli_link_requests
    where id = (new.raw_user_meta_data->>'request_id')::uuid
      and durum = 'onaylandi';

    if found then
      insert into public.parent_students (parent_id, student_id)
      values (new.id, v_request.student_id)
      on conflict do nothing;

      update public.veli_link_requests set durum = 'kullanildi' where id = v_request.id;
    end if;
  end if;

  return new;
end;
$$;

-- ==== 0028_sure_ust_sinir_guncelleme.sql ====
-- Deneme süresi üst sınırı 300 -> 165 dakikaya çekildi. Soru çözümü süresi
-- artık sabit bir üst sınır yerine, toplam soru sayısının (doğru+yanlış) iki
-- katıyla sınırlanıyor (bkz. src/app/dashboard/veri-actions.ts).
-- Eski constraint'leri kaldırıp yenilerini ekliyoruz (aynı isimle DROP+ADD —
-- tablo constraint'i olduğu için migration 0023'teki "must be owner of
-- function" tipi bir sorun beklenmiyor, o sadece fonksiyonlara özeldi).

alter table public.denemeler
  drop constraint if exists denemeler_sure_ust_sinir;
alter table public.denemeler
  add constraint denemeler_sure_ust_sinir check (sure_dakika <= 165) not valid;

alter table public.soru_cozumleri
  drop constraint if exists soru_cozumleri_sure_ust_sinir;
alter table public.soru_cozumleri
  add constraint soru_cozumleri_sure_ust_sinir check (sure_dakika <= 2 * (dogru + yanlis)) not valid;

-- ==== 0029_rozet_sistemi_v2.sql ====
-- Rozet sistemi v2 — kökten yeniden tasarım (kullanıcı notu:
-- dokumanlar/NOT_DEFTERİ.txt, "ROZET SİSTEMİ" bölümü).
--
-- v1'in açığı: aktif gün sayımı `tarih` alanına göre yapılıyordu ve bu alan
-- sınırsız geriye dönük girilebiliyordu — bir öğrenci tek oturumda 29 farklı
-- geçmiş güne veri girip bir sonraki gerçek girişiyle anında altın rozeti
-- alabiliyordu.
--
-- v2 tasarımı:
--   * 3 bağımsız kategori (konu/soru/deneme), her biri kendi eşiklerine
--     sahip; üstte bunlardan türetilen tek bir "genel" (SG EDUCOACH) rozeti
--     — 3/3 kategori altın -> altın, 2/3 -> gümüş, 1/3 -> bronz.
--   * Rozetler KALICI DEĞİL, CANLI durum: Duolingo mantığıyla, öğrenci pas
--     geçtiğinde seviye düşebilir/sıfırlanabilir. Bu yüzden görüntüleme
--     HER ZAMAN canlı hesaplanıyor (ogrenci_rozet_durumu); saklanan tablo
--     sadece "bir önceki bilinen seviye neydi" bilgisini tutup yükseliş
--     anını (bildirim için) yakalamaya yarıyor.
--   * Geriye dönük veri girişi artık SINIRLI: konu/soru en fazla 3 gün,
--     deneme en fazla 7 gün geriye. Bu, hem tarih seçicide (client) hem
--     server action'da hem burada DB constraint'inde uygulanıyor — böylece
--     `tarih` alanına artık güvenilebiliyor, ayrı bir created_at mantığı
--     kurmaya gerek kalmadı.

-- ============ Eski şemayı temizle ============
-- student_badges boş (hiç gerçek kullanıcı rozet kazanmadı) — güvenle
-- kaldırılıyor. Eski RPC'ler (ogrenci_aktif_gun_sayisi_pencere) DROP
-- edilmiyor, sadece artık çağrılmıyor (zararsız, kullanılmayan kod).
drop table if exists public.student_badges;

-- ============ Geriye dönük tarih sınırı (DB seviyesi) ============
alter table public.konu_calismalar
  add constraint konu_calismalar_gecmis_sinir check (tarih >= current_date - 3) not valid;
alter table public.soru_cozumleri
  add constraint soru_cozumleri_gecmis_sinir check (tarih >= current_date - 3) not valid;
alter table public.denemeler
  add constraint denemeler_gecmis_sinir check (tarih >= current_date - 7) not valid;

-- ============ Yeni durum tablosu ============
-- Sadece rozet_kontrol_et() tarafından yazılır (security definer) — client
-- doğrudan yazamaz/okuyamaz, tamamen dahili bir "son bilinen seviye" önbelleği.
create table public.student_rozet_durumu (
  student_id uuid not null references public.students(id) on delete cascade,
  kategori text not null check (kategori in ('konu', 'soru', 'deneme', 'genel')),
  seviye text not null check (seviye in ('yok', 'bronz', 'gumus', 'altin')),
  guncellenme_at timestamptz not null default now(),
  primary key (student_id, kategori)
);

alter table public.student_rozet_durumu enable row level security;
-- Kasıtlı olarak hiç policy yok — okuma/yazma sadece security definer
-- RPC'ler üzerinden.

-- ============ Yardımcı: seviye sıralaması ============
create or replace function public.rozet_seviye_sirasi(p_seviye text)
returns int
language sql
immutable
as $$
  select case p_seviye when 'altin' then 3 when 'gumus' then 2 when 'bronz' then 1 else 0 end;
$$;

-- ============ Konu Çalışma seviyesi ============
-- "Duolingo" mantığı: son 30 günde, aralarında 3 günden uzun boşluk
-- olmayan en güncel "aktif gün" serisinin uzunluğuna bakılıyor. 3 günden
-- uzun süredir hiç giriş yoksa (backdating penceresi de kapandığı için artık
-- telafi edilemez) seviye anında 'yok'a düşüyor.
create or replace function public.ogrenci_konu_seviyesi(p_student_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
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
  end;
$$;

revoke all on function public.ogrenci_konu_seviyesi(uuid) from public;
grant execute on function public.ogrenci_konu_seviyesi(uuid) to authenticated;

-- ============ Soru Çözümü seviyesi ============
-- TYT'nin 5 çekirdek dersinde (Türkçe/Matematik/Fizik/Kimya/Biyoloji) AYRI
-- AYRI son 3 günün toplamına bakılıyor; en düşük ders eşiği geçmeden tier
-- atlanmıyor (girilmemiş ders 0 kabul edilir).
create or replace function public.ogrenci_soru_seviyesi(p_student_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  with tum_dersler as (
    select unnest(array['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji']) as ders
  ),
  toplamlar as (
    select ders, sum(dogru + yanlis) as toplam
    from public.soru_cozumleri
    where student_id = p_student_id and tarih between current_date - 3 and current_date
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
  end;
$$;

revoke all on function public.ogrenci_soru_seviyesi(uuid) from public;
grant execute on function public.ogrenci_soru_seviyesi(uuid) to authenticated;

-- ============ Deneme seviyesi ============
-- Kayan 30 günde toplam deneme girişi sayısı.
create or replace function public.ogrenci_deneme_seviyesi(p_student_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when count(*) >= 8 then 'altin'
    when count(*) >= 4 then 'gumus'
    when count(*) >= 3 then 'bronz'
    else 'yok'
  end
  from public.denemeler
  where student_id = p_student_id and tarih between current_date - 30 and current_date;
$$;

revoke all on function public.ogrenci_deneme_seviyesi(uuid) from public;
grant execute on function public.ogrenci_deneme_seviyesi(uuid) to authenticated;

-- ============ Canlı özet (görüntüleme için) ============
-- Dashboard/veli/öğretmen görünümü HER ZAMAN bunu çağırır — saklanan
-- student_rozet_durumu tablosunu DEĞİL, çünkü o sadece son giriş anındaki
-- durumu tutar ve öğrenci pas geçtiğinde otomatik güncellenmez.
create or replace function public.ogrenci_rozet_durumu(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_konu text; v_soru text; v_deneme text; v_altin_sayisi int; v_genel text;
begin
  if not (public.has_student_access(p_student_id) or public.is_ogretmen()) then
    raise exception 'Yetkisiz.';
  end if;

  v_konu := public.ogrenci_konu_seviyesi(p_student_id);
  v_soru := public.ogrenci_soru_seviyesi(p_student_id);
  v_deneme := public.ogrenci_deneme_seviyesi(p_student_id);

  v_altin_sayisi := (case when v_konu = 'altin' then 1 else 0 end)
                  + (case when v_soru = 'altin' then 1 else 0 end)
                  + (case when v_deneme = 'altin' then 1 else 0 end);
  v_genel := case v_altin_sayisi when 3 then 'altin' when 2 then 'gumus' when 1 then 'bronz' else 'yok' end;

  return jsonb_build_object('konu', v_konu, 'soru', v_soru, 'deneme', v_deneme, 'genel', v_genel);
end;
$$;

revoke all on function public.ogrenci_rozet_durumu(uuid) from public;
grant execute on function public.ogrenci_rozet_durumu(uuid) to authenticated;

-- ============ Kontrol + bildirim tetikleyici ============
-- Her veri girişinden sonra çağrılır (aynı imza, CREATE OR REPLACE —
-- migration 0023'teki "must be owner of function" tipi sorunları önlemek
-- için DROP FUNCTION kullanılmıyor). Önceki bilinen seviyeleri okuyup
-- yenileriyle karşılaştırıyor, student_rozet_durumu'nu güncelliyor, ve
-- SADECE YÜKSELENLERİ "kategori:seviye" formatında döndürüyor (düşüşler
-- sessiz — bildirim yok, sadece bir sonraki görüntülemede düşük gösterilir).
create or replace function public.rozet_kontrol_et(p_student_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yeni_konu text; v_yeni_soru text; v_yeni_deneme text; v_yeni_genel text;
  v_eski_konu text; v_eski_soru text; v_eski_deneme text; v_eski_genel text;
  v_altin_sayisi int;
  v_yukselenler text[] := '{}';
begin
  if p_student_id <> auth.uid() then
    raise exception 'Yetkisiz.';
  end if;

  select coalesce(max(seviye) filter (where kategori = 'konu'), 'yok'),
         coalesce(max(seviye) filter (where kategori = 'soru'), 'yok'),
         coalesce(max(seviye) filter (where kategori = 'deneme'), 'yok'),
         coalesce(max(seviye) filter (where kategori = 'genel'), 'yok')
    into v_eski_konu, v_eski_soru, v_eski_deneme, v_eski_genel
  from public.student_rozet_durumu where student_id = p_student_id;

  v_yeni_konu := public.ogrenci_konu_seviyesi(p_student_id);
  v_yeni_soru := public.ogrenci_soru_seviyesi(p_student_id);
  v_yeni_deneme := public.ogrenci_deneme_seviyesi(p_student_id);

  v_altin_sayisi := (case when v_yeni_konu = 'altin' then 1 else 0 end)
                  + (case when v_yeni_soru = 'altin' then 1 else 0 end)
                  + (case when v_yeni_deneme = 'altin' then 1 else 0 end);
  v_yeni_genel := case v_altin_sayisi when 3 then 'altin' when 2 then 'gumus' when 1 then 'bronz' else 'yok' end;

  insert into public.student_rozet_durumu (student_id, kategori, seviye, guncellenme_at) values
    (p_student_id, 'konu', v_yeni_konu, now()),
    (p_student_id, 'soru', v_yeni_soru, now()),
    (p_student_id, 'deneme', v_yeni_deneme, now()),
    (p_student_id, 'genel', v_yeni_genel, now())
  on conflict (student_id, kategori) do update set seviye = excluded.seviye, guncellenme_at = excluded.guncellenme_at;

  if public.rozet_seviye_sirasi(v_yeni_konu) > public.rozet_seviye_sirasi(v_eski_konu) then
    v_yukselenler := array_append(v_yukselenler, 'konu:' || v_yeni_konu);
  end if;
  if public.rozet_seviye_sirasi(v_yeni_soru) > public.rozet_seviye_sirasi(v_eski_soru) then
    v_yukselenler := array_append(v_yukselenler, 'soru:' || v_yeni_soru);
  end if;
  if public.rozet_seviye_sirasi(v_yeni_deneme) > public.rozet_seviye_sirasi(v_eski_deneme) then
    v_yukselenler := array_append(v_yukselenler, 'deneme:' || v_yeni_deneme);
  end if;
  if public.rozet_seviye_sirasi(v_yeni_genel) > public.rozet_seviye_sirasi(v_eski_genel) then
    v_yukselenler := array_append(v_yukselenler, 'genel:' || v_yeni_genel);
  end if;

  return v_yukselenler;
end;
$$;

-- ==== 0030_kategori_bazli_hatirlatma.sql ====
-- Rozet sistemi v2 ile birlikte hatırlatma sistemi de kategori bazlı oldu:
-- tek bir "3 gündür veri girmiyor" kuralı yerine, her kategorinin kendi eşiği
-- var (konu/soru 3 gün, deneme 7 gün — bkz. KATEGORI_GERIYE_DONUK_SINIR).
-- Eski tek deadline kolonunu bırakıyoruz (zararsız, artık kullanılmıyor),
-- her kategori için ayrı bir "bir sonraki hatırlatma ne zaman gönderilebilir"
-- kolonu ekliyoruz (art arda her gün spam göndermemek için).
alter table public.students
  add column if not exists son_hatirlatma_konu_deadline timestamptz,
  add column if not exists son_hatirlatma_soru_deadline timestamptz,
  add column if not exists son_hatirlatma_deneme_deadline timestamptz;

-- ==== 0031_duyuru_kutusu.sql ====
-- "Mesajınız var" kutusu — push bildirimine EK olarak (yerine değil), her
-- duyuruGonder çağrısı artık alıcıları burada da kalıcı olarak kaydediyor.
-- Push kaçırılsa bile (izin yok, bildirim silindi, telefon kapalıydı) mesaj
-- header'daki ikonla görülebiliyor.
--
-- Basit tasarım: duyurular (tek satır = tek gönderim) + duyuru_aliciler
-- (kime gitti + okundu mu). Alıcı listesi, push'un GERÇEKTEN gittiği aynı
-- profil id listesi (öğrenci + bağlı veliler) — kapsam mantığını burada
-- tekrar etmiyoruz, src/lib/push-send.ts'teki duyuruGonder tek yerden
-- besliyor.
create table public.duyurular (
  id uuid primary key default gen_random_uuid(),
  gonderen_id uuid references public.profiles(id) on delete set null,
  baslik text not null,
  mesaj text not null,
  created_at timestamptz not null default now()
);

create table public.duyuru_aliciler (
  duyuru_id uuid not null references public.duyurular(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  okundu boolean not null default false,
  primary key (duyuru_id, profile_id)
);

create index on public.duyuru_aliciler (profile_id, okundu);

alter table public.duyurular enable row level security;
alter table public.duyuru_aliciler enable row level security;

-- Bir duyuruyu sadece gerçek bir alıcısıysan görebiliyorsun.
create policy "duyurular_select_alici" on public.duyurular
  for select using (
    exists (select 1 from public.duyuru_aliciler da where da.duyuru_id = duyurular.id and da.profile_id = auth.uid())
  );

-- Kendi alıcı satırını görebilir ve "okundu" bayrağını kendisi
-- güncelleyebilir (mesajı açınca) — başka hiçbir alanı değiştiremez, insert/
-- delete client'a kapalı (sadece service-role, duyuruGonder üzerinden).
create policy "duyuru_aliciler_select_own" on public.duyuru_aliciler
  for select using (profile_id = auth.uid());
create policy "duyuru_aliciler_update_own" on public.duyuru_aliciler
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ==== 0032_ogrenci_email_resolver_fix.sql ====
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

-- ==== 0033_kullanici_silme_fk.sql ====
-- Bir öğretmen hesabı kalıcı silindiğinde geçmiş veli talepleri korunsun;
-- yalnızca talebi onaylayan kullanıcı bağlantısı boşaltılsın.
alter table public.veli_link_requests
  drop constraint if exists veli_link_requests_onaylayan_ogretmen_id_fkey;

alter table public.veli_link_requests
  add constraint veli_link_requests_onaylayan_ogretmen_id_fkey
  foreign key (onaylayan_ogretmen_id)
  references public.profiles(id)
  on delete set null;
