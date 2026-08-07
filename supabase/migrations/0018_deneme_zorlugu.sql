-- "Deneme seviyesi" (Kolay/Orta/Zor) — hedefe_yakinlik'ten bağımsız, yeni bir
-- alan. hedefe_yakinlik artık "Deneme net hedefim" (Uzak/Ortalama/Ulaştım)
-- olarak yeniden etiketlendi ama aynı sütun/enum kullanılıyor, DB değişikliği
-- gerekmedi. Nullable — eski kayıtlarda bu bilgi yok, formda yeni girişler
-- için zorunlu tutulacak.
create type public.deneme_zorlugu as enum ('kolay', 'orta', 'zor');

alter table public.denemeler add column if not exists zorluk public.deneme_zorlugu;
