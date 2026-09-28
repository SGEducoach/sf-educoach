-- Hız/doğruluk analizi revizyonu (kullanıcı onayı 28.09.2026).
--
-- 1) Ders bazlı hız referansı: analizdeki hız eşiği öğrencinin KENDİ genel
--    ortalamasıydı ve daireseldi — her derste yavaş olan öğrenci hiçbir
--    derste yavaş görünmüyordu. Eşik artık popülasyon medyanı; bu tablo o
--    medyanı gecelik olarak tutar (bkz. src/lib/sinav-tempo.ts, yeterli veri
--    yoksa sınav bütçesine düşülür).
--
-- 2) AYT deneme süresi: 0028'deki üst sınır tüm türler için 165 dakikaydı,
--    oysa AYT 180 dakika. AYT denemesine gerçek süresini yazan öğrencinin
--    kaydı reddediliyordu.

-- ---------- 1) Ders hız referansları ----------

create table if not exists public.ders_hiz_referanslari (
  ders text primary key,
  medyan_dk_soru numeric(6,3) not null,
  medyan_dogruluk numeric(4,3) not null,
  ogrenci_sayisi integer not null,
  soru_sayisi integer not null,
  guncellendi_at timestamptz not null default now()
);

alter table public.ders_hiz_referanslari enable row level security;

-- Referanslar kişisel veri değil, herkese açık okunur; yazma yalnızca
-- servis anahtarıyla (aşağıdaki fonksiyon) yapılır.
drop policy if exists ders_hiz_referanslari_okuma on public.ders_hiz_referanslari;
create policy ders_hiz_referanslari_okuma on public.ders_hiz_referanslari
  for select to authenticated using (true);

revoke insert, update, delete on public.ders_hiz_referanslari from anon, authenticated;

-- Ölçüm bandı: öz beyan süre olduğu için 0,4 dk/soru altı ve 5 dk/soru üstü
-- kayıtlar referans hesabına girmez (src/lib/sinav-tempo.ts ile aynı sınır).
-- Eşik için ders başına en az 5 öğrenci ve 300 soru aranır; altında kalan
-- ders tabloya yazılmaz, uygulama bütçeye düşer.
create or replace function public.ders_hiz_referanslarini_guncelle()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_satir integer;
begin
  with olculebilir as (
    select student_id, ders,
           sure_dakika::numeric / nullif(dogru + yanlis + bos, 0) as dk_soru,
           dogru::numeric / nullif(dogru + yanlis, 0) as dogruluk,
           (dogru + yanlis + bos) as soru
    from public.soru_cozumleri
    where dogru + yanlis + bos > 0
      and sure_dakika::numeric / nullif(dogru + yanlis + bos, 0) between 0.4 and 5
  ), ozet as (
    select ders,
           percentile_cont(0.5) within group (order by dk_soru) as medyan_dk_soru,
           percentile_cont(0.5) within group (order by dogruluk) filter (where dogruluk is not null) as medyan_dogruluk,
           count(distinct student_id) as ogrenci_sayisi,
           sum(soru)::integer as soru_sayisi
    from olculebilir
    group by ders
    having count(distinct student_id) >= 5 and sum(soru) >= 300
  )
  insert into public.ders_hiz_referanslari (ders, medyan_dk_soru, medyan_dogruluk, ogrenci_sayisi, soru_sayisi, guncellendi_at)
  select ders, round(medyan_dk_soru::numeric, 3), round(coalesce(medyan_dogruluk, 0)::numeric, 3), ogrenci_sayisi, soru_sayisi, now()
  from ozet
  on conflict (ders) do update set
    medyan_dk_soru = excluded.medyan_dk_soru,
    medyan_dogruluk = excluded.medyan_dogruluk,
    ogrenci_sayisi = excluded.ogrenci_sayisi,
    soru_sayisi = excluded.soru_sayisi,
    guncellendi_at = excluded.guncellendi_at;

  get diagnostics v_satir = row_count;
  return v_satir;
end
$$;

revoke all on function public.ders_hiz_referanslarini_guncelle() from public, anon, authenticated;
grant execute on function public.ders_hiz_referanslarini_guncelle() to service_role;

-- ---------- 2) AYT deneme süresi 180 dakika ----------

alter table public.denemeler
  drop constraint if exists denemeler_sure_ust_sinir;
alter table public.denemeler
  add constraint denemeler_sure_ust_sinir
  check (sure_dakika <= case when tur = 'AYT' then 180 else 165 end) not valid;
