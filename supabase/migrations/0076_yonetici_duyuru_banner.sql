-- Kullanıcı isteği (26.08.2026): admin duyurusu artık sadece
-- öğrenci/veli mesaj kutusuna düşmüyor — TÜM kullanıcılara (rol fark
-- etmeksizin) sitenin üstünde sabit bir şerit ("Yönetici Duyurusu: ...")
-- olarak da gösterilecek. Opsiyonel bir süre (bitiş zamanı) ve hedef kurum
-- (belirli bir okul/dershane ya da "Tümü") seçilebilecek. platform_ayarlari
-- zaten tek satırlık (id=1) bir genel ayar tablosu (bkz. migration 0065,
-- 0072) — yeni sütunlar buraya ekleniyor.
alter table public.platform_ayarlari
  add column aktif_duyuru_metni text,
  add column aktif_duyuru_bitis timestamptz,
  add column aktif_duyuru_kurum_id uuid references public.schools(id) on delete set null;
