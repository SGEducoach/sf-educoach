-- LGS bölümünün kullanıcıya görünen adı "Sınava Doğru". Eski `lgs` enum
-- değeri ve öğrenci kayıtları korunur. MEB temaları değişmez; kurumun sınav
-- görünümündeki ad/görünürlük farkları ayrı tabloda tutulur.

alter table public.ortaokul_mufredat_temalari
  add column if not exists school_id uuid references public.schools(id) on delete cascade;

alter table public.ortaokul_mufredat_temalari
  add column if not exists sinava_dogru_eklemesi boolean not null default false;

alter table public.ortaokul_mufredat_temalari
  add constraint ortaokul_sinava_dogru_kaynak_tutarliligi check (
    (school_id is null and not sinava_dogru_eklemesi)
    or (school_id is not null and sinava_dogru_eklemesi and nullif(btrim(ad), '') is not null)
  );

create index if not exists ortaokul_tema_kurum_idx
  on public.ortaokul_mufredat_temalari (school_id, ders_id)
  where school_id is not null;

drop policy if exists ortaokul_tema_okuma on public.ortaokul_mufredat_temalari;
create policy ortaokul_tema_okuma on public.ortaokul_mufredat_temalari
  for select to authenticated
  using (school_id is null or public.kurum_uyesi_mi(school_id));

drop policy if exists ortaokul_sinava_dogru_tema_ekleme on public.ortaokul_mufredat_temalari;
create policy ortaokul_sinava_dogru_tema_ekleme on public.ortaokul_mufredat_temalari
  for insert to authenticated
  with check (
    sinava_dogru_eklemesi and school_id is not null
    and exists (
      select 1 from public.teachers t
      where t.id = auth.uid() and t.school_id = ortaokul_mufredat_temalari.school_id
    )
    and exists (
      select 1 from public.ortaokul_mufredat_dersleri d
      join public.ortaokul_mufredat_surumleri v on v.id = d.surum_id
      where d.id = ortaokul_mufredat_temalari.ders_id
        and d.sinif_seviyesi in ('5', '6', '7', '8') and v.durum = 'aktif'
    )
  );

grant insert on public.ortaokul_mufredat_temalari to authenticated;

create table if not exists public.ortaokul_sinava_dogru_konu_duzenlemeleri (
  school_id uuid not null references public.schools(id) on delete cascade,
  tema_id uuid not null references public.ortaokul_mufredat_temalari(id) on delete cascade,
  ad text check (ad is null or char_length(btrim(ad)) between 2 and 120),
  aktif boolean not null default true,
  guncelleyen_id uuid references public.profiles(id) on delete set null,
  guncellenme_at timestamptz not null default now(),
  primary key (school_id, tema_id)
);

create or replace function public.ortaokul_sinava_dogru_duzenleme_dogrula()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.ortaokul_mufredat_temalari t
    where t.id = new.tema_id and (t.school_id is null or t.school_id = new.school_id)
  ) then
    raise exception 'Konu bu kuruma ait değil';
  end if;
  new.ad := nullif(btrim(new.ad), '');
  new.guncellenme_at := now();
  return new;
end $$;

create trigger ortaokul_sinava_dogru_duzenleme_dogrula_tetik
  before insert or update on public.ortaokul_sinava_dogru_konu_duzenlemeleri
  for each row execute function public.ortaokul_sinava_dogru_duzenleme_dogrula();

alter table public.ortaokul_sinava_dogru_konu_duzenlemeleri enable row level security;

create policy ortaokul_sinava_dogru_duzenleme_okuma
  on public.ortaokul_sinava_dogru_konu_duzenlemeleri
  for select to authenticated using (public.kurum_uyesi_mi(school_id));

create policy ortaokul_sinava_dogru_duzenleme_ekleme
  on public.ortaokul_sinava_dogru_konu_duzenlemeleri
  for insert to authenticated with check (
    guncelleyen_id = auth.uid()
    and exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = ortaokul_sinava_dogru_konu_duzenlemeleri.school_id)
  );

create policy ortaokul_sinava_dogru_duzenleme_guncelleme
  on public.ortaokul_sinava_dogru_konu_duzenlemeleri
  for update to authenticated
  using (exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = ortaokul_sinava_dogru_konu_duzenlemeleri.school_id))
  with check (
    guncelleyen_id = auth.uid()
    and exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = ortaokul_sinava_dogru_konu_duzenlemeleri.school_id)
  );

grant select, insert, update on public.ortaokul_sinava_dogru_konu_duzenlemeleri to authenticated;
revoke all on public.ortaokul_sinava_dogru_konu_duzenlemeleri from anon;

-- Mevcut çalışma ve yeterlilik tabloları aynı tema kimliğini kullanmaya
-- devam eder. Kuruma özel yeni konu yalnız o kurumun öğrencisi için ve yalnız
-- Sınava Doğru bölümünde kullanılabilir; Maarif'e sızamaz.
create or replace function public.ortaokul_konu_ogrenciye_uygun(
  p_student_id uuid, p_ders_id uuid, p_tema_id uuid, p_bolum public.ortaokul_bolum
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.students s
    join public.classes c on c.id = s.class_id
    join public.ortaokul_mufredat_dersleri d on d.id = p_ders_id
    join public.ortaokul_mufredat_surumleri v on v.id = d.surum_id and v.durum = 'aktif'
    left join public.ortaokul_mufredat_temalari t on t.id = p_tema_id and t.ders_id = d.id
    left join public.ortaokul_sinava_dogru_konu_duzenlemeleri x
      on x.tema_id = t.id and x.school_id = s.school_id
    where s.id = p_student_id and d.sinif_seviyesi = c.seviye
      and (p_tema_id is null or (
        t.id is not null
        and (t.school_id is null or (p_bolum = 'lgs' and t.school_id = s.school_id))
        and (p_bolum = 'maarif' or coalesce(x.aktif, true))
      ))
  );
$$;

revoke all on function public.ortaokul_konu_ogrenciye_uygun(uuid, uuid, uuid, public.ortaokul_bolum) from anon;

drop policy if exists ortaokul_calisma_ogrenci_ekleme on public.ortaokul_calismalar;
create policy ortaokul_calisma_ogrenci_ekleme on public.ortaokul_calismalar
  for insert to authenticated with check (
    student_id = auth.uid()
    and public.ortaokul_konu_ogrenciye_uygun(student_id, ders_id, tema_id, bolum)
  );

drop policy if exists ortaokul_yeterlilik_kurum_ekleme on public.ortaokul_konu_yeterlilikleri;
create policy ortaokul_yeterlilik_kurum_ekleme on public.ortaokul_konu_yeterlilikleri
  for insert to authenticated with check (
    public.kurum_ogrencisini_gorebilir(student_id)
    and karar_veren_id = auth.uid()
    and exists (
      select 1 from public.ortaokul_mufredat_temalari t
      where t.id = tema_id
        and public.ortaokul_konu_ogrenciye_uygun(student_id, t.ders_id, tema_id, bolum)
    )
  );

drop policy if exists ortaokul_yeterlilik_kurum_guncelleme on public.ortaokul_konu_yeterlilikleri;
create policy ortaokul_yeterlilik_kurum_guncelleme on public.ortaokul_konu_yeterlilikleri
  for update to authenticated
  using (public.kurum_ogrencisini_gorebilir(student_id))
  with check (
    public.kurum_ogrencisini_gorebilir(student_id)
    and karar_veren_id = auth.uid()
    and exists (
      select 1 from public.ortaokul_mufredat_temalari t
      where t.id = tema_id
        and public.ortaokul_konu_ogrenciye_uygun(student_id, t.ders_id, tema_id, bolum)
    )
  );
