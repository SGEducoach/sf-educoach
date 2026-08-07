-- Bir öğrenci gerçek bir olayda haftalık/günlük TOPLAM süreyi tek bir "süre"
-- alanına girip (ör. "4000 dakika") istatistikleri bozdu. Uygulama
-- tarafındaki doğrulamaya ek olarak veritabanı seviyesinde de bir üst sınır
-- ekleniyor (savunma katmanı). NOT VALID: mevcut (hatalı) satırları
-- etkilemez, sadece yeni/güncellenen satırlara uygulanır.

alter table public.konu_calismalar
  add constraint konu_calismalar_sure_ust_sinir check (sure_dakika <= 480) not valid;

alter table public.soru_cozumleri
  add constraint soru_cozumleri_sure_ust_sinir check (sure_dakika <= 480) not valid;

alter table public.denemeler
  add constraint denemeler_sure_ust_sinir check (sure_dakika <= 300) not valid;
