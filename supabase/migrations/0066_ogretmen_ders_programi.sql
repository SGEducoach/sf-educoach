-- Öğretmen Ders Programı (2026-08-25 kullanıcı isteği) — "Derslerim"
-- sayfasına haftalık ders programı ekleniyor. Kullanıcının kendi okulundan
-- paylaştığı gerçek MEB ders programı formatı esas alındı (bkz.
-- dokumanlar/mufredat/öğretmen proğramı.pdf): gün × ders saati matrisi,
-- her hücrede sınıf (üstte) + ders (altta). Ders saati dilimleri sabit
-- (o PDF'teki 8 dilim, "format hep bu şekilde" — kullanıcı onayı) —
-- src/lib/ders-programi.ts'te DERS_SAATI_DILIMLERI olarak tutuluyor,
-- burada sadece dilim SIRA NUMARASI (1-8) saklanıyor.
--
-- Kapsam: SADECE admin ve dershane müdürü elle ekleyebilir (kullanıcı
-- kararı) — okul müdürü/moderatörü salt-okunur. Roster/dershane
-- roster'ındaki gibi yazma işlemleri RLS'e değil, server action'daki
-- requireAdmin()/requireDershaneMudur() + service-role client'a dayanıyor
-- (bkz. dershaneOgrenciKesinKaydet deseni) — bu yüzden burada insert/
-- update/delete RLS politikası YOK, sadece select var.
create table public.ogretmen_ders_programi (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  gun text not null check (gun in ('pazartesi','sali','carsamba','persembe','cuma','cumartesi','pazar')),
  ders_saati_sira integer not null check (ders_saati_sira between 1 and 8),
  class_id uuid not null references public.classes(id) on delete cascade,
  ders text not null,
  olusturan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (teacher_id, gun, ders_saati_sira)
);

alter table public.ogretmen_ders_programi enable row level security;

-- Öğretmen kendi programını görür.
create policy "ders_programi_select_kendi" on public.ogretmen_ders_programi
  for select using (teacher_id = auth.uid());

-- Okul/dershane moderatörü (müdür dahil) kendi kurumunun programlarını görür.
create policy "ders_programi_select_moderator" on public.ogretmen_ders_programi
  for select using (
    exists (
      select 1 from public.teachers t
      where t.id = ogretmen_ders_programi.teacher_id
        and public.is_school_moderator(t.school_id)
    )
  );

-- Admin her şeyi görür.
create policy "ders_programi_select_admin" on public.ogretmen_ders_programi
  for select using (public.is_admin());

-- Yurt Nöbeti (2026-08-25 kullanıcı isteği, aynı Derslerim sayfası) —
-- SADECE okul (dershanede yurt yok, kullanıcı onayı: "okul için sadece").
-- Ders programının aksine bu basit bir kişisel tarih defteri (2 sütun × 6
-- bölüm, her hücreye sadece tarih yazılıyor) — ders programındaki gibi
-- idari bir atama değil, "Girdiğim sınıflar ve derslerim" chip listesiyle
-- aynı sayfadaki aynı öz-yönetim deseniyle öğretmenin KENDİSİ dolduruyor
-- (bkz. ogretmen_dersleri tablosu/ogretmenDersEkle). Yanlış varsayımsa
-- (örn. aslında müdür/idare atamalı) kolayca admin-only'e çevrilebilir.
create table public.ogretmen_yurt_nobeti (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  sutun integer not null check (sutun in (1, 2)),
  sira integer not null check (sira between 1 and 6),
  tarih date,
  created_at timestamptz not null default now(),
  unique (teacher_id, sutun, sira)
);

alter table public.ogretmen_yurt_nobeti enable row level security;

-- "for all" select'i de kapsıyor, ayrı bir select_kendi politikasına
-- gerek yok.
create policy "yurt_nobeti_all_kendi" on public.ogretmen_yurt_nobeti
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "yurt_nobeti_select_moderator" on public.ogretmen_yurt_nobeti
  for select using (
    exists (
      select 1 from public.teachers t
      where t.id = ogretmen_yurt_nobeti.teacher_id
        and public.is_school_moderator(t.school_id)
    )
  );
create policy "yurt_nobeti_select_admin" on public.ogretmen_yurt_nobeti
  for select using (public.is_admin());

-- Yurt Nöbeti hatırlatma bildirimleri (2026-08-25 kullanıcı isteği) —
-- nöbet tarihinden BİR GÜN ÖNCE, o gün içinde 09:00/15:00/21:00'da (üç
-- ayrı cron tetiklemesi, bkz. vercel.json + /api/cron/yurt-nobeti-bildirim)
-- kademeli hatırlatma: bir önceki sıradaki bildirim OKUNMADAN bir sonraki
-- gönderilmiyor (okundu_at kontrolü). "Okundu" işareti bildirime
-- tıklanınca service worker'ın çağırdığı /api/bildirim/okundu route'undan
-- geliyor (bkz. public/sw.js). Servis-role dışında hiç kimse erişmiyor
-- (RLS açık, hiçbir politika yok = varsayılan tamamen kapalı).
create table public.ogretmen_yurt_nobeti_bildirim (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  tarih date not null,
  sira integer not null check (sira in (1, 2, 3)),
  gonderildi_at timestamptz not null default now(),
  okundu_at timestamptz,
  unique (teacher_id, tarih, sira)
);
alter table public.ogretmen_yurt_nobeti_bildirim enable row level security;
