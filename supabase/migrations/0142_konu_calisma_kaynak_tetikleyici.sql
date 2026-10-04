-- Tarih sınırı tetikleyicisi üç tabloda kullanılır. `kaynak` yalnız denemeler
-- tablosunda vardır; PL/pgSQL AND ifadesi eksik alan erişimini garantiyle
-- kısa devre etmez. JSON alan okuması diğer tablolarda NULL döndürür.
create or replace function public.gecmis_tarih_sinir_kontrol()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sinir_gun integer := TG_ARGV[0]::integer;
begin
  if public.hesap_senkron_aktif() then
    return new;
  end if;

  if TG_TABLE_NAME = 'denemeler'
     and to_jsonb(new) ->> 'kaynak' = 'ogretmen'
     and auth.role() = 'service_role'
     and coalesce(current_setting('sefu.pdf_eslesme', true), '') = 'on' then
    return new;
  end if;

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
