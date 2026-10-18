-- Özel okul işareti (kullanıcı kararı 18.10.2026): "Ücret Ödeme
-- Hatırlatması" ve "Kayıt Dönemi" WhatsApp duyuru kartları dershane ile
-- özel okula özgü; devlet okulunda gizlenir. Admin kurum ekle/düzenle
-- formunda "Devlet Okulu / Özel Okul" seçer. Dershanede anlamı yok.

alter table public.schools add column if not exists ozel boolean not null default false;

comment on column public.schools.ozel is
  'Özel okul mu: ücret ve kayıt duyuru kartları açılır (dershanede her zaman açık).';
