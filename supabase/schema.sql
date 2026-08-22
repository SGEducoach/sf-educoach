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
