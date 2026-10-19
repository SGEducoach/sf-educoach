-- İlkokul gelişim raporu: 2-4. sınıfların MEB dersleri (kullanıcı kararı
-- 19.10.2026). Kaynak: MEB Talim ve Terbiye Kurulu 09/05/2025 tarihli 4
-- sayılı karar, İlköğretim Kurumları Haftalık Ders Çizelgesi.
--   3. sınıf: Fen Bilimleri
--   4. sınıf: Fen Bilimleri, Sosyal Bilgiler, Din Kültürü ve Ahlak Bilgisi,
--             Trafik Güvenliği, İnsan Hakları, Vatandaşlık ve Demokrasi
--             (Hayat Bilgisi 4. sınıfta yok).
-- Kalem listesi uygulamadaki src/lib/ilkokul-gelisim.ts ile birebir aynı.

alter table public.ilkokul_gelisim drop constraint if exists ilkokul_gelisim_kalem_check;
alter table public.ilkokul_gelisim add constraint ilkokul_gelisim_kalem_check check (kalem in (
  'turkce', 'matematik', 'hayat_bilgisi', 'fen_bilimleri', 'sosyal_bilgiler', 'ingilizce', 'din_kulturu',
  'resim', 'muzik', 'beden_egitimi', 'trafik_guvenligi', 'insan_haklari',
  'degerler', 'sosyal_etkinlik', 'rehberlik'
));

-- 4. sınıfta "Değerler (Din Kültürü)" kurum kalemi yerini MEB'in Din Kültürü
-- ve Ahlak Bilgisi dersine bırakır: o sınıflardaki işaretler taşınır (aynı
-- ayda din_kulturu işareti varsa o korunur).
update public.ilkokul_gelisim g set kalem = 'din_kulturu'
from public.students s join public.classes c on c.id = s.class_id
where g.student_id = s.id and c.seviye = '4' and g.kalem = 'degerler'
  and not exists (
    select 1 from public.ilkokul_gelisim d
    where d.student_id = g.student_id and d.ay = g.ay and d.kalem = 'din_kulturu'
  );
