-- Rehberin öğrenci programına desteği (kullanıcı kararı 07.10.2026:
-- "b uygulansın ama öğrenci kısıtla sistemden uzaklaşmasın rehberlik
-- servisinin etkinliği de körelmesin").
--
-- TASARIM — iki şartı birden tutan denge:
--
-- 1) ÖĞRENCİ KISITLANMIYOR. Oto Program'ın ürettiği görevler, rehber
--    çalıştırsa bile `olusturan_ogrenci_id = öğrenci` olarak yazılır; yani
--    öğrencinin KENDİ görevidir: taşıyabilir, silebilir, haftayı
--    temizleyebilir. `gorev_atamalari.rehber_yerlestirdi` BİLİNÇLİ OLARAK
--    set edilmez — o bayrak dershane koçluğu için var ve öğrencinin kalemi
--    oynatmasını engelliyor (bkz. gorev-actions.ts). Okulda rehber-öğrenci
--    ilişkisi koç-öğrenci ilişkisi değil; orada kilit koçluk değil dayatma
--    olurdu ve öğrenciyi sistemden uzaklaştırırdı.
--
-- 2) REHBERLİĞİN ETKİNLİĞİ KÖRELMİYOR — kısıtlama yerine GERİ BİLDİRİM.
--    Rehber hazırladığı programın akıbetini görür: kaç blok ayakta, kaçı
--    tamamlandı, kaçı silindi. Rehberin gücü hücreyi kilitlemekten değil
--    sonucu bilmekten gelir. `blok_sayisi` bu yüzden saklanıyor: silinen
--    görev satırı tamamen yok olduğu için "kaçı kaldı"yı ancak başlangıç
--    sayısıyla kıyaslayarak bilebiliriz.

alter table public.ogrenci_oto_programlari
  -- null = öğrenci kendi hazırladı (bugüne kadarki tüm kayıtlar böyle).
  add column if not exists hazirlayan_rehber_id uuid references public.profiles(id) on delete set null,
  -- Program uygulandığı anda yazılan blok sayısı. Sonradan silinenleri
  -- ölçmek için gereken referans.
  add column if not exists blok_sayisi integer not null default 0;

create index if not exists ogrenci_oto_programlari_rehber_idx
  on public.ogrenci_oto_programlari (hazirlayan_rehber_id)
  where hazirlayan_rehber_id is not null;

comment on column public.ogrenci_oto_programlari.hazirlayan_rehber_id is
  'Programi ogrenci adina hazirlayan Rehberlik Servisi uyesi; null = ogrenci kendi hazirladi.';
comment on column public.ogrenci_oto_programlari.blok_sayisi is
  'Uygulandigi anda yazilan blok sayisi — rehber geri bildiriminde "kaci silindi" bunun uzerinden olculur.';

-- Rehber, kapsamındaki öğrencinin program kayıtlarını OKUYABİLMELİ (geri
-- bildirim ekranı için). Bugün yalnız `student_id = auth.uid()` izni var.
--
-- Kapsam sınırını AYRICA yazmaya gerek yok: 0143'ün RESTRICTIVE
-- `rehber_duzey_siniri` politikası bu tabloyu da kapsıyor
-- (rehber_ogrenciyi_gorebilir), ve RESTRICTIVE politika yalnızca daraltır.
-- Yani aşağıdaki izin, servis üyesi için kapsamıyla KESİŞİR.
drop policy if exists "ogrenci_oto_programlari_select_rehber" on public.ogrenci_oto_programlari;
create policy "ogrenci_oto_programlari_select_rehber" on public.ogrenci_oto_programlari
  for select to authenticated
  using (public.okul_rehberi_mi() or public.is_admin());
