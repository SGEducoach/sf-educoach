-- Veli davet bağlantısı (kullanıcı isteği 13.11.2026: "velilere kolay ve
-- güvenli bir üyelik"). Eski akış üç kişiyi gerektiriyordu (veli talep eder,
-- sınıf öğretmeni onaylar, kod öğrencinin mesaj kutusuna düşer); tüm
-- kurumlarda yalnız 6 veli hesabı açılabilmişti.
--
-- Yeni akış: öğrenci kendi panelinden tek kullanımlık, 7 gün geçerli bir
-- bağlantı üretir; veli bağlantıyı açıp ad, telefon ve şifresiyle hesabını
-- kurar. Kimlik doğrulayan taraf, oturum açmış öğrencinin kendisidir.
--
-- Ham anahtar (token) YALNIZ bağlantının içinde bulunur; tabloda SHA-256
-- özeti tutulur — tablo sızsa bile bağlantı yeniden üretilemez. Hesap, eski
-- akışla aynı yoldan açılır: davet kullanılınca 'onaylandi' durumlu bir
-- veli_link_requests satırı oluşturulur, handle_new_user tetikleyicisi veliyi
-- öğrenciye bağlar ve satırı 'kullanildi' yapar; veli girişi (okul + öğrenci
-- no + şifre, resolve_veli_email_adaylari) hiç değişmez.
--
-- Kişisel veri içermez ama kötüye kullanıma açık olduğundan tablo yalnız
-- sunucu/service_role ile okunur-yazılır (src/app/dashboard/veli-davet-actions.ts,
-- src/app/api/veli/davet/route.ts).

create table if not exists public.veli_davetleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  token_ozeti text not null unique check (token_ozeti ~ '^[0-9a-f]{64}$'),
  son_kullanma timestamptz not null,
  kullanildi_at timestamptz,
  iptal_at timestamptz,
  talep_id uuid references public.veli_link_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists veli_davetleri_ogrenci_idx on public.veli_davetleri (student_id, created_at desc);

alter table public.veli_davetleri enable row level security;
revoke all on table public.veli_davetleri from public, anon, authenticated;
grant select, insert, update, delete on table public.veli_davetleri to service_role;
