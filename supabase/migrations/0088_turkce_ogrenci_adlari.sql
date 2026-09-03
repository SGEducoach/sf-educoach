-- Türkçe ad dönüşümünü veritabanının locale ayarından bağımsız yapar.
-- 0034'teki upper/lower, İ/ı harflerini kayıt sırasında bozabiliyordu.
create or replace function public.ad_baslik(p_ad text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_ad text;
  v_harf text;
  v_sonuc text := '';
  v_baslangic boolean := true;
  v_i integer;
begin
  v_ad := normalize(coalesce(p_ad, ''), NFC);
  v_ad := translate(v_ad, 'ABCDEFGHIJKLMNOPQRSTUVWXYZÇĞİÖŞÜ', 'abcdefghıjklmnopqrstuvwxyzçğiöşü');
  v_ad := normalize(regexp_replace(v_ad, U&'([iı])\0307', '\1', 'g'), NFC);
  v_ad := trim(regexp_replace(v_ad, '\s+', ' ', 'g'));
  for v_i in 1..char_length(v_ad) loop
    v_harf := substr(v_ad, v_i, 1);
    if v_baslangic then
      v_harf := translate(v_harf, 'abcdefghijklmnopqrstuvwxyzçğıöşü', 'ABCDEFGHİJKLMNOPQRSTUVWXYZÇĞIÖŞÜ');
    end if;
    v_sonuc := v_sonuc || v_harf;
    v_baslangic := v_harf in (' ', '-', '''');
  end loop;
  return v_sonuc;
end;
$$;

-- Eşleştirmede İ, I, i ve ı aynı anahtara dönüşür; görünen ad korunur.
create or replace function public.ad_esleme_anahtari(p_ad text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(regexp_replace(
    replace(translate(normalize(coalesce(p_ad, ''), NFC),
      'ABCDEFGHIJKLMNOPQRSTUVWXYZÇĞİÖŞÜı',
      'abcdefghijklmnopqrstuvwxyzçğiöşüi'), U&'\0307', ''),
    '\s+', ' ', 'g'));
$$;

-- Değişiklik eski kayıtları etkilemeden önce örnekleri doğrula.
do $$
begin
  if public.ad_baslik('İSMAİL IŞIK') <> 'İsmail Işık'
    or public.ad_baslik('  ipek   ırmak  ') <> 'İpek Irmak'
    or public.ad_baslik(U&'I\0307SMAI\0307L') <> 'İsmail'
    or public.ad_baslik(U&'i\0307pek') <> 'İpek'
    or public.ad_baslik('ALİ-VELİ') <> 'Ali-Veli'
    or public.ad_baslik('O''NEİL') <> 'O''Neil'
    or public.ad_baslik('') <> ''
    or public.ad_baslik(null) <> ''
    or public.ad_esleme_anahtari('İSMAİL IŞIK') <> public.ad_esleme_anahtari('Ismail Işık')
  then
    raise exception 'Türkçe ad dönüşümü kontrolü başarısız.';
  end if;
end;
$$;

-- Aynı tam adın özgün kayıt bilgisi varsa kaybolan İ/ı ayrımını geri al.
-- Adı eksik/farklı metadata ile resmi tam adı değiştirme. Eşleşmeyen
-- adlarda yalnızca biçimi düzelt; kaybolmuş harflerin doğrusunu tahmin etme.
with duzeltmeler as (
  select p.id, public.ad_baslik(case
    when nullif(trim(u.raw_user_meta_data->>'ad'), '') is not null
      and public.ad_esleme_anahtari(u.raw_user_meta_data->>'ad') = public.ad_esleme_anahtari(p.ad)
    then u.raw_user_meta_data->>'ad'
    else p.ad
  end) as ad
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'ogrenci'
)
update public.profiles p set ad = d.ad
from duzeltmeler d
where p.id = d.id and p.ad is distinct from d.ad;

-- İzinli listede aynı ada dönüşen satırları SİLME; benzersizlik
-- çakışması olmayan satırları düzelt, çakışanları yöneticiye bırak.
with adaylar as (
  select id, school_id, public.ad_baslik(ad_soyad) as ad,
    count(*) over (partition by school_id, public.ad_baslik(ad_soyad)) as adet
  from public.izinli_ogrenciler
)
update public.izinli_ogrenciler io set ad_soyad = a.ad
from adaylar a
where io.id = a.id and a.adet = 1 and io.ad_soyad is distinct from a.ad;

-- İzinli listedeki adın doğrudan kullanıldığı kayıt yolu dahil tüm
-- profil yazımlarında aynı Türkçe dönüşümü uygula.
create or replace function public.profil_adini_normalize_et()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.ad := public.ad_baslik(new.ad);
  return new;
end;
$$;

drop trigger if exists profil_adini_normalize_et on public.profiles;
create trigger profil_adini_normalize_et
  before insert or update of ad on public.profiles
  for each row execute function public.profil_adini_normalize_et();
