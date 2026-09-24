-- Kullanıcı kararı (24.09.2026): program/ödev karşılığı geriye dönük giriş
-- penceresi 7 gün yerine 5 gün ("öğrencinin programının günü geçer, en fazla
-- 5 gün"). Serbest giriş sınırları değişmedi (konu/soru 3, deneme 7 — deneme
-- kendi tabanı daha geniş olduğu için 5'e düşmez).
-- Kalanı migration 0121 ile aynı; yalnızca sayı değişti.

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
    v_sinir_gun := greatest(v_sinir_gun, 5);
  end if;

  if new.tarih < current_date - v_sinir_gun then
    raise exception 'En fazla % gün geriye dönük giriş yapılabilir.', v_sinir_gun;
  end if;
  return new;
end;
$$;
