-- SG EduCoach -- Yazılı Analizi Modülü Tabloları
-- Yazılı sınavlar, sorular, öğrenci toplam notları ve soru sonuçları tabloları

-- 1) Yazılı sınavlar
create table public.yazili_sinavlar (
    id uuid primary key default gen_random_uuid(),
    class_id uuid not null references public.classes(id) on delete cascade,
    ogretmen_id uuid references public.teachers(id) on delete set null,
    ad text not null,
    tarih date not null default current_date,
    ders text not null,
    created_at timestamptz not null default now()
);

-- 2) Yazılı sorular
create table public.yazili_sorular (
    id uuid primary key default gen_random_uuid(),
    yazili_sinav_id uuid not null references public.yazili_sinavlar(id) on delete cascade,
    sira integer not null check (sira > 0),
    max_puan integer not null check (max_puan > 0),
    kazanim text not null check (length(trim(kazanim)) > 0),
    unique (yazili_sinav_id, sira)
);

-- 3) Yazılı öğrenci sonuçları (toplam not)
create table public.yazili_ogrenci_sonuclari (
    id uuid primary key default gen_random_uuid(),
    yazili_sinav_id uuid not null references public.yazili_sinavlar(id) on delete cascade,
    ogrenci_id uuid not null references public.students(id) on delete cascade,
    toplam_puan integer not null check (toplam_puan >= 0),
    temsilci_mi boolean not null default false,
    created_at timestamptz not null default now()
);

-- 4) Yazılı soru sonuçları
create table public.yazili_soru_sonuclari (
    id uuid primary key default gen_random_uuid(),
    yazili_sinav_id uuid not null references public.yazili_sinavlar(id) on delete cascade,
    ogrenci_id uuid not null references public.students(id) on delete cascade,
    soru_id uuid not null references public.yazili_sorular(id) on delete cascade,
    puan integer not null check (puan >= 0),
    kaynak text not null check (kaynak in ('actual', 'estimated')),
    estimation_version text,
    created_at timestamptz not null default now(),
    unique (yazili_sinav_id, ogrenci_id, soru_id)
);

-- Indexler
create index on public.yazili_sinavlar (class_id, tarih);
create index on public.yazili_sorular (yazili_sinav_id);
create index on public.yazili_ogrenci_sonuclari (yazili_sinav_id, ogrenci_id);
create index on public.yazili_soru_sonuclari (yazili_sinav_id, ogrenci_id);
create index on public.yazili_soru_sonuclari (yazili_sinav_id, soru_id);

-- Row Level Security
alter table public.yazili_sinavlar enable row level security;
alter table public.yazili_sorular enable row level security;
alter table public.yazili_ogrenci_sonuclari enable row level security;
alter table public.yazili_soru_sonuclari enable row level security;

-- Policies for yazili_sinavlar
-- Teachers can select exams for their classes (via ogretmen_dersleri for the ders)
create policy "yazili_sinavlar_select" on public.yazili_sinavlar for select using (
    exists (
        select 1 from public.ogretmen_dersleri
        where teacher_id = auth.uid()
          and class_id = yazili_sinavlar.class_id
          and ders = yazili_sinavlar.ders
    )
);

-- Teachers can insert exams for their classes (via ogretmen_dersleri)
create policy "yazili_sinavlar_insert" on public.yazili_sinavlar for insert with check (
    exists (
        select 1 from public.ogretmen_dersleri
        where teacher_id = auth.uid()
          and class_id = yazili_sinavlar.class_id
          and ders = yazili_sinavlar.ders
    )
);

-- Teachers can update/delete their own exams (optional, but we'll allow update/delete for now)
create policy "yazili_sinavlar_update" on public.yazili_sinavlar for update using (
    exists (
        select 1 from public.ogretmen_dersleri
        where teacher_id = auth.uid()
          and class_id = yazili_sinavlar.class_id
          and ders = yazili_sinavlar.ders
    )
);
create policy "yazili_sinavlar_delete" on public.yazili_sinavlar for delete using (
    exists (
        select 1 from public.ogretmen_dersleri
        where teacher_id = auth.uid()
          and class_id = yazili_sinavlar.class_id
          and ders = yazili_sinavlar.ders
    )
);

-- Policies for yazili_sorular (inherit from sinav via foreign key? We'll mirror sinav policies)
create policy "yazili_sorular_select" on public.yazili_sorular for select using (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_sorular.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
create policy "yazili_sorular_insert" on public.yazili_sorular for insert with check (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_sorular.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
create policy "yazili_sorular_update" on public.yazili_sorular for update using (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_sorular.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
create policy "yazili_sorular_delete" on public.yazili_sorular for delete using (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_sorular.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);

-- Policies for yazili_ogrenci_sonuclari
create policy "yazili_ogrenci_sonuclari_select" on public.yazili_ogrenci_sonuclari for select using (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_ogrenci_sonuclari.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
create policy "yazili_ogrenci_sonuclari_insert" on public.yazili_ogrenci_sonuclari for insert with check (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_ogrenci_sonuclari.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
create policy "yazili_ogrenci_sonuclari_update" on public.yazili_ogrenci_sonuclari for update using (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_ogrenci_sonuclari.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
create policy "yazili_ogrenci_sonuclari_delete" on public.yazili_ogrenci_sonuclari for delete using (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_ogrenci_sonuclari.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);

-- Policies for yazili_soru_sonuclari
create policy "yazili_soru_sonuclari_select" on public.yazili_soru_sonuclari for select using (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_soru_sonuclari.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
create policy "yazili_soru_sonuclari_insert" on public.yazili_soru_sonuclari for insert with check (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_soru_sonuclari.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
create policy "yazili_soru_sonuclari_update" on public.yazili_soru_sonuclari for update using (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_soru_sonuclari.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
create policy "yazili_soru_sonuclari_delete" on public.yazili_soru_sonuclari for delete using (
    exists (
        select 1 from public.yazili_sinavlar
        where id = yazili_soru_sonuclari.yazili_sinav_id
          and exists (
            select 1 from public.ogretmen_dersleri
            where teacher_id = auth.uid()
              and class_id = yazili_sinavlar.class_id
              and ders = yazili_sinavlar.ders
        )
    )
);
