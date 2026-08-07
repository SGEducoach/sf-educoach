-- Hesap pasifleştirme (soft-delete) için: profiles.aktif sadece
-- görüntüleme/filtreleme amaçlı bir bayrak — gerçek giriş engeli Supabase
-- Auth admin API'sindeki ban_duration ile uygulanıyor (bkz.
-- src/app/yonetici/actions.ts: hesapAktiflikDegistir). Admin server action'ı
-- service-role client kullandığı için RLS bypass ediliyor, ekstra bir
-- policy gerekmiyor.

alter table public.profiles add column if not exists aktif boolean not null default true;
