-- 0114'teki "revoke ... from anon" satırları etkisizdi: Supabase'de
-- fonksiyonlar PUBLIC'e EXECUTE ile açılıyor, anon/authenticated bu yetkiyi
-- PUBLIC üzerinden alıyor. Güvenlik denetçisi (get_advisors) yakaladı.
--
-- Yalnızca kapasite fonksiyonları kapatılıyor: grup_aktif_ogrenci_sayisi
-- oturumsuz birine herhangi bir kurumun aktif öğrenci sayısını söylüyordu,
-- grup_kapasitesini_denetle dışarıdan çağrılabiliyordu. Tetikleyiciler bu
-- fonksiyonları sahip (definer) yetkisiyle çağırdığı için etkilenmez; sunucu
-- (service_role) çağırabilir.
--
-- Erişim politikalarında kullanılan yardımcılar (kurumu_gorebilir,
-- kurum_uyesi_mi vb.) BİLEREK açık bırakılıyor: politika içinde sorguyu yapan
-- rolün (anon dahil) EXECUTE yetkisi olmazsa sorgu "permission denied" ile
-- düşer. Bu fonksiyonlar yalnızca çağıranın kendi erişimini evet/hayır döner.
revoke execute on function public.grup_aktif_ogrenci_sayisi(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.grup_kapasitesini_denetle(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grup_aktif_ogrenci_sayisi(uuid, uuid) to service_role;
grant execute on function public.grup_kapasitesini_denetle(uuid, uuid) to service_role;
