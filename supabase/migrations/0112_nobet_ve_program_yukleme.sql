-- Ders programı ve nöbet listesi yükleme (kullanıcı isteği 17.09.2026):
-- yönetici/müdür okulun MEB ders programı PDF'ini ve yurt (belletmen) nöbet
-- listesi PDF'ini site içinden yükler. Kullanıcı kararları:
--   * Ders programı yüklendikten sonra ELLE DEĞİŞTİRİLMEZ (kaynak='pdf'
--     satırlar kilitli; elle eklenen eski kayıtlar 'elle' kalır).
--   * Nöbetler öğretmenler arasında değişebildiği için ekleme, silme ve
--     gün/yer (yurtta tarih) değiştirme serbesttir.
-- İki nöbet ayrı: okul nöbeti haftalık (gün + yer, ders programı PDF'inde
-- yazıyor), yurt nöbeti tarih bazlı (belletmen listesi).
--
-- Hesabı olmayan öğretmenin nöbeti de ad anahtarıyla saklanır; öğretmen üye
-- olunca bekleyen ders programı gibi kendiliğinden bağlanır (aşağıdaki
-- tetikleyici güncellemesi). Yazma yalnızca sunucu (servis anahtarı).
create table if not exists public.ogretmen_okul_nobetleri (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad_soyad text not null,
  ad_anahtari text generated always as (public.ad_esleme_anahtari(ad_soyad)) stored,
  teacher_id uuid references public.teachers(id) on delete set null,
  gun text not null check (gun in ('pazartesi','sali','carsamba','persembe','cuma','cumartesi','pazar')),
  yer text not null,
  created_at timestamptz not null default now(),
  unique (school_id, ad_anahtari, gun)
);

create index if not exists ogretmen_okul_nobetleri_okul_ad on public.ogretmen_okul_nobetleri (school_id, ad_anahtari);
create index if not exists ogretmen_okul_nobetleri_ogretmen on public.ogretmen_okul_nobetleri (teacher_id) where teacher_id is not null;

create table if not exists public.yurt_nobet_gorevleri (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad_soyad text not null,
  ad_anahtari text generated always as (public.ad_esleme_anahtari(ad_soyad)) stored,
  teacher_id uuid references public.teachers(id) on delete set null,
  tarih date not null,
  created_at timestamptz not null default now(),
  unique (school_id, ad_anahtari, tarih)
);

create index if not exists yurt_nobet_gorevleri_okul_tarih on public.yurt_nobet_gorevleri (school_id, tarih);
create index if not exists yurt_nobet_gorevleri_ogretmen on public.yurt_nobet_gorevleri (teacher_id, tarih) where teacher_id is not null;

alter table public.ogretmen_okul_nobetleri enable row level security;
alter table public.yurt_nobet_gorevleri enable row level security;
revoke all on public.ogretmen_okul_nobetleri from anon;
revoke all on public.yurt_nobet_gorevleri from anon;
revoke insert, update, delete, truncate, references, trigger on public.ogretmen_okul_nobetleri from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.yurt_nobet_gorevleri from authenticated;

create policy "ogretmen_okul_nobetleri_select" on public.ogretmen_okul_nobetleri
  for select using (
    public.is_admin()
    or public.is_school_moderator(school_id)
    or exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = ogretmen_okul_nobetleri.school_id)
  );

create policy "yurt_nobet_gorevleri_select" on public.yurt_nobet_gorevleri
  for select using (
    public.is_admin()
    or public.is_school_moderator(school_id)
    or exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = yurt_nobet_gorevleri.school_id)
  );

-- PDF'ten gelen ders programı satırları kilitli.
alter table public.ogretmen_ders_programi
  add column if not exists kaynak text not null default 'elle';
alter table public.ogretmen_ders_programi drop constraint if exists ogretmen_ders_programi_kaynak_check;
alter table public.ogretmen_ders_programi add constraint ogretmen_ders_programi_kaynak_check
  check (kaynak in ('elle', 'pdf'));
alter table public.bekleyen_ogretmen_programlari
  add column if not exists kaynak text not null default 'elle';

-- Üyelikte: bekleyen ders programının yanı sıra okul ve yurt nöbetleri de bağlanır.
create or replace function public.bekleyen_ogretmen_programini_uygula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anahtar text;
  v_adaylar text[];
  v_aktarilan integer;
  v_eslesen text;
begin
  select public.ad_esleme_anahtari(ad) into v_anahtar from public.profiles where id = new.id;
  if coalesce(v_anahtar, '') = '' then
    return new;
  end if;

  if exists (
    select 1 from public.bekleyen_ogretmen_programlari
    where school_id = new.school_id and ad_anahtari = v_anahtar
  ) then
    v_adaylar := array[v_anahtar];
  else
    select array_agg(distinct b.ad_anahtari) into v_adaylar
    from public.bekleyen_ogretmen_programlari b
    cross join lateral (select string_to_array(b.ad_anahtari, ' ') as p) bekleyen
    cross join lateral (select string_to_array(v_anahtar, ' ') as p) girilen
    where b.school_id = new.school_id
      and array_length(bekleyen.p, 1) >= 2
      and array_length(girilen.p, 1) >= 2
      and bekleyen.p[array_length(bekleyen.p, 1)] = girilen.p[array_length(girilen.p, 1)]
      and exists (
        select 1
        from unnest(bekleyen.p[1:array_length(bekleyen.p, 1)-1]) bekleyen_ad
        join unnest(girilen.p[1:array_length(girilen.p, 1)-1]) girilen_ad
          on bekleyen_ad = girilen_ad
      );
  end if;

  v_eslesen := case when coalesce(cardinality(v_adaylar), 0) = 1 then v_adaylar[1] else v_anahtar end;

  -- Nöbetler: ad anahtarı eşleşen kayıtlar öğretmene bağlanır.
  update public.ogretmen_okul_nobetleri
  set teacher_id = new.id
  where school_id = new.school_id and teacher_id is null and ad_anahtari in (v_anahtar, v_eslesen);
  update public.yurt_nobet_gorevleri
  set teacher_id = new.id
  where school_id = new.school_id and teacher_id is null and ad_anahtari in (v_anahtar, v_eslesen);

  if coalesce(cardinality(v_adaylar), 0) <> 1 then
    return new;
  end if;

  insert into public.ogretmen_ders_programi (teacher_id, gun, ders_saati_sira, class_id, ders, kaynak)
  select new.id, b.gun, b.ders_saati_sira, b.class_id, b.ders, b.kaynak
  from public.bekleyen_ogretmen_programlari b
  where b.school_id = new.school_id and b.ad_anahtari = v_adaylar[1]
  on conflict (teacher_id, gun, ders_saati_sira) do nothing;
  get diagnostics v_aktarilan = row_count;

  delete from public.bekleyen_ogretmen_programlari
  where school_id = new.school_id and ad_anahtari = v_adaylar[1];

  if v_aktarilan > 0 then
    insert into public.bildirimler (profile_id, tur, baslik, mesaj, dis_gonderim_bekliyor)
    values (
      new.id, 'ders_programi', 'Ders programınız yüklenmiştir',
      'Ders programınız SeFu Koç''a yüklendi. Programınızı panelinizden görebilirsiniz.',
      true
    );
  end if;

  return new;
exception when others then
  raise warning 'bekleyen_ogretmen_programini_uygula: %', sqlerrm;
  return new;
end;
$$;
