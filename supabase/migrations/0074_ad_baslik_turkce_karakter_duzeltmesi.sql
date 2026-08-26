-- 2026-08-26 kullanıcı bulgusu — "Hüseyin Yıldız" (gerçek okul müdürü)
-- hesabı sisteme "Hüseyi̇n Yildiz" olarak kaydolmuş: "Yıldız" -> "Yildiz"
-- (Türkçe noktasız ı, noktalı i'ye dönüşmüş) ve "Hüseyin" -> "Hüseyi̇n"
-- (i harfinin üzerine fazladan birleştirilmiş bir nokta — U+0307 —
-- eklenmiş, görünüşte neredeyse fark edilmiyor ama gerçek bir bozulma).
--
-- KÖK NEDEN: public.ad_baslik() — self-signup akışında (handle_new_user
-- trigger'ı) kullanıcının girdiği adı Başlık Harfine çeviren fonksiyon —
-- Postgres'in LOCALE'E BAĞLI upper()/lower() fonksiyonlarını kullanıyordu.
-- Bu veritabanının locale'i Türkçe olmadığı için "I" (noktasız büyük I)
-- lower() ile 'i' (noktalı küçük i) oluyor — Türkçe'de 'ı' (noktasız
-- küçük) olması gerekirken. src/lib/validators.ts'teki adNormalize()
-- (admin'in MANUEL ekleme akışında kullanılan TS karşılığı) bu sorunu
-- zaten translate/locale-bağımsız bir yöntemle çözmüştü — bu migration
-- AYNI mantığı SQL tarafına da taşıyor, iki akış artık tutarlı.
--
-- ÇÖZÜM: locale'e güvenmek yerine açık karakter eşlemesi (translate) —
-- İ(0130)/I(0049) <-> i/ı çiftleri elle yönetiliyor, ardından olası
-- artık "i/ı + birleştirilmiş nokta" (U+0307) temizleniyor.

create or replace function public.ad_baslik(p_ad text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_kelime text;
  v_sonuc text := '';
  v_temiz text;
  v_ilk text;
begin
  foreach v_kelime in array regexp_split_to_array(trim(regexp_replace(coalesce(p_ad, ''), '\s+', ' ', 'g')), ' ')
  loop
    if v_kelime = '' then
      continue;
    end if;

    -- Türkçe-güvenli küçük harf: önce İ->i, I->ı elle eşlenir (Postgres'in
    -- locale'e bağlı lower()'ına bırakılırsa I -> i olur, yanlış).
    v_temiz := lower(translate(v_kelime, 'İI', 'iı'));
    -- Olası "i/ı + U+0307 birleştirici nokta" artığını temizle.
    v_temiz := replace(replace(v_temiz, 'i' || chr(775), 'i'), 'ı' || chr(775), 'ı');

    -- İlk harfi Türkçe-güvenli büyük harfe çevir: i->İ, ı->I elle eşlenir.
    v_ilk := left(v_temiz, 1);
    if v_ilk = 'i' then v_ilk := 'İ';
    elsif v_ilk = 'ı' then v_ilk := 'I';
    else v_ilk := upper(v_ilk);
    end if;

    v_sonuc := v_sonuc || case when v_sonuc = '' then '' else ' ' end || v_ilk || substr(v_temiz, 2);
  end loop;
  return v_sonuc;
end;
$$;

-- Mevcut kayıtları düzelt — daha önce migration 0034'te de aynı yöntemle
-- (fonksiyon değiştikten sonra tüm profiles.ad'a yeniden uygulama)
-- yapılmıştı. Sadece GERÇEKTEN değişecek satırlar güncellenir.
update public.profiles
set ad = public.ad_baslik(ad)
where ad is not null and public.ad_baslik(ad) <> ad;
