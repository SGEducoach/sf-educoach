-- Kullanıcı isteği (23.09.2026, öğrenci geri bildirimi): "öğrencim programa
-- işlediği işi yaptıktan sonra gün geçtiği için sisteme işleyemedim dedi".
-- Serbest veri girişi sınırı (konu/soru 3 gün, deneme 7 gün) aynen kalıyor —
-- veri şişirmeye karşı asıl önlem o. Ama bir GÖREVİN karşılığı olan giriş
-- (gorev_atama_id dolu) 7 güne kadar geriye işlenebilir: görev zaten
-- öğretmen tarafından ya da öğrencinin kendi programında belirli bir güne
-- bağlanmış, uydurma bir gün değil.
--
-- Görev kimliği öğrencinin kendi ataması olmalı (başkasının atama id'si ile
-- sınır genişletilemesin diye) — bu yüzden fonksiyon artık SECURITY DEFINER.

create or replace function public.gecmis_tarih_sinir_kontrol()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sinir_gun integer := TG_ARGV[0]::integer;
begin
  if new.giren_rehber_id is not null then
    if auth.uid() is not null then
      raise exception 'Rehber girişi yalnızca rehberlik servisi ekranından yapılabilir.';
    end if;
    v_sinir_gun := 30;
  elsif new.gorev_atama_id is not null and exists (
    select 1 from public.gorev_atamalari a
    where a.id = new.gorev_atama_id and a.student_id = new.student_id
  ) then
    v_sinir_gun := greatest(v_sinir_gun, 7);
  end if;

  if new.tarih < current_date - v_sinir_gun then
    raise exception 'En fazla % gün geriye dönük giriş yapılabilir.', v_sinir_gun;
  end if;
  return new;
end;
$$;
