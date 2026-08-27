-- Kullanıcı bulgusu (27.08.2026): "metin formatı da diğerleriyle eşit
-- olsun tarih, başlık, alt metin (yazdıklarım karışık olmuş)" — tek bir
-- "içerik" alanı, statik takvim kayıtlarının başlık+açıklama ayrımıyla
-- tutarsız görünüyordu. İkiye bölündü: başlık (zorunlu, kısa) + açıklama
-- (opsiyonel alt metin — bazı ilanların alt metni olmayabilir).
alter table public.tg_deneme_ilanlari rename column icerik to aciklama;

-- Eski "icerik" kısıtı (1-500 karakter, ZORUNLU) artık aciklama'yı
-- bağlıyor ama açıklama artık OPSİYONEL — önce kaldırılıp gevşetiliyor
-- (isim, RENAME COLUMN sırasında değişmiyor: tg_deneme_ilanlari_icerik_check).
alter table public.tg_deneme_ilanlari drop constraint tg_deneme_ilanlari_icerik_check;
alter table public.tg_deneme_ilanlari add constraint tg_deneme_ilanlari_aciklama_check check (char_length(aciklama) <= 500);

alter table public.tg_deneme_ilanlari add column baslik text not null default '';

-- Tek test kaydını (varsa) geriye dönük parçala: ilk satır başlık, gerisi
-- açıklama — yeni kayıtlar zaten iki ayrı alandan gelecek.
update public.tg_deneme_ilanlari
set
  baslik = split_part(aciklama, chr(10), 1),
  aciklama = case
    when position(chr(10) in aciklama) > 0 then trim(substring(aciklama from position(chr(10) in aciklama) + 1))
    else ''
  end
where baslik = '';

alter table public.tg_deneme_ilanlari alter column baslik drop default;
alter table public.tg_deneme_ilanlari add constraint tg_deneme_ilanlari_baslik_check check (char_length(baslik) between 1 and 150);
