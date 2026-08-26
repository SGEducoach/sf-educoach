-- Kullanıcı isteği (26.08.2026, Faz "Bildirimler yeniden tasarımı"):
-- Bildirimler bölümü artık sadece tarayıcı bildirim izni değil, gerçek
-- bildirim TÜRLERİ de içerecek: öğretmenden gelen mesaj, müdürden gelen
-- mesaj, yaklaşan görev/plan, ve (ayrı madde) öğrenci hariç tüm rollerde
-- yanlış giriş denemesi uyarısı. Her tür ayrı ayrı kapatılabilsin diye
-- profiles'a dört ayrı tercih sütunu ekleniyor (varsayılan hepsi açık —
-- "opt-out" modeli, mevcut davranışı bozmuyor).
--
-- Not (dürüstlük payı): "yaklaşan deneme/sınav tarihleri" bu migration'a
-- KASITLI OLARAK dahil edilmedi — platformda öğrenciye özel, ileri
-- tarihli bir "deneme/sınav takvimi" veri modeli hiç yok (TG Denemeleri
-- sadece yayınevi afişlerinden oluşan genel bir panodur, öğrenciye özel
-- planlanmış tarih içermez; denemeler tablosu SONUÇLARI tutar, gelecek
-- tarihli planlanmış bir sınavı değil). Bu iki bildirim türü, önce bir
-- "sınav/deneme takvimi" özelliği kurulmadan gerçek anlamda uygulanamaz.
alter table public.profiles
  add column bildirim_ogretmen_mesaji boolean not null default true,
  add column bildirim_mudur_mesaji boolean not null default true,
  add column bildirim_yaklasan_gorev boolean not null default true,
  add column bildirim_yanlis_giris boolean not null default true;
