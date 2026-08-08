-- Deneme süresi üst sınırı 300 -> 165 dakikaya çekildi. Soru çözümü süresi
-- artık sabit bir üst sınır yerine, toplam soru sayısının (doğru+yanlış) iki
-- katıyla sınırlanıyor (bkz. src/app/dashboard/veri-actions.ts).
-- Eski constraint'leri kaldırıp yenilerini ekliyoruz (aynı isimle DROP+ADD —
-- tablo constraint'i olduğu için migration 0023'teki "must be owner of
-- function" tipi bir sorun beklenmiyor, o sadece fonksiyonlara özeldi).

alter table public.denemeler
  drop constraint if exists denemeler_sure_ust_sinir;
alter table public.denemeler
  add constraint denemeler_sure_ust_sinir check (sure_dakika <= 165) not valid;

alter table public.soru_cozumleri
  drop constraint if exists soru_cozumleri_sure_ust_sinir;
alter table public.soru_cozumleri
  add constraint soru_cozumleri_sure_ust_sinir check (sure_dakika <= 2 * (dogru + yanlis)) not valid;
