-- Ortaokul Paneli — Faz 0: sürümlü müfredat omurgası.
--
-- Kullanıcı kararı (30.09.2026): ortaokul, lise modelinin yanında PARALEL bir
-- müfredat/ilerleme/ölçme katmanı. Buna karşılık kimlik, rol, kurum, SINIF,
-- bildirim ve denetim kaydı TEK kalır — bu yüzden burada yalnız müfredat
-- tabloları var, `profiles`/`classes`/`gorevler` gibi ortak tablolara
-- DOKUNULMUYOR.
--
-- Adlandırma kuralı: hepsi Türkçe ve `ortaokul_` önekli (tasarım raporu §8.2).
--
-- Hiyerarşi: sürüm > ders (sınıf bazlı) > tema/ünite/beceri > öğrenme çıktısı
--   * Matematik/Sosyal Bilgiler/İnkılap: "tema"
--   * Fen Bilimleri: "ünite"
--   * Türkçe: "beceri" (okuma/dinleme/yazma/konuşma) — tema yok
--   * İngilizce: ünite var ama NUMARALI ÖĞRENME ÇIKTISI YOK; bu yüzden
--     kazanım satırı olmayan tema geçerli bir durumdur, zorunlu tutulmaz.

-- ---------- 1) Sürüm ----------

create table if not exists public.ortaokul_mufredat_surumleri (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  yetkili text not null default 'MEB',
  gecerli_baslangic date,
  gecerli_bitis date,
  durum text not null default 'taslak' check (durum in ('taslak', 'aktif', 'arsiv')),
  kaynak_belge text,
  created_at timestamptz not null default now(),
  unique (ad)
);

-- Aynı anda yalnız bir sürüm "aktif" olabilir.
create unique index if not exists ortaokul_mufredat_tek_aktif
  on public.ortaokul_mufredat_surumleri ((durum)) where durum = 'aktif';

-- ---------- 2) Ders (sınıf bazlı) ----------

create table if not exists public.ortaokul_mufredat_dersleri (
  id uuid primary key default gen_random_uuid(),
  surum_id uuid not null references public.ortaokul_mufredat_surumleri(id) on delete cascade,
  sinif_seviyesi text not null check (sinif_seviyesi in ('5', '6', '7', '8')),
  ders_kodu text not null,
  ad text not null,
  sira integer not null default 0,
  created_at timestamptz not null default now(),
  unique (surum_id, sinif_seviyesi, ders_kodu)
);

-- ---------- 3) Tema / ünite / beceri ----------

create table if not exists public.ortaokul_mufredat_temalari (
  id uuid primary key default gen_random_uuid(),
  ders_id uuid not null references public.ortaokul_mufredat_dersleri(id) on delete cascade,
  kod text not null,
  -- Kaynak PDF'lerin özet tablolarından çıkarılamayan 26 başlık için NULL
  -- bırakılabilir; içerik doğrulamasında elle tamamlanacak.
  ad text,
  tur text not null default 'tema' check (tur in ('tema', 'unite', 'beceri')),
  islenis_sirasi integer,
  ders_saati integer,
  yuzde integer,
  sira integer not null default 0,
  created_at timestamptz not null default now(),
  unique (ders_id, kod)
);

-- ---------- 4) Öğrenme çıktısı ----------

create table if not exists public.ortaokul_mufredat_kazanimlari (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null references public.ortaokul_mufredat_temalari(id) on delete cascade,
  kod text not null,
  metin text not null,
  sira integer not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tema_id, kod)
);

create index if not exists ortaokul_kazanim_tema_idx on public.ortaokul_mufredat_kazanimlari(tema_id);
create index if not exists ortaokul_tema_ders_idx on public.ortaokul_mufredat_temalari(ders_id);
create index if not exists ortaokul_ders_surum_idx on public.ortaokul_mufredat_dersleri(surum_id, sinif_seviyesi);

-- ---------- 5) Görev ↔ öğrenme çıktısı bağı ----------
--
-- Tasarım belgesi §22.2: "Görev en az bir ders ve tercihen bir öğrenme
-- çıktısıyla ilişkilendirilebilir." Bugün `gorevler.ders`/`konu` serbest
-- metin ve müfredata hiç bağ yok. `gorevler` ORTAK tablo olduğu için ona
-- kolon eklemek yerine ayrı bir bağ tablosu kuruldu: lise tarafı hiç
-- etkilenmiyor, ortaokul görevleri kazanıma bağlanabiliyor.

create table if not exists public.ortaokul_gorev_kazanimlari (
  gorev_id uuid not null references public.gorevler(id) on delete cascade,
  kazanim_id uuid not null references public.ortaokul_mufredat_kazanimlari(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gorev_id, kazanim_id)
);

create index if not exists ortaokul_gorev_kazanim_kazanim_idx on public.ortaokul_gorev_kazanimlari(kazanim_id);

-- ---------- 6) RLS ----------
--
-- Müfredat kişisel veri değil; giriş yapmış herkes OKUR. Yazma yalnız servis
-- anahtarıyla (yönetici sunucu eylemleri) — anon/authenticated'a yazma yetkisi
-- verilmiyor (ders_hiz_referanslari ile aynı desen).

alter table public.ortaokul_mufredat_surumleri enable row level security;
alter table public.ortaokul_mufredat_dersleri enable row level security;
alter table public.ortaokul_mufredat_temalari enable row level security;
alter table public.ortaokul_mufredat_kazanimlari enable row level security;
alter table public.ortaokul_gorev_kazanimlari enable row level security;

drop policy if exists ortaokul_surum_okuma on public.ortaokul_mufredat_surumleri;
create policy ortaokul_surum_okuma on public.ortaokul_mufredat_surumleri
  for select to authenticated using (true);

drop policy if exists ortaokul_ders_okuma on public.ortaokul_mufredat_dersleri;
create policy ortaokul_ders_okuma on public.ortaokul_mufredat_dersleri
  for select to authenticated using (true);

drop policy if exists ortaokul_tema_okuma on public.ortaokul_mufredat_temalari;
create policy ortaokul_tema_okuma on public.ortaokul_mufredat_temalari
  for select to authenticated using (true);

drop policy if exists ortaokul_kazanim_okuma on public.ortaokul_mufredat_kazanimlari;
create policy ortaokul_kazanim_okuma on public.ortaokul_mufredat_kazanimlari
  for select to authenticated using (true);

-- Görev bağı: yalnız o görevi zaten görebilen taraf okur. Görevi oluşturan
-- öğretmen/öğrenci ve görev kendisine atanmış öğrenci.
drop policy if exists ortaokul_gorev_kazanim_okuma on public.ortaokul_gorev_kazanimlari;
create policy ortaokul_gorev_kazanim_okuma on public.ortaokul_gorev_kazanimlari
  for select to authenticated using (
    exists (
      select 1 from public.gorevler g
      where g.id = gorev_id
        and (
          g.olusturan_ogretmen_id = auth.uid()
          or g.olusturan_ogrenci_id = auth.uid()
          or exists (select 1 from public.gorev_atamalari a where a.gorev_id = g.id and a.student_id = auth.uid())
        )
    )
  );

revoke insert, update, delete on
  public.ortaokul_mufredat_surumleri,
  public.ortaokul_mufredat_dersleri,
  public.ortaokul_mufredat_temalari,
  public.ortaokul_mufredat_kazanimlari,
  public.ortaokul_gorev_kazanimlari
from anon, authenticated;

-- ---------- 7) Özellik bayrağı ----------

alter table public.platform_ayarlari
  add column if not exists ortaokul_aktif boolean not null default false;
