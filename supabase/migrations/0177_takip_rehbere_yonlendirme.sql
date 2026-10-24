-- Sınıf öğretmeninden rehberlik servisine öğrenci yönlendirme (kullanıcı
-- kararı 24.10.2026). Yönlendirme ayrı bir akış değil, sınıf öğretmeninin
-- Takip Bildirimleri'ndeki "Ele Alındı" adımına bağlı: öğretmen
-- değerlendirmesini yazarken "Rehberlik servisine yönlendir"i işaretler.
--
-- Etkisi (uygulama tarafında, bkz. src/app/dashboard/sinif-takip-actions.ts):
--   * öğretmenin satırı (0176) rehbere_yonlendirildi = true olur,
--   * rehberlerin ortak kaydı (0171) kapatılmışsa yeniden "yeni"ye döner;
--     rehberin notu korunur. Yönlendirme rehber ekranında vurgulu görünür.
alter table public.takip_ogretmen_durumlari
  add column if not exists rehbere_yonlendirildi boolean not null default false,
  add column if not exists yonlendirme_at timestamptz;

comment on column public.takip_ogretmen_durumlari.rehbere_yonlendirildi is
  'Sınıf öğretmeni "Ele Alındı" adımında öğrenciyi rehberlik servisine yönlendirdi (0177).';
