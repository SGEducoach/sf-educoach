-- Sınava Doğru ana konularının kuruma özel alt başlıkları. Maarif'in resmî
-- alt_basliklar dizisi değişmez; öğretmen başlıkları ayrı tabloda tutulur.
create table public.ortaokul_sinava_dogru_alt_basliklar (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  tema_id uuid not null references public.ortaokul_mufredat_temalari(id) on delete cascade,
  ad text not null check (char_length(btrim(ad)) between 2 and 120),
  aktif boolean not null default true,
  sira integer not null default 0,
  olusturan_id uuid references public.profiles(id) on delete set null,
  guncelleyen_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ortaokul_sinava_dogru_alt_tema_idx
  on public.ortaokul_sinava_dogru_alt_basliklar (school_id, tema_id, sira);
create unique index ortaokul_sinava_dogru_alt_aktif_ad_idx
  on public.ortaokul_sinava_dogru_alt_basliklar (school_id, tema_id, lower(btrim(ad)))
  where aktif;

create function public.ortaokul_sinava_dogru_alt_dogrula()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    new.school_id := old.school_id;
    new.tema_id := old.tema_id;
    new.olusturan_id := old.olusturan_id;
  end if;
  if not exists (
    select 1 from public.ortaokul_mufredat_temalari t
    where t.id = new.tema_id and (t.school_id is null or t.school_id = new.school_id)
  ) then
    raise exception 'Ana konu bu kuruma ait değil';
  end if;
  new.ad := btrim(new.ad);
  new.updated_at := now();
  return new;
end $$;

create trigger ortaokul_sinava_dogru_alt_dogrula_tetik
  before insert or update on public.ortaokul_sinava_dogru_alt_basliklar
  for each row execute function public.ortaokul_sinava_dogru_alt_dogrula();

alter table public.ortaokul_sinava_dogru_alt_basliklar enable row level security;

create policy ortaokul_sinava_dogru_alt_okuma
  on public.ortaokul_sinava_dogru_alt_basliklar
  for select to authenticated using (public.kurum_uyesi_mi(school_id));

create policy ortaokul_sinava_dogru_alt_ekleme
  on public.ortaokul_sinava_dogru_alt_basliklar
  for insert to authenticated with check (
    olusturan_id = auth.uid() and guncelleyen_id = auth.uid()
    and exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = ortaokul_sinava_dogru_alt_basliklar.school_id)
  );

create policy ortaokul_sinava_dogru_alt_guncelleme
  on public.ortaokul_sinava_dogru_alt_basliklar
  for update to authenticated
  using (exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = ortaokul_sinava_dogru_alt_basliklar.school_id))
  with check (
    guncelleyen_id = auth.uid()
    and exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = ortaokul_sinava_dogru_alt_basliklar.school_id)
  );

grant select, insert, update on public.ortaokul_sinava_dogru_alt_basliklar to authenticated;
revoke all on public.ortaokul_sinava_dogru_alt_basliklar from anon;

-- Öğrencinin çalışma kaydında seçtiği alt başlığın adı anlık görüntü olarak
-- saklanır; öğretmen sonradan adını değiştirirse geçmiş kayıt bozulmaz.
alter table public.ortaokul_calismalar
  add column alt_baslik text check (alt_baslik is null or char_length(btrim(alt_baslik)) between 2 and 200);
alter table public.ortaokul_calismalar
  add constraint ortaokul_calisma_alt_baslik_bolumu check (
    alt_baslik is null or (bolum = 'lgs' and tema_id is not null)
  );

create function public.ortaokul_alt_baslik_ogrenciye_uygun(
  p_student_id uuid, p_tema_id uuid, p_alt_baslik text
)
returns boolean language sql stable security definer set search_path = public as $$
  select p_alt_baslik is null or exists (
    select 1
    from public.students s
    join public.ortaokul_mufredat_temalari t on t.id = p_tema_id
    where s.id = p_student_id
      and (t.school_id is null or t.school_id = s.school_id)
      and (
        p_alt_baslik = any(coalesce(t.alt_basliklar, array[]::text[]))
        or exists (
          select 1 from public.ortaokul_sinava_dogru_alt_basliklar a
          where a.school_id = s.school_id and a.tema_id = t.id
            and a.ad = p_alt_baslik and a.aktif
        )
      )
  );
$$;

revoke all on function public.ortaokul_alt_baslik_ogrenciye_uygun(uuid, uuid, text) from anon;

drop policy ortaokul_calisma_ogrenci_ekleme on public.ortaokul_calismalar;
create policy ortaokul_calisma_ogrenci_ekleme on public.ortaokul_calismalar
  for insert to authenticated with check (
    student_id = auth.uid()
    and public.ortaokul_konu_ogrenciye_uygun(student_id, ders_id, tema_id, bolum)
    and public.ortaokul_alt_baslik_ogrenciye_uygun(student_id, tema_id, alt_baslik)
  );
