-- Veli akışının sadeleştirilmesi (29.08.2026 kullanıcı isteği).
--
-- Bağlam: telefon/e-posta hiçbir zaman doğrulanmıyordu (SMS/OTP yok) —
-- tek gerçek güvenlik kapısı zaten öğretmenin onayı. Ayrıca ongoing
-- login'de HEM tek seferlik kod HEM şifre isteniyordu (bkz.
-- resolve_veli_login, migration 0035) — "kod hesabın kalıcı sırrı"
-- diye tasarlanmış ama tamamla ekranı ayrıca gerçek bir şifre de
-- oluşturuyordu, ikisi çelişiyordu ve "kayıtlı değilsin" tipi hatalara
-- yol açıyordu.
--
-- Yeni akış:
--   Kayıt/Talep : Ad Soyad + Öğrenci No (telefon YOK).
--   Giriş       : Öğrenci No + TEK alan (kod veya şifre) — /api/veli/dogrula
--                 önce "taze kod mu" diye bakar, değilse resolve_veli_email_adaylari
--                 ile normal şifre denenir. Kod tutarsa "şifreni belirle"
--                 adımı (mevcut /api/veli/tamamla, DEĞİŞMEDİ) devreye girer.

alter table public.veli_link_requests
  alter column veli_telefon drop not null;

-- Eski resolver artık kullanılmıyor (LoginForm + /api/giris güncellendi) —
-- kod'u HER girişte zorunlu kılan tasarım kaldırıldı.
drop function if exists public.resolve_veli_login(uuid, text, text);

-- Bir öğrencinin TÜM tamamlanmış (durum='kullanildi') veli hesaplarının
-- e-postalarını döner — bir öğrencide birden fazla veli (anne+baba ayrı
-- hesap) olabildiği için tekil değil, küme dönüyor; /api/giris sırasıyla
-- her adaya şifreyi dener. school_id+okul_no eşleşmezse boş küme döner
-- (bilgi sızdırmaz, mevcut resolver'larla aynı desen).
create or replace function public.resolve_veli_email_adaylari(p_school_id uuid, p_okul_no text)
returns setof text
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
    and r.durum = 'kullanildi';
$$;

revoke all on function public.resolve_veli_email_adaylari(uuid, text) from public;
grant execute on function public.resolve_veli_email_adaylari(uuid, text) to anon, authenticated;
