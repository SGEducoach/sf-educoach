-- Kurum aboneliği ve modül paketleri. Eski kurumların erişimi korunur:
-- boş yetki nesnesinde her modül açık kabul edilir.
alter table public.schools
  add column if not exists manuel_aktif boolean,
  add column if not exists kullanim_bitis_tarihi date,
  add column if not exists modul_yetkileri jsonb not null default '{}'::jsonb,
  add column if not exists paket_adi text;

update public.schools set manuel_aktif = aktif where manuel_aktif is null;
alter table public.schools alter column manuel_aktif set default true;
alter table public.schools alter column manuel_aktif set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'schools_modul_yetkileri_object') then
    alter table public.schools add constraint schools_modul_yetkileri_object
      check (jsonb_typeof(modul_yetkileri) = 'object');
  end if;
end $$;

create table if not exists public.kurum_paketleri (
  id text primary key,
  ad text not null unique,
  aciklama text not null default '',
  modul_yetkileri jsonb not null default '{}'::jsonb
    check (jsonb_typeof(modul_yetkileri) = 'object'),
  sira integer not null default 0,
  aktif boolean not null default true
);

alter table public.kurum_paketleri enable row level security;
grant select on public.kurum_paketleri to authenticated;
drop policy if exists "kurum_paketleri_admin_select" on public.kurum_paketleri;
create policy "kurum_paketleri_admin_select" on public.kurum_paketleri
  for select using (public.is_admin());

insert into public.kurum_paketleri (id, ad, aciklama, modul_yetkileri, sira)
values
  ('temel', 'Temel', 'Temel çalışma ve iletişim araçları',
    '{"gorevler":true,"program":true,"calisma":true,"konular":true,"analiz":false,"denemeler":false,"pano":true,"duyurular":true,"rehberlik":false,"dersler":true,"yurt":false,"gelisim":false,"yonetim":true}'::jsonb, 1),
  ('standart', 'Standart', 'Temel araçlar, analiz, deneme ve rehberlik',
    '{"gorevler":true,"program":true,"calisma":true,"konular":true,"analiz":true,"denemeler":true,"pano":true,"duyurular":true,"rehberlik":true,"dersler":true,"yurt":false,"gelisim":true,"yonetim":true}'::jsonb, 2),
  ('tam', 'Tam Erişim', 'Tanımlı bütün kurum modülleri',
    '{"gorevler":true,"program":true,"calisma":true,"konular":true,"analiz":true,"denemeler":true,"pano":true,"duyurular":true,"rehberlik":true,"dersler":true,"yurt":true,"gelisim":true,"yonetim":true}'::jsonb, 3)
on conflict (id) do nothing;

-- Süresi dolan kurumlar veritabanında da pasifleşir. Giriş ve panel
-- ayrıca tarihi anlık denetler; günlük cron gecikse dahi erişim açılmaz.
create or replace function public.kurum_aktifligini_hesapla()
returns trigger language plpgsql as $$
begin
  if new.grup_kapasitesi is null then
    new.aktif := new.manuel_aktif and
      (new.kullanim_bitis_tarihi is null or
       new.kullanim_bitis_tarihi >= (now() at time zone 'Europe/Istanbul')::date);
  end if;
  return new;
end;
$$;

drop trigger if exists schools_kurum_aktifligi on public.schools;
create trigger schools_kurum_aktifligi
before insert or update of manuel_aktif, kullanim_bitis_tarihi
on public.schools for each row execute function public.kurum_aktifligini_hesapla();

comment on column public.schools.kullanim_bitis_tarihi is
  'Son kullanım günü dahildir; boşsa süresiz.';
comment on column public.schools.modul_yetkileri is
  'Modül anahtarı -> boolean. Eksik anahtar geçiş uyumluluğu için açıktır.';
