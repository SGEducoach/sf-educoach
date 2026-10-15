-- İlkokul (kullanıcı kararları 16.10.2026, ilk müşteri: kolej).
--
-- İlkokul ayrı bir modül değil, ortaokul kademesindeki kurumun 1-4.
-- sınıfları. İlkokul öğrencisi SİSTEME GİRMEZ (giriş /api/giris'te
-- sınıf seviyesinden reddedilir); kaydı veli bağlantısı, duyuru ve
-- raporlar için var. Onu veli ve kurum izler.
--
-- Kapsam yalnız: gelişim raporu (on kalem), sosyal etkinlik, veli
-- bilgilendirme. Rehberlik servisi 1-4'ü de kapsayabilir; "Rehberlik"
-- kalemini o işaretler.

-- 1) 1-4. sınıflar açılabilsin.
alter table public.classes drop constraint if exists classes_seviye_check;
alter table public.classes
  add constraint classes_seviye_check
  check (seviye in ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'));

-- 2) Rehberlik servisinin kapsamına 1-4 eklenebilsin.
alter table public.rehberlik_servisi drop constraint if exists rehberlik_servisi_sinif_duzeyleri_check;
alter table public.rehberlik_servisi
  add constraint rehberlik_servisi_sinif_duzeyleri_check
  check (sinif_duzeyleri <@ array['1','2','3','4','5','6','7','8','9','10','11','12']::text[]);

-- 3) YKS alanı ilkokulda da anlamsız: 0148'deki tetikleyici 1-8'i kapsasın.
create or replace function public.ortaokul_ayt_alanini_temizle()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.class_id is not null and new.ayt_alan is not null and exists (
    select 1 from public.classes c
    where c.id = new.class_id and c.seviye in ('1', '2', '3', '4', '5', '6', '7', '8')
  ) then
    new.ayt_alan := null;
  end if;
  return new;
end;
$$;

-- 4) Gelişim raporu: öğrenci × ay × kalem için üç düzeyden biri.
-- Kalem listesi uygulamada (src/lib/ilkokul-gelisim.ts) ile birebir aynı.
-- Yazma YALNIZ sunucu işlemleriyle (service role) — kim hangi kalemi
-- işaretleyebilir kuralı orada (sınıf öğretmeni / rehberlik servisi /
-- müdür-moderatör). Okuma RLS ile: kurum personeli (rehber kendi
-- kapsamıyla) ve veli.
create table if not exists public.ilkokul_gelisim (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  ay date not null check (extract(day from ay) = 1),
  kalem text not null check (kalem in (
    'matematik', 'turkce', 'hayat_bilgisi', 'ingilizce', 'degerler',
    'resim', 'muzik', 'beden_egitimi', 'sosyal_etkinlik', 'rehberlik'
  )),
  duzey text not null check (duzey in ('gelistirilmeli', 'gelisiyor', 'basarili')),
  giren_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, ay, kalem)
);
create index if not exists ilkokul_gelisim_student_ay_idx on public.ilkokul_gelisim (student_id, ay desc);

-- Ay notu: sınıf öğretmeninin ve rehberlik servisinin ayrı birer kısa notu.
create table if not exists public.ilkokul_gelisim_notlari (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  ay date not null check (extract(day from ay) = 1),
  tur text not null check (tur in ('ogretmen', 'rehberlik')),
  metin text not null check (char_length(metin) between 1 and 600),
  giren_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, ay, tur)
);

alter table public.ilkokul_gelisim enable row level security;
alter table public.ilkokul_gelisim_notlari enable row level security;

drop policy if exists "ilkokul_gelisim_select" on public.ilkokul_gelisim;
create policy "ilkokul_gelisim_select" on public.ilkokul_gelisim for select using (
  (public.kurum_ogrencisini_gorebilir(student_id) and public.rehber_ogrenciyi_gorebilir(student_id))
  or public.has_student_access(student_id)
);

drop policy if exists "ilkokul_gelisim_notlari_select" on public.ilkokul_gelisim_notlari;
create policy "ilkokul_gelisim_notlari_select" on public.ilkokul_gelisim_notlari for select using (
  (public.kurum_ogrencisini_gorebilir(student_id) and public.rehber_ogrenciyi_gorebilir(student_id))
  or public.has_student_access(student_id)
);

-- 5) Sosyal etkinlik: sınıf öğretmeni (ya da müdür/moderatör) sınıfın
-- etkinliğini ve katılanları girer; veli çocuğunun katıldıklarını görür.
-- Okullardaki etkinlik grupları modülü (0091) Beden Eğitimi/Müzik
-- öğretmenine özel ve katılımı öğrencinin kendisi onaylıyor; ilkokul
-- öğrencisi giriş yapmadığı için ayrı ve sade bir kayıt.
create table if not exists public.ilkokul_etkinlikleri (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  ad text not null check (char_length(ad) between 2 and 150),
  tarih date not null,
  aciklama text check (aciklama is null or char_length(aciklama) <= 600),
  olusturan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ilkokul_etkinlikleri_sinif_idx on public.ilkokul_etkinlikleri (class_id, tarih desc);

create table if not exists public.ilkokul_etkinlik_katilimlari (
  etkinlik_id uuid not null references public.ilkokul_etkinlikleri(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (etkinlik_id, student_id)
);
create index if not exists ilkokul_etkinlik_katilimlari_ogrenci_idx on public.ilkokul_etkinlik_katilimlari (student_id);

alter table public.ilkokul_etkinlikleri enable row level security;
alter table public.ilkokul_etkinlik_katilimlari enable row level security;

drop policy if exists "ilkokul_etkinlikleri_select" on public.ilkokul_etkinlikleri;
create policy "ilkokul_etkinlikleri_select" on public.ilkokul_etkinlikleri for select using (
  public.kurumu_gorebilir(school_id)
  or exists (
    select 1 from public.ilkokul_etkinlik_katilimlari k
    where k.etkinlik_id = ilkokul_etkinlikleri.id and public.has_student_access(k.student_id)
  )
);

drop policy if exists "ilkokul_etkinlik_katilimlari_select" on public.ilkokul_etkinlik_katilimlari;
create policy "ilkokul_etkinlik_katilimlari_select" on public.ilkokul_etkinlik_katilimlari for select using (
  public.kurum_ogrencisini_gorebilir(student_id) or public.has_student_access(student_id)
);

comment on table public.ilkokul_gelisim is
  'Ilkokul (1-4) aylik gelisim raporu, migration 0157. Yazma yalniz sunucu islemleriyle (src/app/dashboard/ilkokul-actions.ts).';
