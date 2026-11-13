-- Mezunun okul duyuruları (SMS/e-posta) için isteğe bağlı onayı (KVKK
-- metinleri, kullanıcı kararı 13.11.2026: dayanak sözleşme + meşru menfaat,
-- mezun iletişimi için ayrıca isteğe bağlı onay).
--
-- Üç durum:
--   null  : karar verilmemiş (hesapsız, PDF ile eklenen mezunlar ve onay
--           ekranını henüz görmemiş hesaplı mezunlar),
--   true  : mezun Mezun Profilim'den onay verdi,
--   false : mezun onayını geri aldı.
-- Kural (src/app/dashboard/mezun-actions.ts mezunSmsGonder): HESABI OLAN
-- mezuna yalnız iletisim_onayi = true ise SMS gider. Hesapsız mezunun
-- bilgilendirilmesi okulun sorumluluğundadır (KVKK taslağı, Bölüm 0/4).

alter table public.mezunlar add column if not exists iletisim_onayi boolean;
alter table public.mezunlar add column if not exists iletisim_onay_at timestamptz;
