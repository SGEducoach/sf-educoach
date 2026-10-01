-- Ortaokul: Maarif | LGS bölümleri, öğrenci çalışma kaydı ve ÖĞRETMEN
-- kararlı konu yeterliliği.
--
-- Kullanıcı kararları (01.10.2026):
--  * "soru çözümü ve konu çalışma kısmı iki seçenek filtresi ile açılsın:
--     maarif ve lgs" — filtre HEM öğrenci HEM öğretmen panelinde.
--  * LGS bölümü 5-8'in HEPSİNDE açık. (Tasarım belgesi §10.3 "yalnız 8.
--    sınıf" diyordu; kullanıcı kararı onu geçersiz kıldı.)
--  * Öğretmen Maarif'te yeterliliğe karar verir; LGS'de hem ödev verir hem
--    yeterlilik kararı verir.
--  * "öğrenciler konu yeterliliğinde lise gibi karar verme yetkisine sahip
--    olmasın" — karar YALNIZ öğretmende. Lisede öğrencinin kendi beyanı
--    (konu_calismalar.hedefe_yakinlik) hâkimiyete dönüşüyordu; burada o yol
--    KAPALI, RLS'te öğrenciye yazma politikası hiç tanımlı değil.
--
-- LGS'nin AYRI KONU TAKSONOMİSİ YOK: LGS 8. sınıf MEB müfredatını ölçüyor.
-- Bu yüzden Maarif/LGS bir `bolum` ayracı; ikinci bir konu ağacı değil.
-- (ortaokul/lgs_soru_dagilimi.pdf tamamen taranmış, metin katmanı yok —
-- zaten soru DAĞILIMI verisi, konu listesi değil.)
--
-- Yeterlilik kararı TEMA düzeyinde: İngilizce'de numaralı kazanım hiç yok
-- (bkz. migration 0131), kazanım düzeyinde bir model o dersi kapsayamazdı.
-- Kazanım düzeyi ileride eklenebilir.

-- ---------- 1) Bölüm ----------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ortaokul_bolum') then
    create type public.ortaokul_bolum as enum ('maarif', 'lgs');
  end if;
end $$;

-- ---------- 2) Öğrenci çalışma kaydı ----------
--
-- Paralel model kuralı: ölçme/ilerleme paralel, bu yüzden lise tablolarına
-- (konu_calismalar / soru_cozumleri) dokunulmuyor. Alan adları onlarla
-- hizalı tutuldu ki iki taraf okunurken kafa karışmasın.

create table if not exists public.ortaokul_calismalar (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  bolum public.ortaokul_bolum not null,
  tur text not null check (tur in ('konu', 'soru')),

  ders_id uuid not null references public.ortaokul_mufredat_dersleri(id) on delete cascade,
  -- Tema seçmek zorunlu değil: öğrenci "genel çalıştım" diyebilir.
  tema_id uuid references public.ortaokul_mufredat_temalari(id) on delete set null,

  tarih date not null,
  sure_dakika integer check (sure_dakika is null or (sure_dakika > 0 and sure_dakika <= 600)),

  -- Yalnız tur='soru' için.
  dogru integer check (dogru is null or dogru >= 0),
  yanlis integer check (yanlis is null or yanlis >= 0),
  bos integer check (bos is null or bos >= 0),

  created_at timestamptz not null default now(),

  -- Konu çalışmasında süre gerekir; soru çözümünde en az bir sayı girilmeli.
  constraint ortaokul_calisma_tur_tutarli check (
    (tur = 'konu' and sure_dakika is not null and dogru is null and yanlis is null and bos is null)
    or (tur = 'soru' and coalesce(dogru, 0) + coalesce(yanlis, 0) + coalesce(bos, 0) > 0)
  ),
  -- Soru çözümünde süre sınırı: soru başına en çok 2 dk (lise tarafındaki
  -- aynı ilke, bkz. migration 0125 — BOŞ dahil sayılır).
  constraint ortaokul_calisma_sure_makul check (
    tur <> 'soru' or sure_dakika is null
    or sure_dakika <= 2 * (coalesce(dogru, 0) + coalesce(yanlis, 0) + coalesce(bos, 0))
  )
);

create index if not exists ortaokul_calisma_ogrenci_idx
  on public.ortaokul_calismalar (student_id, tarih desc);
create index if not exists ortaokul_calisma_bolum_idx
  on public.ortaokul_calismalar (student_id, bolum, tarih desc);

comment on table public.ortaokul_calismalar is
  'Ortaokul öğrencisinin kendi konu çalışması / soru çözümü kaydı. Maarif veya LGS bölümü altında. Yeterlilik kararı İÇERMEZ — o karar yalnız öğretmende (ortaokul_konu_yeterlilikleri).';

-- ---------- 3) Öğretmen kararlı konu yeterliliği ----------

create table if not exists public.ortaokul_konu_yeterlilikleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tema_id uuid not null references public.ortaokul_mufredat_temalari(id) on delete cascade,
  bolum public.ortaokul_bolum not null,

  -- Tasarım belgesi §7.2 durumları. Akademik eksikte alarm dili yok;
  -- "başarısız" diye bir durum BİLEREK yok.
  durum text not null check (durum in (
    'baslamadi', 'ogreniyor', 'biraz_pratik', 'saglamlastirdi', 'tekrar_zamani'
  )),

  -- Kararı veren öğretmen. NOT NULL: kararın sahibi her zaman bilinir.
  karar_veren_id uuid not null references public.profiles(id) on delete restrict,
  aciklama text check (aciklama is null or char_length(btrim(aciklama)) between 1 and 500),

  created_at timestamptz not null default now(),
  guncellenme_at timestamptz not null default now(),

  -- Aynı öğrenci + tema + bölüm için TEK güncel karar.
  unique (student_id, tema_id, bolum)
);

create index if not exists ortaokul_yeterlilik_ogrenci_idx
  on public.ortaokul_konu_yeterlilikleri (student_id, bolum);
create index if not exists ortaokul_yeterlilik_tema_idx
  on public.ortaokul_konu_yeterlilikleri (tema_id, bolum);

comment on table public.ortaokul_konu_yeterlilikleri is
  'Öğretmenin bir öğrencinin bir temadaki yeterliliğine dair KARARI. Öğrenci kendi kararını yazamaz (kullanıcı kararı 01.10.2026) — RLS''te öğrenci için yazma politikası yoktur.';

create or replace function public.ortaokul_yeterlilik_guncellenme()
returns trigger language plpgsql as $$
begin
  new.guncellenme_at := now();
  return new;
end $$;

drop trigger if exists ortaokul_yeterlilik_guncellenme_tetik on public.ortaokul_konu_yeterlilikleri;
create trigger ortaokul_yeterlilik_guncellenme_tetik
  before update on public.ortaokul_konu_yeterlilikleri
  for each row execute function public.ortaokul_yeterlilik_guncellenme();

-- ---------- 4) RLS ----------

alter table public.ortaokul_calismalar enable row level security;
alter table public.ortaokul_konu_yeterlilikleri enable row level security;

-- Çalışma kaydı: öğrenci kendi kaydını yazar/okur/siler; kurum tarafı okur.
drop policy if exists ortaokul_calisma_ogrenci_ekleme on public.ortaokul_calismalar;
create policy ortaokul_calisma_ogrenci_ekleme on public.ortaokul_calismalar
  for insert to authenticated with check (student_id = auth.uid());

drop policy if exists ortaokul_calisma_okuma on public.ortaokul_calismalar;
create policy ortaokul_calisma_okuma on public.ortaokul_calismalar
  for select to authenticated
  using (student_id = auth.uid() or public.kurum_ogrencisini_gorebilir(student_id));

drop policy if exists ortaokul_calisma_ogrenci_silme on public.ortaokul_calismalar;
create policy ortaokul_calisma_ogrenci_silme on public.ortaokul_calismalar
  for delete to authenticated using (student_id = auth.uid());

-- Yeterlilik: öğrenci YALNIZ OKUR. Yazma politikası öğrenci için hiç yok —
-- karar öğretmenin (kullanıcı kararı). Kurum tarafı yazar ve günceller.
drop policy if exists ortaokul_yeterlilik_okuma on public.ortaokul_konu_yeterlilikleri;
create policy ortaokul_yeterlilik_okuma on public.ortaokul_konu_yeterlilikleri
  for select to authenticated
  using (student_id = auth.uid() or public.kurum_ogrencisini_gorebilir(student_id));

drop policy if exists ortaokul_yeterlilik_kurum_ekleme on public.ortaokul_konu_yeterlilikleri;
create policy ortaokul_yeterlilik_kurum_ekleme on public.ortaokul_konu_yeterlilikleri
  for insert to authenticated
  with check (public.kurum_ogrencisini_gorebilir(student_id) and karar_veren_id = auth.uid());

drop policy if exists ortaokul_yeterlilik_kurum_guncelleme on public.ortaokul_konu_yeterlilikleri;
create policy ortaokul_yeterlilik_kurum_guncelleme on public.ortaokul_konu_yeterlilikleri
  for update to authenticated
  using (public.kurum_ogrencisini_gorebilir(student_id))
  with check (public.kurum_ogrencisini_gorebilir(student_id) and karar_veren_id = auth.uid());

drop policy if exists ortaokul_yeterlilik_kurum_silme on public.ortaokul_konu_yeterlilikleri;
create policy ortaokul_yeterlilik_kurum_silme on public.ortaokul_konu_yeterlilikleri
  for delete to authenticated using (public.kurum_ogrencisini_gorebilir(student_id));

revoke all on public.ortaokul_calismalar from anon;
revoke all on public.ortaokul_konu_yeterlilikleri from anon;
