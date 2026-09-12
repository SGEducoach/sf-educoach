-- Ders programı / yurt nöbeti bildirimleri (kullanıcı isteği 12.09.2026):
-- öğretmene "Ders programınız yüklenmiştir", "Ders programınız değişti" ve
-- "Bu ayın nöbet görevleri yüklendi" bildirimi hem panel bildirimi hem
-- anlık bildirim hem e-posta olarak gider (bkz. src/lib/ogretmen-bildirim.ts).
--
-- dis_gonderim_bekliyor: veritabanı tetikleyicisi e-posta/anlık bildirim
-- gönderemez; üyelikte bekleyen program aktarılınca bildirim bu işaretle
-- yazılır, öğretmen panele girdiğinde sunucu (after()) anlık bildirim ve
-- e-postayı gönderip işareti kaldırır. Kısmi indeks yalnızca bekleyen
-- satırları tutar, panel açılışındaki sorgu boş indekse bakar.
alter table public.bildirimler drop constraint if exists bildirimler_tur_check;
alter table public.bildirimler add constraint bildirimler_tur_check
  check (tur in ('yanlis_giris', 'sistem', 'ders_programi', 'yurt_nobeti'));

alter table public.bildirimler
  add column if not exists dis_gonderim_bekliyor boolean not null default false;

create index if not exists bildirimler_dis_gonderim_bekliyor_idx
  on public.bildirimler (profile_id) where dis_gonderim_bekliyor;

-- 0103'teki tetikleyici fonksiyonu: program gerçekten aktarıldıysa bildirim
-- de yazılır. Geri kalanı 0103 ile aynı.
create or replace function public.bekleyen_ogretmen_programini_uygula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anahtar text;
  v_adaylar text[];
  v_aktarilan integer;
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
  get diagnostics v_aktarilan = row_count;

  delete from public.bekleyen_ogretmen_programlari
  where school_id = new.school_id and ad_anahtari = v_adaylar[1];

  -- Metin src/lib/ogretmen-bildirim-sablon.ts PROGRAM_BILDIRIMI.yuklendi ile aynı.
  if v_aktarilan > 0 then
    insert into public.bildirimler (profile_id, tur, baslik, mesaj, dis_gonderim_bekliyor)
    values (
      new.id, 'ders_programi', 'Ders programınız yüklenmiştir',
      'Ders programınız SeFu Koç''a yüklendi. Programınızı panelinizden görebilirsiniz.',
      true
    );
  end if;

  return new;
exception when others then
  raise warning 'bekleyen_ogretmen_programini_uygula: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.bekleyen_ogretmen_programini_uygula() from public, anon, authenticated;
