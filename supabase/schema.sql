-- SG EduCoach - Supabase şema (v1)
-- Roller: ogrenci, veli, koc

-- ============ RESET (yalnızca geliştirme aşamasında) ============
-- Bu script'i defalarca çalıştırabilmek için önce önceki sürümün
-- nesnelerini temizler. Gerçek kullanıcı verisi biriktikten sonra bu
-- blok kaldırılmalı ve ileri değişiklikler ayrı migration dosyalarıyla
-- yapılmalıdır.
drop table if exists public.notifications cascade;
drop table if exists public.study_sessions cascade;
drop table if exists public.exams cascade;
drop table if exists public.parent_students cascade;
drop table if exists public.coach_students cascade;
drop table if exists public.students cascade;
drop table if exists public.profiles cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.has_student_access(uuid) cascade;
drop function if exists public.find_student_by_email(text) cascade;
drop function if exists public.find_student_by_code(text, text) cascade;
drop sequence if exists public.ogrenci_no_seq;
drop type if exists public.user_role cascade;
drop type if exists public.notification_type cascade;

-- 1) profiles: her auth.users kaydına eşlik eden profil + rol
create type public.user_role as enum ('ogrenci', 'veli', 'koc');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ad text not null,
  email text not null,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

-- 2) students: öğrenciye özgü ek bilgiler (bir öğrenci = bir profil, role='ogrenci')
-- ogrenci_no + baglanti_kodu: koç/veli bu ikisini birlikte girerek öğrenciye
-- bağlanır (e-posta paylaşmaya gerek kalmadan, öğrencinin kendisi paylaşır).
create sequence public.ogrenci_no_seq;

create table public.students (
  id uuid primary key references public.profiles(id) on delete cascade,
  hedef_puan integer not null,
  hedef_bolum text not null,
  sinif text, -- örn. "11-C"
  yks_yili integer,
  ogrenci_no text not null unique,
  baglanti_kodu text not null,
  created_at timestamptz not null default now()
);

-- 3) coach_students: koç-öğrenci ilişkisi (bir koç birden çok öğrenciye bakabilir)
create table public.coach_students (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, student_id)
);

-- 4) parent_students: veli-öğrenci ilişkisi
create table public.parent_students (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

-- 5) exams (denemeler)
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null,
  tyt_net numeric(5,2) not null,
  ayt_net numeric(5,2) not null,
  puan numeric(6,2) not null,
  created_at timestamptz not null default now()
);

-- 6) study_sessions (calismalar)
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null,
  ders text not null,
  dakika integer not null check (dakika > 0),
  created_at timestamptz not null default now()
);

-- 7) notifications (bildirimler)
create type public.notification_type as enum ('basari', 'uyari', 'bilgi');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  tarih date not null default current_date,
  tip public.notification_type not null default 'bilgi',
  mesaj text not null,
  created_at timestamptz not null default now()
);

-- Indexler
create index on public.exams (student_id, tarih);
create index on public.study_sessions (student_id, tarih);
create index on public.notifications (student_id, tarih desc);
create index on public.coach_students (student_id);
create index on public.parent_students (student_id);

-- ============ Yeni kullanıcı trigger'ı ============
-- auth.users içinde yeni kullanıcı oluşunca profiles (ve role='ogrenci' ise
-- students) satırını otomatik oluşturur. Rol/ad/hedef bilgileri, signUp
-- çağrısındaki `options.data` (raw_user_meta_data) alanından okunur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := coalesce(new.raw_user_meta_data->>'role', 'ogrenci')::public.user_role;
  v_student_id uuid;
begin
  insert into public.profiles (id, ad, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'ad', new.email), new.email, v_role);

  if v_role = 'ogrenci' then
    insert into public.students (id, hedef_puan, hedef_bolum, sinif, yks_yili, ogrenci_no, baglanti_kodu)
    values (
      new.id,
      coalesce((new.raw_user_meta_data->>'hedef_puan')::integer, 0),
      coalesce(new.raw_user_meta_data->>'hedef_bolum', ''),
      new.raw_user_meta_data->>'sinif',
      (new.raw_user_meta_data->>'yks_yili')::integer,
      'SG' || lpad(nextval('public.ogrenci_no_seq')::text, 5, '0'),
      upper(substr(md5(random()::text || new.id::text), 1, 6))
    );
  elsif v_role = 'veli'
    and new.raw_user_meta_data->>'ogrenci_no' is not null
    and new.raw_user_meta_data->>'baglanti_kodu' is not null then
    select s.id into v_student_id
    from public.students s
    where s.ogrenci_no = new.raw_user_meta_data->>'ogrenci_no'
      and s.baglanti_kodu = new.raw_user_meta_data->>'baglanti_kodu';

    if v_student_id is not null then
      insert into public.parent_students (parent_id, student_id)
      values (new.id, v_student_id)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.coach_students enable row level security;
alter table public.parent_students enable row level security;
alter table public.exams enable row level security;
alter table public.study_sessions enable row level security;
alter table public.notifications enable row level security;

-- Yardımcı fonksiyon: verilen öğrenciye erişimi olan kullanıcı mı?
create or replace function public.has_student_access(target_student_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select
    target_student_id = auth.uid() -- öğrencinin kendisi
    or exists (select 1 from public.coach_students cs where cs.student_id = target_student_id and cs.coach_id = auth.uid())
    or exists (select 1 from public.parent_students ps where ps.student_id = target_student_id and ps.parent_id = auth.uid());
$$;

-- profiles: herkes kendi profilini görür/günceller; koç/veli bağlı olduğu öğrencilerin profilini görebilir
create policy "profiles_select_own_or_related" on public.profiles
  for select using (
    id = auth.uid() or public.has_student_access(id)
  );
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- students: erişimi olan herkes görür; sadece öğrencinin kendisi (veya servis rolü) günceller
create policy "students_select_related" on public.students
  for select using (public.has_student_access(id));
create policy "students_update_own" on public.students
  for update using (id = auth.uid());
create policy "students_insert_own" on public.students
  for insert with check (id = auth.uid());

-- coach_students: koç kendi bağlantısını ekleyebilir/görebilir/silebilir; öğrenci de görebilir
create policy "coach_students_select" on public.coach_students
  for select using (coach_id = auth.uid() or student_id = auth.uid());
create policy "coach_students_insert" on public.coach_students
  for insert with check (coach_id = auth.uid());
create policy "coach_students_delete" on public.coach_students
  for delete using (coach_id = auth.uid());

-- parent_students: veli kendi bağlantısını ekleyebilir/görebilir/silebilir; öğrenci de görebilir
create policy "parent_students_select" on public.parent_students
  for select using (parent_id = auth.uid() or student_id = auth.uid());
create policy "parent_students_insert" on public.parent_students
  for insert with check (parent_id = auth.uid());
create policy "parent_students_delete" on public.parent_students
  for delete using (parent_id = auth.uid());

-- exams: erişimi olanlar görür; sadece öğrenci kendi deneme kaydını ekler
create policy "exams_select_related" on public.exams
  for select using (public.has_student_access(student_id));
create policy "exams_insert_own" on public.exams
  for insert with check (student_id = auth.uid());

-- study_sessions: erişimi olanlar görür; sadece öğrenci kendi kaydını ekler
create policy "study_sessions_select_related" on public.study_sessions
  for select using (public.has_student_access(student_id));
create policy "study_sessions_insert_own" on public.study_sessions
  for insert with check (student_id = auth.uid());

-- notifications: erişimi olanlar görür; koç ekleyebilir (öğrenci/veli sadece okur)
create policy "notifications_select_related" on public.notifications
  for select using (public.has_student_access(student_id));
create policy "notifications_insert_coach" on public.notifications
  for insert with check (
    exists (select 1 from public.coach_students cs where cs.student_id = notifications.student_id and cs.coach_id = auth.uid())
  );

-- ============ Öğrenciyi no + koduyla bulma (koç/veli bağlama akışı için) ============
-- RLS'i bypass eder ama sadece hem ogrenci_no hem baglanti_kodu birlikte doğru
-- girildiğinde eşleşen öğrencinin id/ad alanlarını döndürür.
create or replace function public.find_student_by_code(p_ogrenci_no text, p_kod text)
returns table (id uuid, ad text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.ad
  from public.students s
  join public.profiles p on p.id = s.id
  where s.ogrenci_no = p_ogrenci_no and s.baglanti_kodu = p_kod;
$$;

revoke all on function public.find_student_by_code(text, text) from public;
grant execute on function public.find_student_by_code(text, text) to authenticated;
