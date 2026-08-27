-- Kullanıcı isteği (27.08.2026): "tarih seçmeli olmasın bazen aralık
-- bazen tek tarih girmek gerekiyor" — bitis_tarihi (gerçek `date` tipi,
-- tek takvim tarihi) yerine serbest metin bir "tarih" alanı: statik
-- takvim kayıtlarındaki tarihEtiketi gibi ("18 Eylül 2026 - 14 Haziran
-- 2027" veya "29 Ağustos 2026"). Bunun karşılığında admin ilanlarında
-- artık makine tarafından karşılaştırılabilir bir bitiş tarihi YOK —
-- "GEÇTİ" damgası bu ilanlar için hiç uygulanmıyor (bkz. tg-denemeleri.ts
-- tgDenemeAkisiOlustur, sonTarih hep uzak bir sentinel değere sabitlendi).
-- Arşivleme mantığı zaten created_at sırasına dayanıyor, bu değişiklikten
-- etkilenmiyor.
alter table public.tg_deneme_ilanlari add column tarih text;

-- Mevcut kayıtları (varsa) eski bitis_tarihi'nden (veya yoksa yayın
-- tarihinden) serbest metne çevir — sütunu silmeden önce.
update public.tg_deneme_ilanlari
set tarih = coalesce(
  to_char(bitis_tarihi, 'DD.MM.YYYY'),
  to_char(created_at, 'DD.MM.YYYY')
)
where tarih is null;

alter table public.tg_deneme_ilanlari alter column tarih set not null;
alter table public.tg_deneme_ilanlari add constraint tg_deneme_ilanlari_tarih_check check (char_length(tarih) between 1 and 100);
alter table public.tg_deneme_ilanlari drop column bitis_tarihi;
