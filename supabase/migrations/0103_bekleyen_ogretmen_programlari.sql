-- Bekleyen öğretmen ders programları (kullanıcı isteği 12.09.2026) —
-- okulun MEB ders programı PDF'i yüklendiğinde sistemde henüz hesabı olmayan
-- öğretmenlerin programı burada, okul + ad anahtarıyla bekler; öğretmen üye
-- olduğu anda (teachers satırı açılınca) kendi ogretmen_ders_programi
-- kayıtlarına kopyalanır ve bekleyen satırlar silinir.
--
-- Yük: tetikleyici yalnızca teachers INSERT'inde (yeni öğretmen hesabı) bir
-- kez çalışır; normal sayfa açılışlarına hiçbir ek sorgu getirmez.
--
-- Eşleşme: önce tam ad anahtarı (ad_esleme_anahtari — öğrenci listesiyle
-- aynı normalizasyon), bulunamazsa izinli_ogrenciler desenindeki gibi soyadı +
-- en az bir ad; gevşek eşleşmede birden fazla aday varsa hiçbir şey
-- uygulanmaz (yanlış kişiye program yazılmasın).
--
-- GÜVENLİK: RLS açık, politika yok, anon/authenticated'a hiçbir izin yok —
-- satırları yalnızca servis anahtarı ve SECURITY DEFINER tetikleyici görür.
create table if not exists public.bekleyen_ogretmen_programlari (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad_soyad text not null,
  ad_anahtari text generated always as (public.ad_esleme_anahtari(ad_soyad)) stored,
  gun text not null check (gun in ('pazartesi','sali','carsamba','persembe','cuma','cumartesi','pazar')),
  ders_saati_sira integer not null check (ders_saati_sira between 1 and 8),
  class_id uuid not null references public.classes(id) on delete cascade,
  ders text not null,
  created_at timestamptz not null default now(),
  unique (school_id, ad_anahtari, gun, ders_saati_sira)
);

create index if not exists bekleyen_ogretmen_programlari_okul_ad
  on public.bekleyen_ogretmen_programlari (school_id, ad_anahtari);

alter table public.bekleyen_ogretmen_programlari enable row level security;
revoke all on public.bekleyen_ogretmen_programlari from anon, authenticated;

create or replace function public.bekleyen_ogretmen_programini_uygula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anahtar text;
  v_adaylar text[];
begin
  select public.ad_esleme_anahtari(ad) into v_anahtar from public.profiles where id = new.id;
  if coalesce(v_anahtar, '') = '' then
    return new;
  end if;

  if exists (
    select 1 from public.bekleyen_ogretmen_programlari
    where school_id = new.school_id and ad_anahtari = v_anahtar
  ) then
    v_adaylar := array[v_anahtar];
  else
    select array_agg(distinct b.ad_anahtari) into v_adaylar
    from public.bekleyen_ogretmen_programlari b
    cross join lateral (select string_to_array(b.ad_anahtari, ' ') as p) bekleyen
    cross join lateral (select string_to_array(v_anahtar, ' ') as p) girilen
    where b.school_id = new.school_id
      and array_length(bekleyen.p, 1) >= 2
      and array_length(girilen.p, 1) >= 2
      and bekleyen.p[array_length(bekleyen.p, 1)] = girilen.p[array_length(girilen.p, 1)]
      and exists (
        select 1
        from unnest(bekleyen.p[1:array_length(bekleyen.p, 1)-1]) bekleyen_ad
        join unnest(girilen.p[1:array_length(girilen.p, 1)-1]) girilen_ad
          on bekleyen_ad = girilen_ad
      );
  end if;

  if coalesce(cardinality(v_adaylar), 0) <> 1 then
    return new;
  end if;

  insert into public.ogretmen_ders_programi (teacher_id, gun, ders_saati_sira, class_id, ders)
  select new.id, b.gun, b.ders_saati_sira, b.class_id, b.ders
  from public.bekleyen_ogretmen_programlari b
  where b.school_id = new.school_id and b.ad_anahtari = v_adaylar[1]
  on conflict (teacher_id, gun, ders_saati_sira) do nothing;

  delete from public.bekleyen_ogretmen_programlari
  where school_id = new.school_id and ad_anahtari = v_adaylar[1];

  return new;
exception when others then
  -- Program aktarımı hiçbir koşulda öğretmen üyeliğini düşürmesin.
  raise warning 'bekleyen_ogretmen_programini_uygula: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.bekleyen_ogretmen_programini_uygula() from public, anon, authenticated;

drop trigger if exists bekleyen_ogretmen_programi_uygula on public.teachers;
create trigger bekleyen_ogretmen_programi_uygula
  after insert on public.teachers
  for each row
  when (new.school_id is not null)
  execute function public.bekleyen_ogretmen_programini_uygula();
