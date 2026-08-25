-- Faz 3 (2026-08-26 kullanıcı isteği) — "Okul için admin(yönetici) rolü":
-- 1) Site ayarları: admin'in siteyi bakıma alıp açabilmesi için tek bir
--    bayrak (mevcut platform_ayarlari singleton tablosuna eklendi, bkz.
--    migration 0065).
-- 2) Admin hesap gizliliği: "Admin tüm kullanıcıları görüp müdahale
--    edebilirken admin hesaplarını diğer hiçbir rol göremez, müdahale
--    edemez." — profiles_select_any_teacher politikası (migration 0014)
--    rol filtresi olmadan is_ogretmen()'e (ki bu fonksiyon admin'i de
--    kapsıyor) bağlıydı; yani herhangi bir öğretmen/müdür, admin
--    hesaplarını doğrudan REST/İstemci sorgusuyla (uygulama katmanındaki
--    .neq("role","admin") filtrelerini atlayarak) görebiliyordu. Şimdi:
--    admin olmayan hedef satırlar herkese (öğretmen/müdür/admin), admin
--    hedef satırları SADECE admin'e açık.

alter table public.platform_ayarlari add column if not exists site_kapali boolean not null default false;

comment on column public.platform_ayarlari.site_kapali is
  'true iken /dashboard ve /moderator admin olmayan oturumlara bakım ekranı gösterir (bkz. src/lib/supabase/middleware.ts). /yonetici, /login, /signup her zaman açık kalır.';

drop policy if exists "profiles_select_any_teacher" on public.profiles;
create policy "profiles_select_any_teacher" on public.profiles
  for select using (
    (public.is_ogretmen() and role <> 'admin')
    or public.is_admin()
  );
