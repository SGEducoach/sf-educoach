-- ============================================================
-- DERSHANE MODU — Faz D1: veri modeli
-- ============================================================
-- Kapsam: sadece dershane (schools.tur='dershane'). Okul tarafı bu
-- migration'dan etkilenmez.
--
-- ÖNEMLİ NOT (yetkilendirme mimarisi): müdür'ün öğretmen/öğrenci
-- CRUD'u için burada YENİ bir RLS politikası / SECURITY DEFINER
-- fonksiyonu YOK. Sebep: bu projede admin'in tüm create/update/delete
-- işlemleri zaten RLS'e değil, application-layer bir kontrole dayanıyor
-- (bkz. src/app/dashboard/actions.ts requireAdmin() ve
-- src/app/yonetici/actions.ts requireAdmin() — "service-role client
-- RLS'i bypass ettiğinden bu kontrol olmadan herhangi bir oturum açmış
-- kullanıcı admin API'sini tetikleyebilirdi" yorumuyla). Dershane
-- müdürü CRUD'u da aynı desenle (requireDershaneMudur() → service-role
-- client, sadece role='mudur' VE kendi okulu tur='dershane' ise
-- dönderilir) uygulanacak — bu yüzden burada yeni bir RLS/CHECK
-- politikasına gerek yok, sadece yeni tablo/kolonlar var.

-- ---- 1) classes.program (haftaiçi/haftasonu) ----
-- Nullable: okul şubeleri bu alanı hiç kullanmaz.
alter table public.classes
  add column if not exists program text check (program in ('haftaici', 'haftasonu'));

-- ---- 2) students.veli_telefon ----
-- Dershane kaydında öğrenciden istenen veli telefonu — mevcut
-- veli_link_requests.veli_telefon'dan (veli kendi hesabını
-- oluştururken girdiği telefon) BAĞIMSIZ, henüz veli hesabı yokken
-- öğrenci/müdür tarafından toplanan bir alan.
alter table public.students
  add column if not exists veli_telefon text;

-- ---- 3) okul_no format kontrolü: CHECK → tur'a duyarlı trigger ----
-- Eski CHECK (migration 0012) herkese '^[0-9]{1,5}$' (okul no formatı)
-- dayatıyordu. Dershane'de bu alan artık "kullanıcı adı" (>=6 karakter,
-- boşluksuz) olarak kullanılacak — CHECK constraint alt sorgu/join
-- içeremediği için (schools.tur'a bakmamız gerekiyor) trigger'a geçildi.
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

-- ---- 4) pending_dershane_ogrenciler (roster ön-kayıt) ----
-- Müdürün tek tek/toplu yüklediği, henüz auth hesabı olmayan öğrenci
-- satırları. Öğrenci kendi kaydını telefon numarasıyla eşleştirerek
-- tamamlayınca bu satır tüketilir (kullanildi_at set edilir, satır
-- silinmez — denetim izi için).
--
-- RLS: bilinçli olarak HİÇBİR politika eklenmiyor (varsayılan: herkese
-- kapalı). Tüm erişim service-role (admin) client üzerinden,
-- application-layer kontrolle yapılacak — admin'in kendi tablolarıyla
-- (örn. school_moderators dışındaki çoğu admin-only tablo) aynı desen.
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

-- ---- 5) pdf_deneme_eslesme_bekleyenler (Faz D5, admin review kuyruğu) ----
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

-- Admin'in /yonetici sayfalarında normal (service-role olmayan) client
-- ile de listeyi okuyabilmesi için select izni; insert/update/delete
-- yine requireAdmin()'in service-role client'ı üzerinden yapılacak.
drop policy if exists "pdf_deneme_eslesme_select_admin" on public.pdf_deneme_eslesme_bekleyenler;
create policy "pdf_deneme_eslesme_select_admin" on public.pdf_deneme_eslesme_bekleyenler
  for select using (public.is_admin());
