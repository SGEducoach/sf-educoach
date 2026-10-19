-- Deneme bitişi artık platform geneli değil, kuruma özeldir.
-- Tarih boşsa kurum için deneme sınırı uygulanmaz.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schools'
      and column_name = 'deneme_bitis_tarihi'
  ) then
    alter table public.schools add column deneme_bitis_tarihi timestamptz;

    -- Önceden girilmiş ortak dershane tarihini kaybetmeden gerçek
    -- dershanelere taşı. Okul ve gruplara kendiliğinden tarih atanmaz.
    update public.schools
    set deneme_bitis_tarihi = (
      select dershane_deneme_bitis from public.platform_ayarlari where id = 1
    )
    where tur = 'dershane'
      and grup_kapasitesi is null
      and exists (
        select 1 from public.platform_ayarlari
        where id = 1 and dershane_deneme_bitis is not null
      );
  end if;
end $$;

comment on column public.schools.deneme_bitis_tarihi is
  'Kuruma özel deneme bitiş anı. Null ise deneme sınırı yoktur.';
