-- Kullanıcı isteği (27.08.2026): "Görevlerim" (öğretmenin verdiği görevler,
-- düz günlük liste) ile "Program Yap" (öğrencinin kendi haftalık zaman
-- çizelgesi) artık ayrı kavramlar. Öğrenci, Görevlerim'e düşen bir göreve
-- tıklayınca "Programa ekle" diyebiliyor:
--   - Öğretmen zaten bir saat aralığı girdiyse doğrudan o saatle Program'a
--     yerleşir (çakışma yoksa).
--   - Girmediyse öğrenci kendi saatini (gerekirse günü de) seçer.
--   - Çakışma varsa öğrenci uyarılır, farklı saat/gün girip tekrar dener.
-- Bir görev BİRDEN FAZLA öğrenciye toplu verilebildiği (gorevler tablosu
-- paylaşılıyor) için saat/gün seçimi gorev_atamalari'na (öğrenci başına)
-- ayrı ayrı yazılıyor — bir öğrencinin programa ekleme/yeniden zamanlama
-- işlemi diğer öğrencileri ETKİLEMİYOR.
--
-- programa_eklendi_mi=true olan HER satırın (hem öğretmen görevi hem
-- öğrencinin kendi eklediği plan) artık ogrenci_tarih/ogrenci_baslangic_saat/
-- ogrenci_bitis_saat sütunları kendi kendine yeterli (gorevler tablosuna
-- bakmaya gerek kalmadan) — bu yüzden mevcut (kaynak='plan') kayıtlar da
-- aşağıda geriye dönük olarak dolduruluyor, kod tarafında kaynak'a göre
-- özel durum yazmaya gerek kalmasın diye.
alter table public.gorev_atamalari
  add column if not exists programa_eklendi_mi boolean not null default false,
  add column if not exists ogrenci_tarih date,
  add column if not exists ogrenci_baslangic_saat time,
  add column if not exists ogrenci_bitis_saat time;

-- Öğrencinin kendi eklediği planlar (planEkle) zaten oluşturulduğu anda tam
-- zamanlı — geriye dönük olarak "programa eklenmiş" sayılıyor.
update public.gorev_atamalari ga
set programa_eklendi_mi = true,
    ogrenci_tarih = g.tarih,
    ogrenci_baslangic_saat = g.baslangic_saat,
    ogrenci_bitis_saat = g.bitis_saat
from public.gorevler g
where g.id = ga.gorev_id
  and g.olusturan_ogrenci_id is not null;

-- RLS: mevcut "gorev_atamalari_update_own" politikası (migration 0047,
-- `using (student_id = auth.uid()) with check (student_id = auth.uid())`)
-- zaten tüm sütunlara izin veriyor, yeni politika gerekmiyor.
