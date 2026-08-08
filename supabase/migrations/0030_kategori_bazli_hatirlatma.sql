-- Rozet sistemi v2 ile birlikte hatırlatma sistemi de kategori bazlı oldu:
-- tek bir "3 gündür veri girmiyor" kuralı yerine, her kategorinin kendi eşiği
-- var (konu/soru 3 gün, deneme 7 gün — bkz. KATEGORI_GERIYE_DONUK_SINIR).
-- Eski tek deadline kolonunu bırakıyoruz (zararsız, artık kullanılmıyor),
-- her kategori için ayrı bir "bir sonraki hatırlatma ne zaman gönderilebilir"
-- kolonu ekliyoruz (art arda her gün spam göndermemek için).
alter table public.students
  add column if not exists son_hatirlatma_konu_deadline timestamptz,
  add column if not exists son_hatirlatma_soru_deadline timestamptz,
  add column if not exists son_hatirlatma_deneme_deadline timestamptz;
