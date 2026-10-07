-- Ortaokul panelini lise izlerinden arındırma, O2 — 2/2 (08.10.2026).
--
-- TESPİT: ortaokulun TEK öğrencisi (Elif Ada Güler, 5-A) `ayt_alan = 'SAY'`
-- taşıyordu. Kök neden şema: `students.ayt_alan` NOT NULL olduğu için
-- uygulama ortaokulda da bir değer göndermek ZORUNDAYDI —
-- AdminPanel.tsx'teki yorum bunu açıkça söylüyor: "(ayt_alan NOT NULL)
-- varsayılan 'SAY' sessizce gönderiliyor". Yani kısıt, lise varsayımını
-- yukarıya, uygulamaya dayatmıştı.
--
-- ZAMANLAMA: ortaokulda şu an 1 öğrenci ve SIFIR veri var (0 deneme,
-- 0 konu çalışması, 0 soru çözümü). Bu düzeltmenin maliyeti bugün
-- neredeyse sıfır; veri biriktikçe taşıma işine dönüşür.

-- 1) ayt_alan ortaokulda NULL olabilsin.
alter table public.students alter column ayt_alan drop not null;

-- 2) Mevcut ortaokul öğrencilerinin YKS alanını temizle.
--
-- `students_transfer_guard` (ayt_alan dahil kimlik alanlarının elle
-- değiştirilmesini engelliyor) yalnız is_admin() veya service_role'a izin
-- veriyor; migration postgres olarak çalıştığı için bu UPDATE'i reddetti.
-- Tetikleyici işlem BOYUNCA devre dışı bırakılıp hemen geri açılıyor —
-- transaction içinde olduğu için arada başka bir yazma bu boşluğa giremez.
alter table public.students disable trigger students_transfer_guard;

update public.students s
set ayt_alan = null
from public.classes c
where c.id = s.class_id and c.seviye in ('5', '6', '7', '8') and s.ayt_alan is not null;

alter table public.students enable trigger students_transfer_guard;

-- 3) Bir daha dolmasın. CHECK DEĞİL TRIGGER kullanılıyor: proje dersi
-- (bkz. migration 0046 ve proje notu) — CHECK constraint UPDATE'te de
-- yeniden doğrulanır ve ilgisiz bir kolonu güncelleyince sürpriz 23514
-- verir. Ayrıca kural başka tabloya (classes.seviye) baktığı için CHECK
-- ile ifade edilemez.
--
-- `update of` ile sınırlı: yalnız class_id veya ayt_alan değişince çalışır,
-- her satır güncellemesinde boşuna tetiklenmez.
create or replace function public.ortaokul_ayt_alanini_temizle()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.class_id is not null and new.ayt_alan is not null and exists (
    select 1 from public.classes c
    where c.id = new.class_id and c.seviye in ('5', '6', '7', '8')
  ) then
    -- Hata fırlatmak yerine SESSİZCE temizliyoruz: ortaokul kaydını
    -- reddetmek öğrenci eklemeyi kırardı, oysa niyet "bu alan ortaokulda
    -- anlamsız"dır. Uygulama tarafı da artık göndermiyor.
    new.ayt_alan := null;
  end if;
  return new;
end;
$$;

drop trigger if exists ortaokul_ayt_alanini_temizle on public.students;
create trigger ortaokul_ayt_alanini_temizle
  before insert or update of class_id, ayt_alan on public.students
  for each row execute function public.ortaokul_ayt_alanini_temizle();

-- 4) Kalan iki iz, yeniden adlandırma yerine BELGELENİYOR.
--
-- `hedef_bolum`: ekranda ortaokulda "Hedef meslek" yazıyor (bkz.
-- kademe.ts hedefEtiketi) ama kolon lise adını taşıyor. Yeniden
-- adlandırmak 20+ dosyaya dokunurdu ve kazancı yalnız isim estetiği;
-- O2'nin "ucuz ve geri alınabilir" kapsamını aşar. Kolon çift anlamlı
-- olarak işaretleniyor.
comment on column public.students.hedef_bolum is
  'Ogrencinin hedefi. LISEDE hedef BOLUM, ORTAOKULDA hedef MESLEK (bkz. kademe.ts hedefEtiketi). Kolon adi tarihsel, yeniden adlandirilmadi.';

comment on column public.students.ayt_alan is
  'YKS alan secimi (SAY/EA/SOZ). ORTAOKULDA NULL olmali — ortaokul_ayt_alanini_temizle tetikleyicisi zorlar (0148).';

comment on type public.deneme_turu is
  'TYT/AYT/BRANS lise, LGS ortaokul (0147). DIKKAT: net formulu kademeye gore DEGISIR — lise D-Y/4, ortaokul D-Y/3 (kullanici karari 08.10.2026, bkz. src/lib/types.ts netHesapla).';
