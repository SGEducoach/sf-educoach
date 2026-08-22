-- Faz 2 hotfix: "Gördüm" onayı (soru_cozumleri UPDATE) 3 günden eski
-- kayıtlarda soru_cozumleri_gecmis_sinir CHECK constraint'ine takılıyordu
-- — Postgres, UPDATE'te değişmeyen kolonlar dahil TÜM satırı yeniden
-- doğruluyor, bu yüzden geçmişteki bir kaydı onaylamak bile "tarih çok eski"
-- hatası veriyordu (bkz. migration 0044'ün de düzelttiği aynı kök neden).
--
-- Çözüm: bu 3 "geriye dönük giriş sınırı" kuralını CHECK constraint yerine
-- SADECE INSERT'te çalışan bir trigger'a taşıyoruz — UPDATE'lerde hiç
-- tetiklenmiyor. Sınırların kendisi değişmiyor (konu/soru 3 gün, deneme 7
-- gün — bkz. KATEGORI_GERIYE_DONUK_SINIR, src/lib/types.ts). Uygulama zaten
-- bu sınırı client+server tarafında ayrıca doğruluyor (tarihDogrula); bu
-- trigger sadece DB seviyesinde bir savunma katmanı.

create or replace function public.gecmis_tarih_sinir_kontrol()
returns trigger
language plpgsql
as $$
declare
  v_sinir_gun integer := TG_ARGV[0]::integer;
begin
  if new.tarih < current_date - v_sinir_gun then
    raise exception 'En fazla % gün geriye dönük giriş yapılabilir.', v_sinir_gun;
  end if;
  return new;
end;
$$;

alter table public.konu_calismalar drop constraint if exists konu_calismalar_gecmis_sinir;
drop trigger if exists konu_calismalar_gecmis_sinir_trg on public.konu_calismalar;
create trigger konu_calismalar_gecmis_sinir_trg
  before insert on public.konu_calismalar
  for each row execute function public.gecmis_tarih_sinir_kontrol(3);

alter table public.soru_cozumleri drop constraint if exists soru_cozumleri_gecmis_sinir;
drop trigger if exists soru_cozumleri_gecmis_sinir_trg on public.soru_cozumleri;
create trigger soru_cozumleri_gecmis_sinir_trg
  before insert on public.soru_cozumleri
  for each row execute function public.gecmis_tarih_sinir_kontrol(3);

alter table public.denemeler drop constraint if exists denemeler_gecmis_sinir;
drop trigger if exists denemeler_gecmis_sinir_trg on public.denemeler;
create trigger denemeler_gecmis_sinir_trg
  before insert on public.denemeler
  for each row execute function public.gecmis_tarih_sinir_kontrol(7);
