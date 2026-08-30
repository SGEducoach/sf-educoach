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
  seviye text not null check (seviye in ('9', '10', '11', '12')),
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
  -- Yayınevi: serbest metin, zorunlu (bkz. migration 0044 — sabit liste
  -- bilinçli olarak kullanılmıyor).
  yayinevi text not null,
  created_at timestamptz not null default now()
);

create table public.soru_cozumleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null default current_date,
  ders text not null,
  dogru integer not null check (dogru >= 0),
  yanlis integer not null check (yanlis >= 0),
  -- Boş (cevapsız) sayısı — Doğru/Yanlış/Boş revizyonu, migration 0044.
  bos integer not null default 0 check (bos >= 0),
  sure_dakika integer not null check (sure_dakika > 0),
  -- "Soru çözüm sayım" (Az/Orta/Çok) self-rating kaldırıldı (migration
  -- 0044) — bu tabloda artık hedefe_yakinlik YOK, konu_calismalar ve
  -- denemeler'de hâlâ var.
  konu text,
  yayinevi text not null,
  -- Bu kaydın öğrencinin kendi girişi mi yoksa bir görevin karşılığı mı
  -- olduğunu ayırt eder (Görevler alt sistemi, Faz 3).
  kaynak text not null default 'ogrenci' check (kaynak in ('ogrenci', 'ogretmen')),
  created_at timestamptz not null default now()
);

create table public.denemeler (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null default current_date,
  tur public.deneme_turu not null,
  -- Süre alanı formdan kaldırıldı (migration 0044) — nullable, yeni
  -- kayıtlarda artık girilmiyor.
  sure_dakika integer check (sure_dakika > 0),
  hedefe_yakinlik public.hedefe_yakinlik not null,
  yayinevi text not null,
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

-- ==== 0034_ad_esleme_ve_baslik.sql ====
-- Adları "Ad Soyad" biçiminde saklar; izinli öğrenci kaydında ise büyük/küçük
-- harfi önemsemeden, soyadı aynı olmak şartıyla iki isimden herhangi birini
-- kabul eder. Eşleşme sonrası profile izinli listedeki tam resmi ad yazılır.

create or replace function public.ad_esleme_anahtari(p_ad text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(regexp_replace(translate(lower(coalesce(p_ad, '')), 'ı̇', 'i'), '\s+', ' ', 'g'));
$$;

create or replace function public.ad_baslik(p_ad text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_kelime text;
  v_sonuc text := '';
begin
  foreach v_kelime in array regexp_split_to_array(trim(regexp_replace(coalesce(p_ad, ''), '\s+', ' ', 'g')), ' ')
  loop
    v_sonuc := v_sonuc || case when v_sonuc = '' then '' else ' ' end
      || upper(left(v_kelime, 1)) || lower(substr(v_kelime, 2));
  end loop;
  return v_sonuc;
end;
$$;

-- Normalizasyon sonrası aynı kişiye dönüşen mükerrer izin satırlarını temizle.
delete from public.izinli_ogrenciler a
using public.izinli_ogrenciler b
where a.school_id = b.school_id
  and public.ad_esleme_anahtari(a.ad_soyad) = public.ad_esleme_anahtari(b.ad_soyad)
  and a.id > b.id;

update public.izinli_ogrenciler set ad_soyad = public.ad_baslik(ad_soyad);
update public.profiles set ad = public.ad_baslik(ad) where ad is not null;

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
  v_girilen_ad text := coalesce(new.raw_user_meta_data->>'ad', new.email);
  v_profile_ad text;
  v_izinli_ad text;
  v_admin_ekledi boolean := coalesce((new.raw_user_meta_data->>'admin_ekledi')::boolean, false);
  v_gecici_sifre boolean := coalesce((new.raw_user_meta_data->>'gecici_sifre')::boolean, false);
begin
  v_profile_ad := public.ad_baslik(v_girilen_ad);

  if v_role = 'ogrenci' then
    v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;

    if not v_admin_ekledi and exists (
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

-- ==== 0035_veli_kodu_mesaj_ve_guvenlik.sql ====
-- Tam içerik: supabase/migrations/0035_veli_kodu_mesaj_ve_guvenlik.sql

alter table public.veli_link_requests add column if not exists kod_expires_at timestamptz;
alter table public.duyurular add column if not exists veli_request_id uuid references public.veli_link_requests(id) on delete cascade;
create unique index if not exists duyurular_veli_request_id_unique on public.duyurular (veli_request_id) where veli_request_id is not null;
drop policy if exists "veli_link_requests_insert_public" on public.veli_link_requests;
revoke execute on function public.find_student_id_by_okul_no(uuid, text) from anon, authenticated;
update public.veli_link_requests set kod_expires_at = coalesce(onaylanma_at, now()) + interval '48 hours'
  where durum = 'onaylandi' and kod_expires_at is null;

create or replace function public.veli_talep_mesaji_yonet()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_duyuru_id uuid;
begin
  if new.durum = 'onaylandi' and old.durum is distinct from 'onaylandi' then
    delete from public.duyurular where veli_request_id = new.id;
    insert into public.duyurular (gonderen_id, baslik, mesaj, veli_request_id)
    values (new.onaylayan_ogretmen_id, 'Veli bağlantı kodu oluşturuldu',
      'Velinizin bağlantı kodu: ' || new.kod || E'\nBu kodu yalnız velinizle kimliğini doğruladıktan sonra paylaşın. Kodun ekran görüntüsünü veya mesajını başkalarına göndermeyin. İlk kayıt 48 saat içinde tamamlanmalıdır.', new.id)
    returning id into v_duyuru_id;
    insert into public.duyuru_aliciler (duyuru_id, profile_id) values (v_duyuru_id, new.student_id);
  elsif new.durum = 'kullanildi' and old.durum is distinct from 'kullanildi' then
    delete from public.duyurular where veli_request_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists veli_talep_mesaji_yonet_trg on public.veli_link_requests;
create trigger veli_talep_mesaji_yonet_trg after update of durum on public.veli_link_requests
  for each row execute function public.veli_talep_mesaji_yonet();

create or replace function public.veli_talep_onayla(p_request_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_kod text; v_guncellendi uuid;
begin
  if not exists (select 1 from public.veli_link_requests r
    join public.students s on s.id = r.student_id join public.teachers t on t.class_id = s.class_id
    where r.id = p_request_id and r.durum = 'bekliyor' and t.id = auth.uid())
  then raise exception 'Bu talep bulunamadı, daha önce işlendi veya onaylama yetkiniz yok.'; end if;
  v_kod := upper(encode(gen_random_bytes(6), 'hex'));
  update public.veli_link_requests set durum = 'onaylandi', kod = v_kod,
    onaylayan_ogretmen_id = auth.uid(), onaylanma_at = now(), kod_expires_at = now() + interval '48 hours'
  where id = p_request_id and durum = 'bekliyor' returning id into v_guncellendi;
  if v_guncellendi is null then raise exception 'Talep daha önce işlenmiş.'; end if;
  return v_kod;
end;
$$;
revoke all on function public.veli_talep_onayla(uuid) from public;
grant execute on function public.veli_talep_onayla(uuid) to authenticated;

create or replace function public.resolve_veli_login(p_school_id uuid, p_okul_no text, p_kod text)
returns text language sql security definer set search_path = public stable as $$
  select 'veli+' || r.id::text || '@sgeducoach.internal'
  from public.veli_link_requests r join public.students s on s.id = r.student_id
  where s.school_id = p_school_id and s.okul_no = p_okul_no and r.kod = upper(trim(p_kod))
    and ((r.durum = 'onaylandi' and r.kod_expires_at > now()) or r.durum = 'kullanildi') limit 1;
$$;
revoke all on function public.resolve_veli_login(uuid, text, text) from public;
grant execute on function public.resolve_veli_login(uuid, text, text) to anon, authenticated;

-- ==== 0036_okul_moderatoru.sql ====
create table if not exists public.school_moderators (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
create index if not exists school_moderators_school_id_idx on public.school_moderators(school_id);
alter table public.school_moderators enable row level security;
drop policy if exists "school_moderators_select_own_or_admin" on public.school_moderators;
create policy "school_moderators_select_own_or_admin" on public.school_moderators for select using (profile_id = auth.uid() or public.is_admin());
drop policy if exists "school_moderators_admin_all" on public.school_moderators;
create policy "school_moderators_admin_all" on public.school_moderators for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.is_school_moderator(p_school_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.school_moderators where profile_id = auth.uid() and school_id = p_school_id);
$$;
revoke all on function public.is_school_moderator(uuid) from public;
grant execute on function public.is_school_moderator(uuid) to authenticated;
drop policy if exists "students_select_school_moderator" on public.students;
create policy "students_select_school_moderator" on public.students for select using (public.is_school_moderator(school_id));
drop policy if exists "teachers_select_school_moderator" on public.teachers;
create policy "teachers_select_school_moderator" on public.teachers for select using (public.is_school_moderator(school_id));
drop policy if exists "veli_requests_select_school_moderator" on public.veli_link_requests;
create policy "veli_requests_select_school_moderator" on public.veli_link_requests for select using (exists (
  select 1 from public.students s where s.id = student_id and public.is_school_moderator(s.school_id)
));
do $$
declare v_profile_id uuid; v_school_id uuid; v_count int;
begin
  select count(*), (array_agg(p.id))[1], (array_agg(s.id))[1] into v_count, v_profile_id, v_school_id
  from public.profiles p join public.teachers t on t.id = p.id join public.schools s on s.id = t.school_id
  where public.ad_esleme_anahtari(p.ad) = public.ad_esleme_anahtari('Furkan Durmaz')
    and public.ad_esleme_anahtari(s.ad) like '%elbistan%fen%lisesi%';
  if v_count <> 1 then raise exception 'Furkan Durmaz / Elbistan Fen Lisesi için tekil öğretmen bulunamadı (eşleşme: %).', v_count; end if;
  insert into public.school_moderators(profile_id, school_id) values (v_profile_id, v_school_id)
  on conflict (profile_id) do update set school_id = excluded.school_id;
end;
$$;

-- ============ deneme_bildirimleri (0039) ============
-- Toplu deneme sonucu girişinin ardından veliye/öğrenciye/sınıf öğretmenine
-- gönderilen "sonuç yüklendi" / "sonuç yüklenmedi" bildirimlerinin tekilliğini
-- takip eder. "Bildirim gönder" butonu aynı sınıf/tarih/tür için tekrar
-- tıklanırsa, durumu değişmeyen öğrenciye ikinci kez bildirim gitmesin diye
-- bu tablo referans alınıyor. Durum 'girilmedi'den 'girildi'ye yükseldiğinde
-- (sonradan sonuç girildiğinde) yeniden bildirim gönderilip satır güncellenir.
create table public.deneme_bildirimleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null,
  tur public.deneme_turu not null,
  durum text not null check (durum in ('girildi', 'girilmedi')),
  gonderen_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, tarih, tur)
);

create index on public.deneme_bildirimleri (student_id, tarih, tur);

alter table public.deneme_bildirimleri enable row level security;

create policy "deneme_bildirimleri_select_admin" on public.deneme_bildirimleri
  for select using (public.is_admin());

create policy "deneme_bildirimleri_insert_admin" on public.deneme_bildirimleri
  for insert with check (public.is_admin());

create policy "deneme_bildirimleri_update_admin" on public.deneme_bildirimleri
  for update using (public.is_admin()) with check (public.is_admin());

-- ============ 9-10. sınıf deneme rozeti eşikleri (0043) ============
-- 11-12 eşikleri (3/4/8, kayan 30 gün) değişmedi; 9-10 için aynı pencerede
-- daha düşük eşikler (1/2/3) uygulanıyor (bkz. kullanıcı notu, migration 0043).
create or replace function public.ogrenci_deneme_seviyesi(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_seviye text;
  v_sayi int;
begin
  select c.seviye into v_seviye
  from public.students s
  left join public.classes c on c.id = s.class_id
  where s.id = p_student_id;

  select count(*) into v_sayi
  from public.denemeler
  where student_id = p_student_id and tarih between current_date - 30 and current_date;

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

revoke all on function public.ogrenci_deneme_seviyesi(uuid) from public;
grant execute on function public.ogrenci_deneme_seviyesi(uuid) to authenticated;

-- ============ handle_new_user 9-10. sınıf izinli-liste muafiyeti (0042) ============
-- 9 ve 10. sınıf için izinli öğrenci listesi henüz hazırlanmadığından, bu
-- sınıflardaki self-signup kayıtları listeye-göre-doğrulama adımından
-- muaf tutuluyor (v_class_seviye kontrolü dışında fonksiyon 0034'teki
-- hâliyle aynı).
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

-- ============ login_attempt_limits (0037 + 0040) ============
-- Sunucu taraflı kaba kuvvet koruması: IP+rol+kimlik hash'i başına başarısız
-- deneme sayacı. 5 başarısız denemede engellenir; block_count aynı
-- attempt_key art arda kaç kez engellendiğini tutar ve her yeni engelde
-- süre katlanarak artar (kademeli artış, 0040).
create table if not exists public.login_attempt_limits (
  attempt_key text primary key,
  failed_count integer not null default 0 check (failed_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  block_count integer not null default 0 check (block_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.login_attempt_limits enable row level security;
revoke all on table public.login_attempt_limits from anon, authenticated;

create index if not exists login_attempt_limits_cleanup_idx
  on public.login_attempt_limits (updated_at);

comment on table public.login_attempt_limits is
  'Stores hashed application login attempt keys for server-side brute-force protection.';

-- ============ Faz 2 (yenilikler_1.txt §4, migration 0045) ============
-- Öğretmenin branş dersi verdiği sınıflar (çoklu) — teachers.class_id
-- (homeroom, tekil, admin-only) ile karıştırılmasın.
create table public.ogretmen_dersleri (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  ders text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, class_id, ders)
);

alter table public.ogretmen_dersleri enable row level security;

create policy "ogretmen_dersleri_select_own" on public.ogretmen_dersleri
  for select using (teacher_id = auth.uid());
create policy "ogretmen_dersleri_select_admin" on public.ogretmen_dersleri
  for select using (public.is_admin());
create policy "ogretmen_dersleri_insert_own" on public.ogretmen_dersleri
  for insert with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.teachers t
      join public.classes c on c.school_id = t.school_id
      where t.id = auth.uid() and c.id = ogretmen_dersleri.class_id
    )
  );
create policy "ogretmen_dersleri_delete_own" on public.ogretmen_dersleri
  for delete using (teacher_id = auth.uid());
create policy "ogretmen_dersleri_admin_all" on public.ogretmen_dersleri
  for all using (public.is_admin()) with check (public.is_admin());

-- Öğrenci sınıf transferi ("öğrenci ekle/çıkar" — kullanıcı kararı: transfer,
-- students.class_id NOT NULL kalıyor). Sınıf öğretmeni sadece KENDİ
-- sınıfındaki bir öğrenciyi aynı okuldaki başka bir sınıfa taşıyabilir.
create policy "students_update_sinif_ogretmeni" on public.students
  for update
  using (
    exists (select 1 from public.teachers t where t.id = auth.uid() and t.class_id = students.class_id)
  )
  with check (
    exists (select 1 from public.classes c where c.id = students.class_id and c.school_id = students.school_id)
  );

create or replace function public.students_transfer_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.school_id is distinct from old.school_id
     or new.okul_no is distinct from old.okul_no
     or new.ayt_alan is distinct from old.ayt_alan
     or new.hedef_bolum is distinct from old.hedef_bolum
     or new.veri_giris_sikligi is distinct from old.veri_giris_sikligi then
    raise exception 'Bu işlemle yalnızca sınıf değiştirilebilir.';
  end if;
  return new;
end;
$$;

drop trigger if exists students_transfer_guard on public.students;
create trigger students_transfer_guard
  before update on public.students
  for each row execute function public.students_transfer_guard();

-- Soru çözümü "gördüm" onayı (öğretmen paneli, bekleyen iş sayacı).
alter table public.soru_cozumleri add column onaylandi_mi boolean not null default false;
alter table public.soru_cozumleri add column onaylayan_id uuid references public.profiles(id);
alter table public.soru_cozumleri add column onaylanma_at timestamptz;

create policy "soru_cozumleri_update_ogretmen_onay" on public.soru_cozumleri
  for update using (
    exists (
      select 1 from public.students s
      join public.teachers t on t.class_id = s.class_id
      where s.id = soru_cozumleri.student_id and t.id = auth.uid()
    )
  );

create or replace function public.soru_cozumleri_onay_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.student_id is distinct from old.student_id
     or new.tarih is distinct from old.tarih
     or new.ders is distinct from old.ders
     or new.dogru is distinct from old.dogru
     or new.yanlis is distinct from old.yanlis
     or new.bos is distinct from old.bos
     or new.sure_dakika is distinct from old.sure_dakika
     or new.konu is distinct from old.konu
     or new.yayinevi is distinct from old.yayinevi
     or new.kaynak is distinct from old.kaynak then
    raise exception 'Bu işlemle yalnızca onay bilgisi güncellenebilir.';
  end if;
  return new;
end;
$$;

drop trigger if exists soru_cozumleri_onay_guard on public.soru_cozumleri;
create trigger soru_cozumleri_onay_guard
  before update on public.soru_cozumleri
  for each row execute function public.soru_cozumleri_onay_guard();

-- ============ Faz 2 hotfix (migration 0046) ============
-- "geriye dönük giriş sınırı" CHECK constraint'leri UPDATE'te de
-- tetikleniyordu (ör. "Gördüm" onayı, 3 günden eski kayıtlarda patlıyordu)
-- — INSERT-only trigger'a taşındı, orijinal CHECK constraint'ler drop edildi.
create or replace function public.gecmis_tarih_sinir_kontrol()
returns trigger
language plpgsql
as $$
declare
  v_sinir_gun integer := TG_ARGV[0]::integer;
begin
  if new.tarih < current_date - v_sinir_gun then
    raise exception 'En fazla % gün geriye dönük giriş yapılabilir.', v_sinir_gun;
  end if;
  return new;
end;
$$;

alter table public.konu_calismalar drop constraint if exists konu_calismalar_gecmis_sinir;
drop trigger if exists konu_calismalar_gecmis_sinir_trg on public.konu_calismalar;
create trigger konu_calismalar_gecmis_sinir_trg
  before insert on public.konu_calismalar
  for each row execute function public.gecmis_tarih_sinir_kontrol(3);

alter table public.soru_cozumleri drop constraint if exists soru_cozumleri_gecmis_sinir;
drop trigger if exists soru_cozumleri_gecmis_sinir_trg on public.soru_cozumleri;
create trigger soru_cozumleri_gecmis_sinir_trg
  before insert on public.soru_cozumleri
  for each row execute function public.gecmis_tarih_sinir_kontrol(3);

alter table public.denemeler drop constraint if exists denemeler_gecmis_sinir;
drop trigger if exists denemeler_gecmis_sinir_trg on public.denemeler;
create trigger denemeler_gecmis_sinir_trg
  before insert on public.denemeler
  for each row execute function public.gecmis_tarih_sinir_kontrol(7);

-- ============ Faz 3 (yenilikler_1.txt §4-6, migration 0047): Görevler ============
create type public.gorev_turu as enum ('konu', 'soru', 'deneme');
create type public.gorev_durumu as enum ('bekliyor', 'tamamlandi', 'tamamlanmadi');

create table public.gorevler (
  id uuid primary key default gen_random_uuid(),
  olusturan_ogretmen_id uuid not null references public.teachers(id) on delete cascade,
  tur public.gorev_turu not null,
  ders text not null,
  konu text,
  hedef_soru_sayisi integer check (hedef_soru_sayisi is null or hedef_soru_sayisi > 0),
  hedef_dakika integer check (hedef_dakika is null or hedef_dakika > 0),
  tarih date not null,
  son_tarih date not null default current_date,
  baslangic_saat time,
  bitis_saat time,
  aciklama text,
  created_at timestamptz not null default now(),
  constraint gorevler_son_tarih_sirali check (son_tarih >= tarih)
);

create table public.gorev_atamalari (
  id uuid primary key default gen_random_uuid(),
  gorev_id uuid not null references public.gorevler(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  durum public.gorev_durumu not null default 'bekliyor',
  created_at timestamptz not null default now(),
  unique (gorev_id, student_id)
);

create index on public.gorev_atamalari (student_id, durum);
create index on public.gorevler (tarih);

alter table public.gorevler enable row level security;
alter table public.gorev_atamalari enable row level security;

create policy "gorevler_select_related" on public.gorevler
  for select using (
    olusturan_ogretmen_id = auth.uid()
    or exists (select 1 from public.gorev_atamalari ga where ga.gorev_id = gorevler.id and ga.student_id = auth.uid())
    or exists (
      select 1 from public.gorev_atamalari ga
      join public.parent_students ps on ps.student_id = ga.student_id
      where ga.gorev_id = gorevler.id and ps.parent_id = auth.uid()
    )
  );
create policy "gorevler_insert_own" on public.gorevler
  for insert with check (olusturan_ogretmen_id = auth.uid());

create policy "gorev_atamalari_select_related" on public.gorev_atamalari
  for select using (
    student_id = auth.uid()
    or exists (select 1 from public.gorevler g where g.id = gorev_atamalari.gorev_id and g.olusturan_ogretmen_id = auth.uid())
    or exists (select 1 from public.parent_students ps where ps.student_id = gorev_atamalari.student_id and ps.parent_id = auth.uid())
  );
create policy "gorev_atamalari_insert_own" on public.gorev_atamalari
  for insert with check (
    exists (select 1 from public.gorevler g where g.id = gorev_atamalari.gorev_id and g.olusturan_ogretmen_id = auth.uid())
    and exists (
      select 1 from public.students s
      where s.id = gorev_atamalari.student_id
      and (
        exists (select 1 from public.teachers t where t.id = auth.uid() and t.class_id = s.class_id)
        or exists (select 1 from public.ogretmen_dersleri od where od.teacher_id = auth.uid() and od.class_id = s.class_id)
      )
    )
  );
create policy "gorev_atamalari_update_own" on public.gorev_atamalari
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

alter table public.konu_calismalar add column gorev_atama_id uuid references public.gorev_atamalari(id);
alter table public.soru_cozumleri add column gorev_atama_id uuid references public.gorev_atamalari(id);
alter table public.denemeler add column gorev_atama_id uuid references public.gorev_atamalari(id);

-- ============ Faz 3 hotfix (migration 0048): RLS sonsuz döngü ============
-- gorevler_select_related <-> gorev_atamalari_select_related birbirini
-- doğrudan sorguluyordu ("infinite recursion detected"). SECURITY DEFINER
-- fonksiyonlara taşındı (is_admin() ile aynı desen), döngü kırıldı.
create or replace function public.gorev_ilgili_mi(p_gorev_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.gorev_atamalari ga
    where ga.gorev_id = p_gorev_id
    and (
      ga.student_id = auth.uid()
      or exists (select 1 from public.parent_students ps where ps.student_id = ga.student_id and ps.parent_id = auth.uid())
    )
  );
$$;
revoke all on function public.gorev_ilgili_mi(uuid) from public;
grant execute on function public.gorev_ilgili_mi(uuid) to authenticated;

create or replace function public.gorev_olusturani_mi(p_gorev_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.gorevler g where g.id = p_gorev_id and g.olusturan_ogretmen_id = auth.uid());
$$;
revoke all on function public.gorev_olusturani_mi(uuid) from public;
grant execute on function public.gorev_olusturani_mi(uuid) to authenticated;

drop policy if exists "gorevler_select_related" on public.gorevler;
create policy "gorevler_select_related" on public.gorevler
  for select using (
    olusturan_ogretmen_id = auth.uid()
    or public.gorev_ilgili_mi(id)
  );

drop policy if exists "gorev_atamalari_select_related" on public.gorev_atamalari;
create policy "gorev_atamalari_select_related" on public.gorev_atamalari
  for select using (
    student_id = auth.uid()
    or public.gorev_olusturani_mi(gorev_id)
    or exists (select 1 from public.parent_students ps where ps.student_id = gorev_atamalari.student_id and ps.parent_id = auth.uid())
  );

-- ============ Öğrenci plan ekleme (migration 0049) ============
-- Öğrenci de aynı gorevler/gorev_atamalari tablosuna kendi planını
-- ekleyebiliyor — "kim oluşturdu" öğretmen yerine öğrenci olabiliyor.
-- Öğrenci planında saat aralığı ZORUNLU (öğretmen görevinde opsiyonel
-- kalıyor); çakışma kontrolü uygulama tarafında (gorev-actions.ts).
alter table public.gorevler alter column olusturan_ogretmen_id drop not null;
alter table public.gorevler add column olusturan_ogrenci_id uuid references public.students(id) on delete cascade;

alter table public.gorevler add constraint gorevler_olusturan_tek check (
  (olusturan_ogretmen_id is not null and olusturan_ogrenci_id is null)
  or (olusturan_ogretmen_id is null and olusturan_ogrenci_id is not null)
);
alter table public.gorevler add constraint gorevler_ogrenci_plani_saat_zorunlu check (
  olusturan_ogrenci_id is null or (baslangic_saat is not null and bitis_saat is not null)
);
alter table public.gorevler add constraint gorevler_saat_sirali check (
  baslangic_saat is null or bitis_saat is null or bitis_saat > baslangic_saat
);

drop policy if exists "gorevler_insert_own" on public.gorevler;
create policy "gorevler_insert_own" on public.gorevler
  for insert with check (
    olusturan_ogretmen_id = auth.uid() or olusturan_ogrenci_id = auth.uid()
  );

drop policy if exists "gorev_atamalari_insert_own" on public.gorev_atamalari;
create policy "gorev_atamalari_insert_own" on public.gorev_atamalari
  for insert with check (
    (
      exists (select 1 from public.gorevler g where g.id = gorev_atamalari.gorev_id and g.olusturan_ogretmen_id = auth.uid())
      and exists (
        select 1 from public.students s
        where s.id = gorev_atamalari.student_id
        and (
          exists (select 1 from public.teachers t where t.id = auth.uid() and t.class_id = s.class_id)
          or exists (select 1 from public.ogretmen_dersleri od where od.teacher_id = auth.uid() and od.class_id = s.class_id)
        )
      )
    )
    or (
      student_id = auth.uid()
      and exists (select 1 from public.gorevler g where g.id = gorev_atamalari.gorev_id and g.olusturan_ogrenci_id = auth.uid())
    )
  );

-- ============ Hotfix (migration 0050): kendi oluşturduğunu görme ============
-- .insert().select().single() bir RETURNING'dir — SELECT policy'nin de
-- izin vermesi gerekir. Öğrenci kendi planını eklerken henüz gorev_atamalari
-- yokken (bir sonraki adımda ekleniyor) gorev_ilgili_mi() false dönüyor ve
-- RETURNING başarısız oluyordu ("row violates RLS"). Öğretmen tarafı zaten
-- olusturan_ogretmen_id = auth.uid() ile bu sorunu yaşamıyordu; öğrenci
-- için de aynı doğrudan kontrol eklendi.
drop policy if exists "gorevler_select_related" on public.gorevler;
create policy "gorevler_select_related" on public.gorevler
  for select using (
    olusturan_ogretmen_id = auth.uid()
    or olusturan_ogrenci_id = auth.uid()
    or public.gorev_ilgili_mi(id)
  );

-- ============ Dershane Modu — Faz D1 (migration 0051) ============
-- Kapsam: sadece dershane (schools.tur='dershane'). Okul tarafı bu
-- bölümden etkilenmez. Müdür/moderatör CRUD'u için burada yeni bir RLS
-- politikası/SECURITY DEFINER fonksiyonu YOK — application-layer kontrol
-- (requireDershaneMudur() → service-role client) kullanılıyor, bkz.
-- migration 0051 dosyasındaki not.

-- 1) classes.program (haftaiçi/haftasonu) — nullable, okul şubeleri kullanmaz.
alter table public.classes
  add column if not exists program text check (program in ('haftaici', 'haftasonu'));

-- 2) students.veli_telefon — dershane kaydında toplanan veli telefonu,
--    veli_link_requests.veli_telefon'dan bağımsız.
alter table public.students
  add column if not exists veli_telefon text;

-- 3) okul_no format kontrolü: CHECK (migration 0012) → tur'a duyarlı trigger.
--    Dershane'de okul_no artık "kullanıcı adı" (>=6 karakter, boşluksuz).
alter table public.students drop constraint if exists students_okul_no_format;

create or replace function public.ogrenci_no_format_kontrol()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tur public.kurum_turu;
begin
  select tur into v_tur from public.schools where id = new.school_id;
  if v_tur = 'dershane' then
    if new.okul_no !~ '^[A-Za-z0-9_]{6,}$' then
      raise exception 'Kullanıcı adı en az 6 karakter olmalı, boşluk/özel karakter içeremez.';
    end if;
  else
    if new.okul_no !~ '^[0-9]{1,5}$' then
      raise exception 'Okul no 1-5 haneli bir sayı olmalı.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ogrenci_no_format_kontrol_trigger on public.students;
create trigger ogrenci_no_format_kontrol_trigger
  before insert or update of okul_no, school_id on public.students
  for each row execute function public.ogrenci_no_format_kontrol();

-- 4) pending_dershane_ogrenciler (roster ön-kayıt) — bilinçli olarak HİÇBİR
--    RLS politikası yok (varsayılan: herkese kapalı), erişim service-role
--    (admin) client üzerinden application-layer kontrolle yapılıyor.
create table if not exists public.pending_dershane_ogrenciler (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id),
  ad text not null,
  telefon text not null,
  veli_telefon text,
  ayt_alan public.ayt_alan not null default 'SAY',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  kullanildi_at timestamptz,
  unique (school_id, telefon)
);
alter table public.pending_dershane_ogrenciler enable row level security;

-- 5) pdf_deneme_eslesme_bekleyenler (Faz D5, admin review kuyruğu)
create table if not exists public.pdf_deneme_eslesme_bekleyenler (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad_soyad_ham text not null,
  ders_sonuclari jsonb not null,
  yayinevi text not null,
  tarih date not null,
  tur public.deneme_turu not null,
  olusturan_mudur_id uuid references public.profiles(id) on delete set null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'atandi', 'reddedildi')),
  atanan_student_id uuid references public.students(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.pdf_deneme_eslesme_bekleyenler enable row level security;

drop policy if exists "pdf_deneme_eslesme_select_admin" on public.pdf_deneme_eslesme_bekleyenler;
create policy "pdf_deneme_eslesme_select_admin" on public.pdf_deneme_eslesme_bekleyenler
  for select using (public.is_admin());

-- ============ handle_new_user: veli_telefon eklendi (migration 0052) ============
-- students insert'ine veli_telefon eklendi (migration 0051'de eklenen kolon
-- doldurulmuyordu) — fonksiyonun geri kalanı 0042'deki hâliyle AYNEN korunuyor.
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
    insert into public.students (id, school_id, class_id, okul_no, ayt_alan, hedef_bolum, veri_giris_sikligi, veli_telefon)
    values (
      new.id, v_school_id, (new.raw_user_meta_data->>'class_id')::uuid,
      new.raw_user_meta_data->>'okul_no', (new.raw_user_meta_data->>'ayt_alan')::public.ayt_alan,
      coalesce(new.raw_user_meta_data->>'hedef_bolum', ''),
      coalesce((new.raw_user_meta_data->>'veri_giris_sikligi')::public.veri_giris_sikligi, 'haftalik'),
      new.raw_user_meta_data->>'veli_telefon'
    );
  elsif v_role = 'ogretmen' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (new.id, (new.raw_user_meta_data->>'school_id')::uuid, nullif(new.raw_user_meta_data->>'class_id', '')::uuid, coalesce(new.raw_user_meta_data->>'brans', ''));
  elsif v_role = 'mudur' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (new.id, (new.raw_user_meta_data->>'school_id')::uuid, null, 'Müdür');

    -- DERSHANE MODU: dershane müdürü otomatik olarak kendi okulunun
    -- moderatörü de olur — okul müdürleri etkilenmez.
    if (select tur from public.schools where id = (new.raw_user_meta_data->>'school_id')::uuid) = 'dershane' then
      insert into public.school_moderators (profile_id, school_id)
      values (new.id, (new.raw_user_meta_data->>'school_id')::uuid)
      on conflict (profile_id) do nothing;
    end if;
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

-- ============ Yurt öğrencisi (migration 0053) ============
-- Hafta içi telefonuna erişemeyen öğrenciler için: rozet sistemi hafta
-- sonuna göre esnetiliyor, hafta içi "sisteme girmedi" hatırlatmaları
-- bastırılıyor (bkz. src/app/api/cron/hatirlatmalar/route.ts).
alter table public.students add column if not exists yurt_ogrencisi boolean not null default false;

comment on column public.students.yurt_ogrencisi is
  'Yurtta kalan öğrenci — hafta içi telefonuna erişemediği için rozet sistemi ve "sisteme girmedi" hatırlatmaları hafta sonuna göre esnetilir.';

-- Konu Çalışma seviyesi — yurt öğrencisi esnetmesi: seri/boşluk cezası
-- kaldırılıp kayan 30 günde kaç hafta sonu (Cmt/Paz) günü aktif olduğu sayılıyor.
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

-- Soru Çözümü seviyesi — yurt öğrencisi için pencere son 7 güne genişletiliyor
-- (normal pencere 3 gün hafta içi kontrol edildiğinde hiç hafta sonu içermeyebilir).
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

-- ============ Konu Haritası (migration 0054) ============
-- "Konu bilme/bilmeme göstergesi" veri modeli.

-- 1) 2. aşama takip cevabı: KonuCalismaForm'daki "Konuya hakimiyet"
--    (hedefe_yakinlik) seçimine göre sorulan takip sorusunun cevap kodu.
alter table public.konu_calismalar add column if not exists takip_cevabi text;

alter table public.konu_calismalar drop constraint if exists konu_calismalar_takip_cevabi_gecerli;
alter table public.konu_calismalar
  add constraint konu_calismalar_takip_cevabi_gecerli check (
    takip_cevabi is null or takip_cevabi in (
      'az_hic', 'az_az', 'az_orta', 'az_yuksek',
      'orta_evet', 'orta_biraz', 'orta_hayir',
      'yeterli_hizli_dogru', 'yeterli_dogru_yavas', 'yeterli_hizli_hata'
    )
  );

comment on column public.konu_calismalar.takip_cevabi is
  '"Konuya hakimiyet" (hedefe_yakinlik) seçimine göre sorulan 2. aşama takip sorusunun cevap kodu.';

-- 2) 9-10. sınıf müfredat üst başlık → alt başlık hiyerarşisi. ust_konu,
--    statik mufredat-konulari.json'daki (ders,konu) çiftine serbest-metin
--    eşleşir (FK değil — konu_anlatimlari'nın konu_calismalar.konu'ya
--    eşleşme deseniyle aynı mantık).
create table if not exists public.mufredat_alt_konular (
  id uuid primary key default gen_random_uuid(),
  ders text not null,
  ust_konu text not null,
  alt_baslik text not null,
  sira integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists mufredat_alt_konular_ust_idx on public.mufredat_alt_konular (ders, ust_konu);

alter table public.mufredat_alt_konular enable row level security;

drop policy if exists "mufredat_alt_konular_select" on public.mufredat_alt_konular;
create policy "mufredat_alt_konular_select" on public.mufredat_alt_konular
  for select using (true);

drop policy if exists "mufredat_alt_konular_admin_all" on public.mufredat_alt_konular;
create policy "mufredat_alt_konular_admin_all" on public.mufredat_alt_konular
  for all using (public.is_admin()) with check (public.is_admin());

-- ============ Konu Hakimiyeti (migration 0055, RLS teyidi 0059) ============
-- Öğrencinin müfredattaki her konu için KALICI hakimiyet beyanı —
-- konu_calismalar.hedefe_yakinlik (bir ÇALIŞMA OTURUMUNUN o anki
-- değerlendirmesi) ile KARIŞTIRILMASIN diye ayrı bir tablo: konu başına
-- TEK kayıt (upsert).
create table if not exists public.ogrenci_konu_hakimiyeti (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  ders text not null,
  konu text not null,
  hakimiyet_seviyesi public.hedefe_yakinlik not null,
  ogrenme_sekli text[] not null default '{}',
  tekrar_durumu text,
  guncellenme_tarihi timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id, ders, konu)
);

alter table public.ogrenci_konu_hakimiyeti drop constraint if exists ogrenci_konu_hakimiyeti_tekrar_durumu_gecerli;
alter table public.ogrenci_konu_hakimiyeti
  add constraint ogrenci_konu_hakimiyeti_tekrar_durumu_gecerli check (
    tekrar_durumu is null or tekrar_durumu in ('tekrar_edebilirim', 'yuzeysel_bakarim', 'gerek_yok')
  );

create index if not exists ogrenci_konu_hakimiyeti_student_idx on public.ogrenci_konu_hakimiyeti (student_id);

comment on table public.ogrenci_konu_hakimiyeti is
  'Öğrencinin müfredat konuları için kalıcı hakimiyet beyanı — bir çalışma oturumu loglamaktan bağımsız, konu başına tek (upsert) kayıt.';
comment on column public.ogrenci_konu_hakimiyeti.ogrenme_sekli is
  'Çoklu seçim: ''derste''|''video''|''kitap''|''dershane'' — doğrulama uygulama katmanında.';

-- Öğrenci kendi kaydını (+ bağlı veli) okuyabilir; sadece öğrencinin
-- kendisi yazabilir. Öğretmen/admin bu tabloyu DOĞRUDAN select edemiyor —
-- tek erişim yolu aşağıdaki (agrege/isimsiz) konu_zayiflik_raporu RPC'si.
-- (migration 0059: tablonun migration 0055'in tek SQL Editor çalıştırmasında
-- aynı script'in sonundaki create-or-replace hatası yüzünden RLS'siz
-- kalmış olabileceği görüldü — bu iki politika idempotent olarak yeniden
-- teyit edildi.)
alter table public.ogrenci_konu_hakimiyeti enable row level security;

drop policy if exists "ogrenci_konu_hakimiyeti_select" on public.ogrenci_konu_hakimiyeti;
create policy "ogrenci_konu_hakimiyeti_select" on public.ogrenci_konu_hakimiyeti
  for select using (public.has_student_access(student_id));

drop policy if exists "ogrenci_konu_hakimiyeti_write" on public.ogrenci_konu_hakimiyeti;
create policy "ogrenci_konu_hakimiyeti_write" on public.ogrenci_konu_hakimiyeti
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ============ Matematik alt konu taslağı (migration 0056) ============
-- Faz H5 — Matematik 9-10-11. sınıf alt konu TASLAĞI. MEB 2024 Maarif
-- Modeli çerçevesine dair genel bilgiyle hazırlanan bir TASLAK — kaynak
-- dokümanla birebir doğrulanmadı, /yonetici → Konu anlatımları → Müfredat
-- hiyerarşisi ekranından gözden geçirilmeli.
do $$
declare
  v_satirlar jsonb := '[
    {"ust": "Üslü-Köklü Sayılar, Sayı Kümeleri, Özdeşlikler", "altlar": ["Üslü sayılar ve işlemler", "Köklü sayılar ve işlemler", "Sayı kümeleri (doğal, tam, rasyonel, irrasyonel, reel)", "Özdeşlikler ve çarpanlara ayırma"]},
    {"ust": "Doğrusal Fonksiyonlar ve Mutlak Değer Fonksiyonu", "altlar": ["Fonksiyon kavramı ve gösterimi", "Doğrusal fonksiyonlar ve grafikleri", "Mutlak değer kavramı", "Mutlak değerli fonksiyonlar ve grafikleri"]},
    {"ust": "Algoritma, Mantık Bağlaçları ve Niceleyiciler", "altlar": ["Algoritma ve akış şeması", "Önermeler ve mantık bağlaçları", "Niceleyiciler (her, bazı)", "İspat yöntemleri"]},
    {"ust": "Üçgende Açı-Kenar Özellikleri", "altlar": ["Üçgende açı özellikleri", "Üçgende kenar-açı bağıntıları (kenarortay, açıortay, kenar orta dikme)", "Üçgende alan bağıntıları", "Eşkenar, ikizkenar, dik üçgen özellikleri"]},
    {"ust": "Geometrik Dönüşümler, Üçgende Eşlik ve Benzerlik", "altlar": ["Öteleme, dönme, yansıma", "Üçgende eşlik (KKK, KAK, AKA)", "Üçgende benzerlik", "Benzerlik oranı ve uygulamaları"]},
    {"ust": "İstatistiksel Problem Kurma ve Analiz (Tek Değişken)", "altlar": ["Veri toplama ve sunma", "Merkezi eğilim ölçüleri (ortalama, medyan, mod)", "Merkezi yayılım ölçüleri (açıklık, standart sapma)", "Histogram ve kutu grafiği"]},
    {"ust": "Olasılık (Deneysel ve Teorik)", "altlar": ["Örnek uzay ve olay kavramı", "Deneysel olasılık", "Teorik olasılık", "Basit olayların olasılığı"]},
    {"ust": "Bölünebilme, OBEB-OKEK, Asal Çarpanlar", "altlar": ["Bölünebilme kuralları", "Asal sayılar ve asal çarpanlara ayırma", "OBEB ve OKEK", "Modüler aritmetik (temel düzey)"]},
    {"ust": "Karesel, Karekök ve Rasyonel Fonksiyonlar", "altlar": ["Karesel (ikinci dereceden) fonksiyonlar ve grafikleri", "Parabolün özellikleri (tepe noktası, simetri ekseni)", "Karekök fonksiyonu", "Rasyonel fonksiyonlar"]},
    {"ust": "Sayma Stratejileri ve Algoritmik Cebir", "altlar": ["Toplama ve çarpma kuralı", "Permütasyon", "Kombinasyon", "Binom açılımı (temel düzey)"]},
    {"ust": "Trigonometri (Dik Üçgen, Alan, Sinüs-Kosinüs Teoremi)", "altlar": ["Dik üçgende trigonometrik oranlar", "Trigonometrik oranlar arası bağıntılar", "Üçgende alan bağıntısı (trigonometrik)", "Sinüs teoremi ve kosinüs teoremi"]},
    {"ust": "Analitik Geometri (Nokta ve Doğru)", "altlar": ["İki nokta arası uzaklık", "Doğrunun eğimi", "Doğru denklemi", "Doğrular arası ilişkiler (paralellik, diklik)"]},
    {"ust": "İstatistik (İki Kategorik Değişken)", "altlar": ["İki kategorik değişken kavramı", "Sıklık ve çapraz tablolar", "Bağımsızlık yorumlanması", "Verilerin grafiksel gösterimi"]},
    {"ust": "Koşullu Olasılık ve Bayes Teoremi", "altlar": ["Koşullu olasılık kavramı", "Bağımlı ve bağımsız olaylar", "Çarpma kuralı", "Bayes teoremi (temel düzey)"]},
    {"ust": "Trigonometrik Fonksiyonlar", "altlar": ["Yönlü açı ve birim çember", "Trigonometrik fonksiyonların grafikleri", "Trigonometrik denklemler", "Toplam-fark formülleri"]},
    {"ust": "Üstel ve Logaritmik Fonksiyonlar", "altlar": ["Üstel fonksiyon ve grafiği", "Logaritma kavramı ve özellikleri", "Logaritmik fonksiyon ve grafiği", "Üstel-logaritmik denklemler"]},
    {"ust": "Fonksiyonlarda İşlemler ve Bileşke", "altlar": ["Fonksiyonlarda dört işlem", "Bileşke fonksiyon", "Ters fonksiyon", "Fonksiyonların grafik yorumlanması"]},
    {"ust": "Dörtgenler ve Çokgenler", "altlar": ["Dörtgen çeşitleri ve özellikleri", "Paralelkenar, yamuk, deltoid özellikleri", "Çokgenlerde açı ve köşegen sayıları", "Çokgenlerde alan hesaplama"]},
    {"ust": "İstatistik (İki Nicel Değişken)", "altlar": ["Serpme (saçılım) diyagramı", "Korelasyon kavramı", "Doğrusal regresyon (temel düzey)", "Yorumlama ve tahmin"]}
  ]'::jsonb;
  v_grup jsonb;
  v_alt text;
  v_sira int;
begin
  for v_grup in select * from jsonb_array_elements(v_satirlar) loop
    v_sira := 0;
    for v_alt in select * from jsonb_array_elements_text(v_grup->'altlar') loop
      if not exists (
        select 1 from public.mufredat_alt_konular
        where ders = 'Matematik' and ust_konu = (v_grup->>'ust') and alt_baslik = v_alt
      ) then
        insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
        values ('Matematik', v_grup->>'ust', v_alt, v_sira);
      end if;
      v_sira := v_sira + 1;
    end loop;
  end loop;
end $$;

-- ============ Diğer dersler alt konu taslağı (migration 0057) ============
-- Faz H5 (devam) — Fizik, Kimya, Biyoloji, Coğrafya, Tarih, Felsefe, Din
-- Kültürü için 9-10-11. sınıf alt konu TASLAĞI. Edebiyat (ve Türkçe)
-- bilinçli olarak DIŞARIDA — düz TYT/AYT listesi olarak kalıyor. TASLAK —
-- kaynak dokümanla birebir doğrulanmadı, gözden geçirilmeli.
do $$
declare
  v_satirlar jsonb := $json$[
    {"ders": "Fizik", "ust": "Fizik Bilimi ve Kariyer Keşfi", "altlar": ["Fiziğin tanımı ve alt dalları", "Bilimsel yöntem ve model kavramı", "Fizikle ilgili meslek ve kariyer alanları", "Fiziğin günlük hayattaki uygulamaları"]},
    {"ders": "Fizik", "ust": "Temel-Türetilmiş Nicelikler, Vektörler, Hareket", "altlar": ["Temel ve türetilmiş büyüklükler, birim sistemleri", "Skaler ve vektörel büyüklükler", "Vektörlerin bileşenlerine ayrılması ve toplanması", "Konum, yer değiştirme ve alınan yol"]},
    {"ders": "Fizik", "ust": "Akışkanlar (Basınç, Kaldırma Kuvveti)", "altlar": ["Katı basıncı", "Sıvı basıncı ve Pascal prensibi", "Açık hava basıncı", "Kaldırma kuvveti ve Arşimet prensibi"]},
    {"ders": "Fizik", "ust": "Isı, Sıcaklık ve Hâl Değişimi", "altlar": ["Isı ve sıcaklık kavramları", "Genleşme", "Hâl değişim grafikleri", "Isının yayılma yolları (iletim, taşınım, ışıma)"]},
    {"ders": "Fizik", "ust": "Sabit Hızlı ve Sabit İvmeli Hareket", "altlar": ["Sabit hızlı (düzgün) doğrusal hareket", "Hız-zaman ve konum-zaman grafikleri", "Sabit ivmeli (düzgün değişen) doğrusal hareket", "Serbest düşme hareketi"]},
    {"ders": "Fizik", "ust": "İş, Enerji ve Güç", "altlar": ["İş kavramı ve hesaplanması", "Kinetik ve potansiyel enerji", "Enerjinin korunumu", "Güç ve verim"]},
    {"ders": "Fizik", "ust": "Basit Elektrik Devreleri (Ohm Yasası)", "altlar": ["Elektrik akımı ve gerilim", "Ohm yasası", "Seri ve paralel bağlı devreler", "Elektriksel güç ve enerji"]},
    {"ders": "Fizik", "ust": "Dalgalar (Temel Kavramlar, Periyodik Hareket, Rezonans)", "altlar": ["Periyodik hareket ve titreşim", "Dalga çeşitleri ve temel özellikleri", "Yay dalgaları ve su dalgaları", "Rezonans (çınlama)"]},
    {"ders": "Fizik", "ust": "Newton Hareket Yasaları, Sürtünme, Çembersel Hareket", "altlar": ["Newton'un hareket yasaları", "Sürtünme kuvveti", "Çembersel hareket ve merkezcil kuvvet", "Bağıl hareket"]},
    {"ders": "Fizik", "ust": "Elektrik Alan, Manyetik Alan ve İndüksiyon", "altlar": ["Elektrik alan ve elektrik potansiyeli", "Manyetik alan ve manyetik kuvvet", "Elektromanyetik indüksiyon", "Alternatif akım temelleri"]},
    {"ders": "Fizik", "ust": "Yarı İletkenlik ve Süper İletkenlik", "altlar": ["İletken, yalıtkan ve yarı iletken maddeler", "Diyot ve temel yarı iletken uygulamaları", "Süper iletkenlik kavramı", "Yarı iletken teknolojisinin uygulama alanları"]},
    {"ders": "Fizik", "ust": "Optik (Aynalar, Kırılma, Mercekler)", "altlar": ["Işığın yansıması ve düzlem/küresel aynalar", "Işığın kırılması ve Snell yasası", "Mercekler ve görüntü oluşumu", "Optik araçlar (göz, mikroskop, teleskop)"]},

    {"ders": "Kimya", "ust": "Kimya Bilimine Giriş, Atom Teorileri ve Periyodik Sistem", "altlar": ["Kimyanın çalışma alanları ve önemi", "Atom modellerinin tarihsel gelişimi", "Atomun yapısı ve elektron dizilimi", "Periyodik sistem ve periyodik özellikler"]},
    {"ders": "Kimya", "ust": "Kimyasal Türler Arası Etkileşimler", "altlar": ["Güçlü etkileşimler (iyonik, kovalent, metalik bağ)", "Zayıf etkileşimler (Van der Waals, hidrojen bağı)", "Molekül geometrisi", "Etkileşimlerin madde özelliklerine etkisi"]},
    {"ders": "Kimya", "ust": "Nanoparçacıklar ve Ekolojik Sürdürülebilirlik", "altlar": ["Nanoteknoloji kavramı ve temel ilkeleri", "Nanoparçacıkların özellikleri", "Ekolojik ayak izi", "Sürdürülebilirlik ve kimya"]},
    {"ders": "Kimya", "ust": "Kimyasal Tepkimeler ve Mol Kavramı, Gazlar", "altlar": ["Mol kavramı ve Avogadro sayısı", "Kimyasal tepkime denklemleri ve denkleştirme", "Sınırlayıcı bileşen ve tepkime verimi", "Gazların genel özellikleri ve gaz yasaları"]},
    {"ders": "Kimya", "ust": "Çözeltiler", "altlar": ["Çözünme olayı ve çözünürlüğü etkileyen faktörler", "Derişim birimleri (molarite, kütlece yüzde)", "Karışımların ayrılması", "Koligatif özellikler (temel düzey)"]},
    {"ders": "Kimya", "ust": "Yeşil Kimya ve Çevresel Sürdürülebilirlik", "altlar": ["Yeşil kimyanın 12 ilkesi", "Çevre kirliliği türleri", "Geri dönüşüm ve atık yönetimi", "Sürdürülebilir kimyasal üretim"]},
    {"ders": "Kimya", "ust": "Kimyasal Tepkimelerde Enerji (Entalpi) ve Hız", "altlar": ["Tepkime ısısı ve entalpi", "Ekzotermik ve endotermik tepkimeler", "Tepkime hızını etkileyen faktörler", "Hız denklemi ve aktivasyon enerjisi"]},
    {"ders": "Kimya", "ust": "Kimyasal Denge, Asit-Baz Dengesi", "altlar": ["Dinamik denge kavramı", "Denge sabiti ve Le Chatelier ilkesi", "Asit-baz teorileri", "pH ve pOH hesaplamaları"]},
    {"ders": "Kimya", "ust": "Nanoteknoloji ve Sürdürülebilirlik", "altlar": ["Nanomalzemelerin sınıflandırılması", "Nanoteknolojinin sanayi uygulamaları", "Nanoteknolojide etik ve güvenlik", "Sürdürülebilir nanoteknoloji"]},

    {"ders": "Biyoloji", "ust": "Yaşam Bilimi Biyoloji", "altlar": ["Biyolojinin alt dalları ve canlı bilimlerle ilişkisi", "Bilimsel araştırma yöntemleri", "Biyolojinin günlük yaşam ve teknolojideki yeri", "Biyoetik kavramı"]},
    {"ders": "Biyoloji", "ust": "Hücrenin Temel Bileşenleri", "altlar": ["Hücrenin keşfi ve hücre teorisi", "Prokaryot ve ökaryot hücre yapısı", "Hücre organelleri ve görevleri", "Hücre zarından madde geçişi"]},
    {"ders": "Biyoloji", "ust": "Sınıflandırma ve Biyoçeşitlilik", "altlar": ["Canlıların sınıflandırılma ilkeleri", "Beş alem sistemi", "Biyoçeşitliliğin önemi", "Türkiye'nin biyoçeşitliliği"]},
    {"ders": "Biyoloji", "ust": "Fotosentez ve Hücresel Solunum", "altlar": ["Fotosentezin evreleri (ışık ve karanlık tepkimeler)", "Fotosentezi etkileyen faktörler", "Hücresel solunum evreleri (glikoliz, krebs, ETS)", "Fermantasyon"]},
    {"ders": "Biyoloji", "ust": "Ekosistemler ve Madde Döngüleri", "altlar": ["Ekosistem bileşenleri ve enerji akışı", "Karbon, azot ve su döngüleri", "Popülasyon ekolojisi", "Ekolojik ayak izi ve insan etkisi"]},
    {"ders": "Biyoloji", "ust": "Canlılarda Tepki (Sinir Sistemi ve Hareket)", "altlar": ["Sinir sisteminin yapısı ve nöron", "Merkezi ve çevresel sinir sistemi", "Duyu organları", "Destek ve hareket sistemi"]},
    {"ders": "Biyoloji", "ust": "Homeostazi ve Endokrin Sistem", "altlar": ["Homeostazi kavramı", "Endokrin bezler ve hormonlar", "Hormonal düzenleme mekanizmaları", "Boşaltım sistemi ve homeostazideki rolü"]},

    {"ders": "Coğrafya", "ust": "Coğrafyanın Doğası", "altlar": ["Coğrafyanın konusu ve bölümleri", "Coğrafi bakış açısı", "Coğrafyanın diğer bilimlerle ilişkisi", "Coğrafi araştırma yöntemleri"]},
    {"ders": "Coğrafya", "ust": "Mekânsal Bilgi Teknolojileri — Harita Bilgisi", "altlar": ["Harita çeşitleri ve ölçek kavramı", "Harita projeksiyonları", "İzohips (eş yükselti) haritaları ve profil çıkarma", "Coğrafi Bilgi Sistemleri'ne (CBS) giriş"]},
    {"ders": "Coğrafya", "ust": "İklim Sistemi ve Türleri", "altlar": ["Atmosferin yapısı ve katmanları", "İklim elemanları (sıcaklık, basınç, rüzgar, nem, yağış)", "Dünya'nın iklim tipleri", "Türkiye'nin iklim özellikleri"]},
    {"ders": "Coğrafya", "ust": "Nüfus (Dağılış, Hareketler, Piramitler)", "altlar": ["Nüfusun dağılışını etkileyen faktörler", "Göç ve göç türleri", "Nüfus piramitleri ve yorumlanması", "Türkiye'nin nüfus özellikleri"]},
    {"ders": "Coğrafya", "ust": "Ekonomik Faaliyetleri Etkileyen Coğrafi Faktörler", "altlar": ["Tarımı etkileyen coğrafi faktörler", "Sanayiyi etkileyen coğrafi faktörler", "Ticareti ve ulaşımı etkileyen faktörler", "Turizmi etkileyen coğrafi faktörler"]},
    {"ders": "Coğrafya", "ust": "Afet Türleri ve Bütüncül Afet Yönetimi", "altlar": ["Doğal afet türleri (deprem, sel, heyelan vb.)", "Afetlerin oluşum nedenleri", "Afet risk yönetimi", "Afet öncesi-sırası-sonrası alınacak önlemler"]},
    {"ders": "Coğrafya", "ust": "Bölge ve Bölge Sınırı", "altlar": ["Bölge kavramı ve bölge türleri", "Bölge sınırlarının belirlenmesi", "Türkiye'nin coğrafi bölgeleri", "Kalkınmada öncelikli yöreler"]},
    {"ders": "Coğrafya", "ust": "Coğrafi Bakış, CBS ve Uzaktan Algılama", "altlar": ["Coğrafi Bilgi Sistemleri'nin bileşenleri", "Uzaktan algılama teknikleri", "Küresel Konumlama Sistemi (GPS/GNSS)", "CBS'nin günlük hayatta kullanım alanları"]},
    {"ders": "Coğrafya", "ust": "Yer Şekilleri Oluşumu (Tektonik, Aşınım-Birikim Süreçleri)", "altlar": ["İç kuvvetler (tektonizma, volkanizma, deprem)", "Dış kuvvetler (akarsu, rüzgar, buzul, dalga aşındırması)", "Türkiye'nin yer şekilleri", "Karstik yer şekilleri"]},
    {"ders": "Coğrafya", "ust": "Yerleşmelerin Kuruluşu ve Fonksiyonları", "altlar": ["Yerleşmeyi etkileyen doğal ve beşeri faktörler", "Kır ve şehir yerleşmeleri", "Yerleşme fonksiyonları (idari, ticari, sanayi vb.)", "Türkiye'de şehirleşme süreci"]},
    {"ders": "Coğrafya", "ust": "Türkiye Ekonomisinin Sektörel Dağılımı", "altlar": ["Tarım sektörü ve Türkiye tarımı", "Sanayi sektörü ve Türkiye sanayisi", "Hizmetler sektörü", "Sektörler arası geçişler ve ekonomik gelişmişlik"]},
    {"ders": "Coğrafya", "ust": "Mekânsal Sorunlar Karşısında Coğrafya Bilimi, Web Tabanlı CBS", "altlar": ["Mekânsal sorunların tespiti ve analizi", "Web tabanlı CBS uygulamaları", "Katılımcı haritalama", "Coğrafi verinin karar alma süreçlerinde kullanımı"]},
    {"ders": "Coğrafya", "ust": "Su Kaynakları ve Sürdürülebilir Kullanımı", "altlar": ["Dünya ve Türkiye'nin su kaynakları", "Su kıtlığı ve su stresi", "Sürdürülebilir su yönetimi", "Sınır aşan sular sorunu"]},
    {"ders": "Coğrafya", "ust": "Yerleşmelerin Mekânsal Organizasyonu ve Etki Alanları", "altlar": ["Merkezi yer teorisi", "Şehirlerin etki alanları (hinterlant)", "Metropol ve megapol kavramları", "Kentleşme sorunları"]},
    {"ders": "Coğrafya", "ust": "Tarım, Madencilik, Enerji Kaynakları, Sanayileşme", "altlar": ["Tarım politikaları ve tarımsal verimlilik", "Madenler ve maden işletmeciliği", "Enerji kaynakları (yenilenebilir/yenilenemez)", "Sanayileşme süreçleri ve etkileri"]},
    {"ders": "Coğrafya", "ust": "Küresel İklim Değişikliği", "altlar": ["Küresel iklim değişikliğinin nedenleri", "İklim değişikliğinin etkileri", "Sera gazı emisyonları ve azaltım politikaları", "İklim değişikliğine uyum stratejileri"]},

    {"ders": "Tarih", "ust": "Tarih Bilimine Giriş", "altlar": ["Tarihin tanımı ve konusu", "Tarih biliminin yöntemi ve yardımcı bilimleri", "Zaman ve takvim kavramı", "Tarihi kaynaklar ve tasnifi"]},
    {"ders": "Tarih", "ust": "İlk Uygarlıklar ve Tarım Devrimi", "altlar": ["Tarih öncesi çağlar", "Tarım devriminin toplumsal etkileri", "Mezopotamya, Mısır ve Anadolu uygarlıkları", "İlk yazı ve hukuk sistemleri"]},
    {"ders": "Tarih", "ust": "Orta Çağ'da Dünya (Göçler, Devletler, Ticaret Yolları)", "altlar": ["Kavimler göçü ve etkileri", "Orta Çağ Avrupa'sında feodalite", "İpek ve Baharat yolları", "Orta Çağ İslam dünyası"]},
    {"ders": "Tarih", "ust": "Türklerin İslamiyeti Kabulü ve İlk Türk-İslam Devletleri", "altlar": ["Türklerin İslamiyet öncesi inanç ve devlet gelenekleri", "Türklerin İslamiyeti kabul süreci", "Karahanlılar ve Gazneliler", "Büyük Selçuklu Devleti"]},
    {"ders": "Tarih", "ust": "Beylikten Devlete Osmanlı (Kuruluş Dönemi)", "altlar": ["Anadolu Selçuklu Devleti'nin yıkılışı ve beylikler dönemi", "Osmanlı Devleti'nin kuruluşu", "İlk fetihler ve Balkanlara geçiş", "Devlet teşkilatının temelleri"]},
    {"ders": "Tarih", "ust": "Dünya Gücü Osmanlı (1453-1683)", "altlar": ["İstanbul'un fethi ve sonuçları", "Yavuz Sultan Selim dönemi fetihleri", "Kanuni dönemi ve altın çağ", "Klasik dönem devlet ve toplum yapısı"]},
    {"ders": "Tarih", "ust": "Değişen Dünya Dengeleri Karşısında Osmanlı (1683-1789)", "altlar": ["Duraklama ve gerileme dönemi gelişmeleri", "Coğrafi keşiflerin Osmanlı'ya etkisi", "Islahat hareketlerinin başlaması", "Karlofça ve sonrası antlaşmalar"]},
    {"ders": "Tarih", "ust": "Devrimler Çağında Osmanlı (1789-1908)", "altlar": ["Fransız İhtilali'nin etkileri", "III. Selim ve II. Mahmut dönemi ıslahatları", "Tanzimat ve Islahat fermanları", "I. ve II. Meşrutiyet"]},
    {"ders": "Tarih", "ust": "XX. Yüzyıl Başlarında Osmanlı ve I. Dünya Savaşı (1908-1918)", "altlar": ["Trablusgarp ve Balkan Savaşları", "I. Dünya Savaşı'nın nedenleri ve cepheleri", "Osmanlı'nın savaştaki cepheleri", "Mondros Ateşkes Antlaşması"]},

    {"ders": "Felsefe", "ust": "Felsefenin Anlamı ve Doğuşu", "altlar": ["Felsefenin tanımı ve temel kavramları", "Felsefenin doğuşunu hazırlayan koşullar", "Felsefi düşüncenin özellikleri", "Felsefe ile diğer disiplinlerin ilişkisi"]},
    {"ders": "Felsefe", "ust": "Mantık ve Argümantasyon", "altlar": ["Mantığın konusu ve önemi", "Kavram, önerme ve akıl yürütme", "Argüman türleri (tümdengelim, tümevarım)", "Geçerli ve sağlam argüman ayrımı"]},
    {"ders": "Felsefe", "ust": "Varlık Felsefesi", "altlar": ["Varlık felsefesinin temel soruları", "İdealizm ve materyalizm", "Varlığın yapısına ilişkin görüşler", "Varoluşçu yaklaşımlar"]},
    {"ders": "Felsefe", "ust": "Bilgi Felsefesi", "altlar": ["Bilginin kaynağı sorunu (rasyonalizm-empirizm)", "Doğruluk ölçütleri", "Bilgi türleri", "Septisizm ve dogmatizm"]},
    {"ders": "Felsefe", "ust": "Ahlak Felsefesi", "altlar": ["Ahlaki değer kavramı", "Ahlak yasasının kaynağı sorunu", "Özgürlük ve sorumluluk", "Erdem etiği ve fayda ahlakı"]},
    {"ders": "Felsefe", "ust": "Estetik ve Sanat Felsefesi", "altlar": ["Estetik ve güzellik kavramı", "Sanat eserinin özellikleri", "Sanatta öznellik-nesnellik tartışması", "Sanat ve toplum ilişkisi"]},
    {"ders": "Felsefe", "ust": "Siyaset Felsefesi", "altlar": ["Siyaset felsefesinin temel kavramları (iktidar, otorite, meşruiyet)", "Devlet biçimleri ve yönetim türleri", "Toplum sözleşmesi kuramları", "Özgürlük ve eşitlik tartışmaları"]},
    {"ders": "Felsefe", "ust": "Din Felsefesi", "altlar": ["Din felsefesinin konusu", "Tanrı'nın varlığına ilişkin görüşler", "Din-bilim-felsefe ilişkisi", "Dinin toplumsal işlevi"]},
    {"ders": "Felsefe", "ust": "Bilim Felsefesi", "altlar": ["Bilimin tanımı ve bilimsel yöntem", "Bilim felsefesinin temel sorunları", "Bilimsel açıklama modelleri", "Bilim-teknoloji-toplum ilişkisi"]},
    {"ders": "Felsefe", "ust": "Çevre Felsefesi ve Etik", "altlar": ["Çevre etiğinin temel kavramları", "İnsan merkezci ve doğa merkezci yaklaşımlar", "Sürdürülebilirlik ve gelecek kuşaklara sorumluluk", "Çevre sorunlarına felsefi yaklaşımlar"]},
    {"ders": "Felsefe", "ust": "Teknoloji Felsefesi", "altlar": ["Teknolojinin insan yaşamına etkileri", "Teknoloji ve etik sorunlar", "Yapay zeka ve felsefi tartışmalar", "Teknolojik determinizm"]},
    {"ders": "Felsefe", "ust": "Akıl-İnanç İlişkisi", "altlar": ["Akıl ve inanç kavramlarının felsefi temelleri", "Akıl-inanç ilişkisine dair farklı görüşler", "Din felsefesinde akılcılık", "Fideizm ve rasyonalizm tartışması"]},
    {"ders": "Felsefe", "ust": "Dil, Edebiyat ve Felsefe İlişkisi", "altlar": ["Dilin düşünceyle ilişkisi", "Dil felsefesinin temel sorunları", "Edebiyat ve felsefe etkileşimi", "Anlam ve yorum sorunu"]},
    {"ders": "Felsefe", "ust": "Mutluluk, Varoluş ve Kendi Olma", "altlar": ["Mutluluk kavramına felsefi yaklaşımlar", "Varoluşçu felsefede birey", "Otantiklik ve kendi olma", "Yaşamın anlamı sorunu"]},
    {"ders": "Felsefe", "ust": "Hukuk Felsefesi", "altlar": ["Hukuk felsefesinin temel kavramları", "Doğal hukuk ve pozitif hukuk", "Adalet kavramı", "Hukuk-ahlak ilişkisi"]},

    {"ders": "Din Kültürü", "ust": "İnsan ve İnsanın Yaratılışı", "altlar": ["İnsanın yaratılışına dair dini bilgiler", "İnsanın diğer varlıklardan farkı", "İnsanın Yaratıcı ile ilişkisi", "İnsanın sorumluluk bilinci"]},
    {"ders": "Din Kültürü", "ust": "İman Esasları", "altlar": ["İmanın tanımı ve şartları", "Allah'a iman", "Meleklere, kitaplara, peygamberlere iman", "Ahirete ve kadere iman"]},
    {"ders": "Din Kültürü", "ust": "İslam'da İbadetler", "altlar": ["İbadetin anlamı ve önemi", "Namaz, oruç, zekât, hac ibadetleri", "İbadetlerin bireysel ve toplumsal faydaları", "İbadetlerde kolaylık ilkesi"]},
    {"ders": "Din Kültürü", "ust": "İslam'da Ahlak İlkeleri", "altlar": ["Ahlakın tanımı ve İslam'daki yeri", "Temel ahlaki değerler (doğruluk, adalet, sabır vb.)", "Aile ve toplum ahlakı", "Kötü alışkanlıklardan korunma"]},
    {"ders": "Din Kültürü", "ust": "Hz. Muhammed'in Hayatı ve Örnekliği", "altlar": ["Hz. Muhammed'in doğumu ve gençliği", "Peygamberlik dönemi ve tebliğ süreci", "Hz. Muhammed'in örnek kişiliği", "Hz. Muhammed'in aile ve toplum hayatındaki örnekliği"]},
    {"ders": "Din Kültürü", "ust": "İslam Düşüncesinde Bilgi ve Varlık", "altlar": ["İslam düşüncesinde bilgi kaynakları", "Akıl-vahiy ilişkisi", "Varlık anlayışı", "İslam düşünce ekollerine giriş"]},
    {"ders": "Din Kültürü", "ust": "Allah İnancı ve Sıfatları", "altlar": ["Allah'ın varlığının delilleri", "Allah'ın zati ve subuti sıfatları", "Tevhit inancı", "Allah-insan ilişkisi"]},
    {"ders": "Din Kültürü", "ust": "Tevhit, Adalet ve Barış", "altlar": ["Tevhit ilkesinin toplumsal yansımaları", "İslam'da adalet anlayışı", "Barış ve hoşgörü ilkeleri", "Farklılıklara saygı"]},
    {"ders": "Din Kültürü", "ust": "Çevre, Teknoloji ve Ahlak", "altlar": ["İslam'da çevre bilinci", "Teknoloji kullanımında ahlaki sorumluluk", "Emanet bilinci", "Sürdürülebilir yaşam ve din"]},
    {"ders": "Din Kültürü", "ust": "İslam Düşüncesinde Yorum Farklılıkları (Mezhepler)", "altlar": ["Mezhep kavramı ve oluşum nedenleri", "İtikadi mezhepler", "Fıkhi mezhepler", "Mezhepler arası hoşgörü"]},
    {"ders": "Din Kültürü", "ust": "Kader ve İnsan Sorumluluğu", "altlar": ["Kader ve kaza kavramları", "İnsan iradesi ve özgürlüğü", "Kader-sorumluluk ilişkisi", "Kadere iman ile ilgili yanlış anlayışlar"]},
    {"ders": "Din Kültürü", "ust": "Din, Felsefe, Bilim ve Sanat İlişkisi", "altlar": ["Din-felsefe ilişkisi", "Din-bilim ilişkisi", "Din-sanat ilişkisi", "İslam medeniyetinde bilim ve sanat"]},
    {"ders": "Din Kültürü", "ust": "İslam Medeniyeti", "altlar": ["İslam medeniyetinin oluşumu", "İslam medeniyetinin bilim ve kültüre katkıları", "İslam medeniyetinde önemli merkezler", "İslam medeniyetinin günümüze etkileri"]},
    {"ders": "Din Kültürü", "ust": "Kötülük Problemi ve Dinî-Felsefi Yaklaşımlar", "altlar": ["Kötülük probleminin tanımı", "Kötülüğe dini yaklaşımlar", "Kötülüğe felsefi yaklaşımlar", "Sınav ve imtihan anlayışı"]},
    {"ders": "Din Kültürü", "ust": "Diğer Dinler: Yahudilik ve Hristiyanlık", "altlar": ["Yahudiliğin temel inanç esasları", "Hristiyanlığın temel inanç esasları", "Bu dinlerin kutsal kitapları ve ibadetleri", "İslam'ın diğer semavi dinlerle ortak ve farklı yönleri"]}
  ]$json$::jsonb;
  v_grup jsonb;
  v_alt text;
  v_sira int;
begin
  for v_grup in select * from jsonb_array_elements(v_satirlar) loop
    v_sira := 0;
    for v_alt in select * from jsonb_array_elements_text(v_grup->'altlar') loop
      if not exists (
        select 1 from public.mufredat_alt_konular
        where ders = (v_grup->>'ders') and ust_konu = (v_grup->>'ust') and alt_baslik = v_alt
      ) then
        insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
        values (v_grup->>'ders', v_grup->>'ust', v_alt, v_sira);
      end if;
      v_sira := v_sira + 1;
    end loop;
  end loop;
end $$;

-- ============ Konu zayıflık raporu — son hali (migration 0054 → 0055 → 0058) ============
-- konu_zayiflik_raporu RPC'si migration 0054'te (8 kolon dönüşlü) yaratıldı,
-- migration 0055'te (11 kolona genişletildi — beyan_* alanları eklendi)
-- create-or-replace ile değiştirilmeye çalışıldı. Postgres, OUT
-- parametreleriyle (returns table) tanımlı bir fonksiyonun dönüş
-- sütunlarını create-or-replace ile değiştirmesine izin vermiyor
-- ("cannot change return type of existing function") — bu yüzden ara
-- adımlar burada ATLANDI, sadece migration 0058'in drop+create ile
-- düzelttiği SON hali (+ "column reference is ambiguous" hatasını önleyen
-- #variable_conflict use_column pragma'sı) aşağıda yer alıyor.
drop function if exists public.konu_zayiflik_raporu(uuid, uuid);

create function public.konu_zayiflik_raporu(p_class_id uuid default null, p_school_id uuid default null)
returns table (
  ders text,
  konu text,
  ogrenci_sayisi bigint,
  uzak_sayisi bigint,
  belirsiz_sayisi bigint,
  yakin_sayisi bigint,
  uzak_orani numeric,
  en_sik_uzak_takip_cevabi text,
  beyan_uzak_sayisi bigint,
  beyan_belirsiz_sayisi bigint,
  beyan_yakin_sayisi bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
#variable_conflict use_column
begin
  if (p_class_id is null) = (p_school_id is null) then
    raise exception 'Tam olarak bir kapsam (sınıf veya okul) belirtilmeli.';
  end if;

  if p_class_id is not null then
    if not (
      public.is_admin()
      or exists (select 1 from public.teachers t where t.id = auth.uid() and t.class_id = p_class_id)
    ) then
      raise exception 'Bu sınıfın raporunu görme yetkiniz yok.';
    end if;
  else
    if not (public.is_admin() or public.is_school_moderator(p_school_id)) then
      raise exception 'Bu okulun raporunu görme yetkiniz yok.';
    end if;
  end if;

  return query
  with kapsamdaki_ogrenciler as (
    select s.id from public.students s
    where (p_class_id is not null and s.class_id = p_class_id)
       or (p_school_id is not null and s.school_id = p_school_id)
  ),
  log_satirlar as (
    select k.student_id, k.ders, k.konu, k.hedefe_yakinlik, k.takip_cevabi
    from public.konu_calismalar k
    where k.student_id in (select id from kapsamdaki_ogrenciler)
  ),
  beyan_satirlar as (
    select h.student_id, h.ders, h.konu, h.hakimiyet_seviyesi
    from public.ogrenci_konu_hakimiyeti h
    where h.student_id in (select id from kapsamdaki_ogrenciler)
  ),
  tum_konular as (
    select ders, konu from log_satirlar
    union
    select ders, konu from beyan_satirlar
  ),
  kapsayan_ogrenci_sayisi as (
    select ders, konu, count(distinct student_id) as ogrenci_sayisi
    from (
      select student_id, ders, konu from log_satirlar
      union
      select student_id, ders, konu from beyan_satirlar
    ) birlesik
    group by ders, konu
  ),
  log_gruplu as (
    select
      ders, konu,
      count(*) filter (where hedefe_yakinlik = 'uzak') as uzak_sayisi,
      count(*) filter (where hedefe_yakinlik = 'belirsiz') as belirsiz_sayisi,
      count(*) filter (where hedefe_yakinlik = 'yakin') as yakin_sayisi
    from log_satirlar
    group by ders, konu
  ),
  beyan_gruplu as (
    select
      ders, konu,
      count(*) filter (where hakimiyet_seviyesi = 'uzak') as beyan_uzak_sayisi,
      count(*) filter (where hakimiyet_seviyesi = 'belirsiz') as beyan_belirsiz_sayisi,
      count(*) filter (where hakimiyet_seviyesi = 'yakin') as beyan_yakin_sayisi
    from beyan_satirlar
    group by ders, konu
  ),
  uzak_cevap_sayilari as (
    select ders, konu, takip_cevabi, count(*) as adet
    from log_satirlar
    where hedefe_yakinlik = 'uzak' and takip_cevabi is not null
    group by ders, konu, takip_cevabi
  ),
  uzak_cevap_siralanmis as (
    select ders, konu, takip_cevabi,
           row_number() over (partition by ders, konu order by adet desc) as sira
    from uzak_cevap_sayilari
  )
  select
    tk.ders, tk.konu,
    kos.ogrenci_sayisi,
    coalesce(lg.uzak_sayisi, 0) as uzak_sayisi,
    coalesce(lg.belirsiz_sayisi, 0) as belirsiz_sayisi,
    coalesce(lg.yakin_sayisi, 0) as yakin_sayisi,
    round(
      coalesce(lg.uzak_sayisi, 0)::numeric
      / nullif(coalesce(lg.uzak_sayisi, 0) + coalesce(lg.belirsiz_sayisi, 0) + coalesce(lg.yakin_sayisi, 0), 0),
      2
    ) as uzak_orani,
    u.takip_cevabi as en_sik_uzak_takip_cevabi,
    coalesce(bg.beyan_uzak_sayisi, 0) as beyan_uzak_sayisi,
    coalesce(bg.beyan_belirsiz_sayisi, 0) as beyan_belirsiz_sayisi,
    coalesce(bg.beyan_yakin_sayisi, 0) as beyan_yakin_sayisi
  from tum_konular tk
  join kapsayan_ogrenci_sayisi kos on kos.ders = tk.ders and kos.konu = tk.konu
  left join log_gruplu lg on lg.ders = tk.ders and lg.konu = tk.konu
  left join beyan_gruplu bg on bg.ders = tk.ders and bg.konu = tk.konu
  left join uzak_cevap_siralanmis u on u.ders = tk.ders and u.konu = tk.konu and u.sira = 1
  where kos.ogrenci_sayisi >= 3
  order by uzak_orani desc nulls last, kos.ogrenci_sayisi desc
  limit 30;
end;
$$;

revoke all on function public.konu_zayiflik_raporu(uuid, uuid) from public;
grant execute on function public.konu_zayiflik_raporu(uuid, uuid) to authenticated;

-- ============ Türkçe (Maarif) alt konu taslağı (migration 0060) ============
-- Türkçe'de Maarif Modeli ayrı konu başlığı vermiyor (tema/beceri bazlı) —
-- bu yüzden hem ÜST hem alt başlıklar burada TASLAK olarak üretildi (MEB'in
-- dört temel dil becerisi + söz varlığı/dil bilgisi çerçevesine dayanarak).
-- Kaynak dokümanla doğrulanmadı, gözden geçirilmeli. "Türkçe (Maarif)" düz
-- TYT "Türkçe" dersinin YANINDA duran AYRI bir ders — TYT listesine dokunulmadı.
do $$
declare
  v_satirlar jsonb := $json$[
    {"ust": "Okuma Kültürü ve Metin Türleri", "altlar": ["Okuma stratejileri ve okuduğunu anlama", "Öyküleyici metinler", "Bilgilendirici metinler", "Şiir türleri ve nazım biçimleri"]},
    {"ust": "Dinleme/İzleme Becerileri", "altlar": ["Dinleme/izleme stratejileri", "Sözlü metinleri anlama ve yorumlama", "Medya okuryazarlığı", "Dinlediğini/izlediğini değerlendirme"]},
    {"ust": "Konuşma Becerileri", "altlar": ["Hazırlıklı ve hazırlıksız konuşma", "Konuşma kuralları ve beden dili", "Anlatım biçimleri (betimleme, öyküleme, açıklama)", "Sunum teknikleri"]},
    {"ust": "Yazma Becerileri", "altlar": ["Yazma süreci (planlama, taslak, düzeltme)", "Öyküleyici ve betimleyici yazılar", "Bilgilendirici yazılar", "Yazım ve noktalama kurallarının uygulanması"]},
    {"ust": "Söz Varlığı ve Dil Bilgisi Uygulamaları", "altlar": ["Kelime ve kavram bilgisi", "Deyim, atasözü ve söz sanatları", "Cümlede ve sözcükte anlam uygulamaları", "Yazım ve noktalama kuralları"]},

    {"ust": "Metin Türleri: Bilgilendirici ve Öyküleyici", "altlar": ["Bilgilendirici metin çözümlemesi", "Öyküleyici metin çözümlemesi", "Metinler arası karşılaştırma", "Yazarın bakış açısını belirleme"]},
    {"ust": "Şiir İncelemesi", "altlar": ["Nazım birimi, ölçü, uyak", "Temalara göre şiir çözümlemesi", "Şiirde söz sanatları", "Şiir yazma denemeleri"]},
    {"ust": "Anlatım Biçimleri ve Düşünceyi Geliştirme Yolları", "altlar": ["Açıklayıcı ve tartışmacı anlatım", "Örnekleme, tanımlama, karşılaştırma", "Düşünceyi geliştirme yolları", "Metinde tutarlılık ve bütünlük"]},
    {"ust": "Yazılı ve Sözlü Anlatım Uygulamaları", "altlar": ["Deneme ve eleştiri yazma", "Sunum ve tartışma uygulamaları", "Rapor ve tutanak yazma", "Dilekçe ve resmî yazışmalar"]},
    {"ust": "Dil Bilgisi ve Anlatım Bozuklukları", "altlar": ["Cümle çözümlemesi", "Anlatım bozukluğu türleri", "Yazım ve noktalama uygulamaları", "Cümlede anlam ilişkileri"]},

    {"ust": "Eleştirel Okuma ve Metin Çözümleme", "altlar": ["Metni yorumlama ve eleştirme", "Yazarın amacını ve bakış açısını sorgulama", "Metinler arası ilişkilendirme", "Farklı disiplinlerden metin okuma"]},
    {"ust": "Tartışmacı ve Bilgilendirici Metinler", "altlar": ["Tez-antitez geliştirme", "Kanıt ve gerekçelendirme", "Makale ve fıkra türleri", "Sav ve karşı sav oluşturma"]},
    {"ust": "Sözlü Anlatım ve Tartışma Teknikleri", "altlar": ["Panel, forum, açık oturum", "Etkili konuşma ve ikna teknikleri", "Grup tartışmalarında rol alma", "Sözlü sunumda görsel destek kullanımı"]},
    {"ust": "Yazılı Anlatım: Deneme ve Eleştiri", "altlar": ["Deneme yazma teknikleri", "Eleştiri yazısı yazma", "Kompozisyon planlama ve düzenleme", "Özgün metin oluşturma"]},
    {"ust": "İleri Dil Bilgisi ve Anlatım Bozuklukları", "altlar": ["Karmaşık cümle çözümlemesi", "Anlatım bozukluklarını giderme", "Yazım ve noktalama ileri uygulamalar", "Metin türlerine göre dil kullanımı"]}
  ]$json$::jsonb;
  v_grup jsonb;
  v_alt text;
  v_sira int;
begin
  for v_grup in select * from jsonb_array_elements(v_satirlar) loop
    v_sira := 0;
    for v_alt in select * from jsonb_array_elements_text(v_grup->'altlar') loop
      if not exists (
        select 1 from public.mufredat_alt_konular
        where ders = 'Türkçe (Maarif)' and ust_konu = (v_grup->>'ust') and alt_baslik = v_alt
      ) then
        insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
        values ('Türkçe (Maarif)', v_grup->>'ust', v_alt, v_sira);
      end if;
      v_sira := v_sira + 1;
    end loop;
  end loop;
end $$;

-- ============ Analiz Motoru Faz A4: hedef net (migration 0061) ============
-- Katman 5 (hedefe uzaklık/projeksiyon) — hedef net alanını ÖĞRENCİ KENDİ
-- girer, hedef_bolum deseniyle tutarlı olarak admin de düzeltebilir. TYT ve
-- AYT AYRI tutuluyor: ikisi farklı ölçekte puanlanıyor (TYT azami ~120, AYT
-- alana göre değişiyor) ve ayrı ayrı deneme trendleri var.
alter table public.students add column if not exists hedef_net_tyt numeric;
alter table public.students add column if not exists hedef_net_ayt numeric;

alter table public.students drop constraint if exists students_hedef_net_tyt_araligi;
alter table public.students
  add constraint students_hedef_net_tyt_araligi check (hedef_net_tyt is null or (hedef_net_tyt >= 0 and hedef_net_tyt <= 120));

alter table public.students drop constraint if exists students_hedef_net_ayt_araligi;
alter table public.students
  add constraint students_hedef_net_ayt_araligi check (hedef_net_ayt is null or (hedef_net_ayt >= 0 and hedef_net_ayt <= 160));

comment on column public.students.hedef_net_tyt is
  'Öğrencinin kendi belirlediği TYT hedef net puanı — Analiz Motoru Faz A4 (hedefe uzaklık/projeksiyon) için. Nullable: girilmemişse o katman devre dışı kalır.';
comment on column public.students.hedef_net_ayt is
  'Öğrencinin kendi belirlediği AYT hedef net puanı — Analiz Motoru Faz A4 için. Nullable.';

-- Öğrenci kendi hedef_net_tyt/hedef_net_ayt alanlarını güncelleyebilsin diye
-- ek bir RLS politikası GEREKMEZ — mevcut students UPDATE politikaları
-- zaten öğrencinin kendi satırını güncellemesine izin veriyor.

-- ============ Rozet durumu: yetki genişletme (migration 0062) ============
-- ogrenci_rozet_durumu RPC'sinin yetki kontrolü (migration 0029) sadece
-- has_student_access() VEYA is_ogretmen() kapsıyordu — ADMIN ve OKUL
-- MODERATÖRÜ hiç kapsanmıyordu, bu yüzden /yonetici ve /moderator
-- ekranları bu RPC'yi çağıramıyor, service-role client + TS formül
-- kopyasıyla idare ediyordu. İmza/dönüş tipi (jsonb) DEĞİŞMEDİ.
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
  if not (
    public.has_student_access(p_student_id)
    or public.is_ogretmen()
    or public.is_admin()
    or exists (
      select 1 from public.students s
      where s.id = p_student_id and public.is_school_moderator(s.school_id)
    )
  ) then
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
