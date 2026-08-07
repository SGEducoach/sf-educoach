-- Konu anlatımına sınıf/seviye etiketi ekleniyor (öğrenci konuya bakarken
-- "9. Sınıf" / "TYT" gibi bir etiket görsün diye). Öğrencinin kendi girdiği
-- serbest metin konularda bu alan boş (null) kalabilir — sadece toplu
-- ön yükleme ile eklenen resmi müfredat konularında dolu olur.
alter table public.konu_anlatimlari add column if not exists seviye text;
