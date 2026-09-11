-- Kullanıcı kararı (11.09.2026): yazılı analizine "dürüstlük engeli" —
-- analiz yalnızca öğrencisinin takibini düzenli yapan öğretmene açık:
--   * son 7 günde en az 3 farklı gün panele giriş,
--   * bu dönem en az 10 görev verme (gorevler.olusturan_ogretmen_id),
--   * bu dönem en az 10 farklı öğrencinin profilini görüntüleme.
-- Giriş günleri ve profil görüntülemeleri bugüne kadar hiç kaydedilmiyordu
-- (auth.audit_log_entries boş); bu iki tablo onları tutar. Engel 2 haftalık
-- ölçüm süresinden sonra (25.09.2026) devreye girer — bkz. src/lib/yazili-erisim.ts.
--
-- GÜVENLİK: anon/authenticated rollerine HİÇBİR izin ve politika yok —
-- satırları yalnızca sunucu (servis anahtarı) yazar ve okur. Öğretmene yazma
-- izni verilseydi kendi API anahtarıyla sahte gün/görüntüleme ekleyip engeli
-- aşabilirdi.
create table if not exists public.ogretmen_aktif_gunleri (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  gun date not null,
  created_at timestamptz not null default now(),
  primary key (teacher_id, gun)
);

create table if not exists public.ogretmen_profil_goruntulemeleri (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  gun date not null,
  created_at timestamptz not null default now(),
  primary key (teacher_id, student_id, gun)
);

create index if not exists ogretmen_profil_goruntulemeleri_teacher_gun
  on public.ogretmen_profil_goruntulemeleri (teacher_id, gun);

alter table public.ogretmen_aktif_gunleri enable row level security;
alter table public.ogretmen_profil_goruntulemeleri enable row level security;

revoke all on public.ogretmen_aktif_gunleri from anon, authenticated;
revoke all on public.ogretmen_profil_goruntulemeleri from anon, authenticated;
