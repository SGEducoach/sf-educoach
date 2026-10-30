-- Mezun Takip modülü (kullanıcı isteği 30.10.2026). Rehberlik servisi ve müdür
-- mezunların iletişim ve güncel durum bilgisini tutar, SMS ile ulaşır.
--
-- Kaynaklar:
--   'otomatik': ders yılı bitince (1 Temmuz–31 Ağustos) o yıl 12. sınıfta olan
--               öğrenciler (hesabı olan + okul listesindeki hesapsızlar),
--   'pdf'     : rehberin hazırladığı PDF'ten toplu ekleme (eski mezunlar),
--   'elle'    : ekrandan tek tek ekleme.
--
-- Kişisel veri (telefon, e-posta, adres) içerdiği için tablo YALNIZ
-- sunucu/service_role ile okunur-yazılır; yetki (kurumun rehberlik servisi ve
-- müdürü) sunucu işlemlerinde doğrulanır (src/lib/mezun-veri.ts).

create table if not exists public.mezunlar (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad text not null check (char_length(btrim(ad)) between 1 and 80),
  soyad text not null default '' check (char_length(soyad) <= 80),
  il text check (il is null or char_length(il) <= 40),
  ilce text check (ilce is null or char_length(ilce) <= 60),
  eposta text check (eposta is null or char_length(eposta) <= 120),
  -- 905XXXXXXXXX biçiminde (sms-telefon.ts telefonuNormallestir).
  telefon text check (telefon is null or telefon ~ '^905[0-9]{9}$'),
  universite text check (universite is null or char_length(universite) <= 160),
  meslek text check (meslek is null or char_length(meslek) <= 120),
  mezuniyet_yili smallint not null check (mezuniyet_yili between 1950 and 2100),
  okul_no text check (okul_no is null or char_length(okul_no) <= 20),
  -- Otomatik aktarımda öğrencinin kaynağı; aynı kişi iki kez eklenmesin diye.
  student_id uuid references public.students(id) on delete set null,
  liste_ogrenci_id uuid references public.okul_ogrenci_listesi(id) on delete set null,
  kaynak text not null check (kaynak in ('otomatik', 'pdf', 'elle')),
  ekleyen_id uuid references public.profiles(id) on delete set null,
  guncelleyen_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mezunlar_okul_yil_idx on public.mezunlar (school_id, mezuniyet_yili desc);
create unique index if not exists mezunlar_ogrenci_tekil on public.mezunlar (school_id, student_id) where student_id is not null;
create unique index if not exists mezunlar_liste_tekil on public.mezunlar (school_id, liste_ogrenci_id) where liste_ogrenci_id is not null;

alter table public.mezunlar enable row level security;
revoke all on table public.mezunlar from public, anon, authenticated;
grant select, insert, update, delete on table public.mezunlar to service_role;

comment on table public.mezunlar is
  'Yalniz sunucu/service_role: Mezun Takip modulu (kurumun rehberlik servisi ve muduru); migration 0184.';
