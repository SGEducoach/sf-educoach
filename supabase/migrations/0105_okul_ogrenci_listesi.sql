-- Okul öğrenci listesi (kullanıcı kararı 13.09.2026): yazılı analizinde
-- "kayıtlı olsun olmasın bütün sınıf yer alsın" — sistemde hesabı olmayan
-- öğrenciler de sınıf listesinde görünür, puan girilir, rapora dahil olur.
--
-- okul_ogrenci_listesi sınıf mevcudunun tek kaynağı: resmî listeden gelen
-- (hesabı olmayan) öğrenciler + hesabı olan bütün öğrenciler (student_id
-- bağlı). Resmî listesi yüklenmemiş okullarda liste yalnızca kayıtlı
-- öğrencilerden oluşur, yani yazılı analizi bugünkü gibi çalışır.
--
-- Senkron: students satırı açılınca/sınıfı ya da okul numarası değişince
-- tetikleyici listeyi günceller; aynı okul numarası listede hesapsız
-- bekliyorsa o satıra bağlanır. Tetikleyici hatası öğrenci kaydını düşürmez.
--
-- GÜVENLİK: öğrenci adları (reşit olmayanlar) — yalnızca aynı okulun
-- öğretmeni/müdürü, okul moderatörü ve admin okur; yazma yalnızca sunucu ve
-- tetikleyici (anon/authenticated'a yazma izni yok).
create table if not exists public.okul_ogrenci_listesi (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  okul_no text,
  ad_soyad text not null,
  student_id uuid unique references public.students(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (school_id, okul_no)
);

create index if not exists okul_ogrenci_listesi_sinif on public.okul_ogrenci_listesi (class_id);

alter table public.okul_ogrenci_listesi enable row level security;
revoke all on public.okul_ogrenci_listesi from anon;
revoke insert, update, delete, truncate, references, trigger on public.okul_ogrenci_listesi from authenticated;

create policy "okul_ogrenci_listesi_select" on public.okul_ogrenci_listesi
  for select using (
    public.is_admin()
    or public.is_school_moderator(school_id)
    or exists (
      select 1 from public.teachers t
      where t.id = auth.uid() and t.school_id = okul_ogrenci_listesi.school_id
    )
  );

-- Mevcut bütün kayıtlı öğrenciler listeye.
insert into public.okul_ogrenci_listesi (school_id, class_id, okul_no, ad_soyad, student_id)
select s.school_id, s.class_id, nullif(trim(s.okul_no), ''), coalesce(nullif(trim(p.ad), ''), 'İsimsiz öğrenci'), s.id
from public.students s
left join public.profiles p on p.id = s.id
where s.school_id is not null and s.class_id is not null
on conflict do nothing;

create or replace function public.okul_ogrenci_listesini_esitle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_okul_no text := nullif(trim(new.okul_no), '');
  v_id uuid;
begin
  if new.school_id is null or new.class_id is null then
    return new;
  end if;

  select id into v_id from public.okul_ogrenci_listesi where student_id = new.id;
  if v_id is null and v_okul_no is not null then
    select id into v_id from public.okul_ogrenci_listesi
    where school_id = new.school_id and okul_no = v_okul_no and student_id is null;
  end if;

  if v_id is null then
    insert into public.okul_ogrenci_listesi (school_id, class_id, okul_no, ad_soyad, student_id)
    select new.school_id, new.class_id, v_okul_no,
           coalesce((select nullif(trim(p.ad), '') from public.profiles p where p.id = new.id), 'İsimsiz öğrenci'),
           new.id;
  else
    update public.okul_ogrenci_listesi
    set student_id = new.id, school_id = new.school_id, class_id = new.class_id,
        okul_no = coalesce(v_okul_no, okul_no)
    where id = v_id;
  end if;
  return new;
exception when others then
  -- Liste senkronu hiçbir koşulda öğrenci kaydını/güncellemesini düşürmesin.
  raise warning 'okul_ogrenci_listesini_esitle: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.okul_ogrenci_listesini_esitle() from public, anon, authenticated;

drop trigger if exists okul_ogrenci_listesini_esitle on public.students;
create trigger okul_ogrenci_listesini_esitle
  after insert or update of school_id, class_id, okul_no on public.students
  for each row execute function public.okul_ogrenci_listesini_esitle();

-- Yazılı sonuçları artık liste satırına bağlı. ogrenci_id (hesap) varsa
-- dolu kalır; hesap silinirse sonuç SİLİNMEZ (öğrenci sınıfta kalıyor).
alter table public.yazili_ogrenci_sonuclari
  add column if not exists liste_ogrenci_id uuid references public.okul_ogrenci_listesi(id) on delete cascade;
alter table public.yazili_soru_sonuclari
  add column if not exists liste_ogrenci_id uuid references public.okul_ogrenci_listesi(id) on delete cascade;

update public.yazili_ogrenci_sonuclari r set liste_ogrenci_id = l.id
from public.okul_ogrenci_listesi l where l.student_id = r.ogrenci_id and r.liste_ogrenci_id is null;
update public.yazili_soru_sonuclari r set liste_ogrenci_id = l.id
from public.okul_ogrenci_listesi l where l.student_id = r.ogrenci_id and r.liste_ogrenci_id is null;

alter table public.yazili_ogrenci_sonuclari alter column liste_ogrenci_id set not null;
alter table public.yazili_soru_sonuclari alter column liste_ogrenci_id set not null;

alter table public.yazili_ogrenci_sonuclari alter column ogrenci_id drop not null;
alter table public.yazili_soru_sonuclari alter column ogrenci_id drop not null;

alter table public.yazili_ogrenci_sonuclari drop constraint if exists yazili_ogrenci_sonuclari_ogrenci_id_fkey;
alter table public.yazili_ogrenci_sonuclari add constraint yazili_ogrenci_sonuclari_ogrenci_id_fkey
  foreign key (ogrenci_id) references public.students(id) on delete set null;
alter table public.yazili_soru_sonuclari drop constraint if exists yazili_soru_sonuclari_ogrenci_id_fkey;
alter table public.yazili_soru_sonuclari add constraint yazili_soru_sonuclari_ogrenci_id_fkey
  foreign key (ogrenci_id) references public.students(id) on delete set null;

alter table public.yazili_soru_sonuclari drop constraint if exists yazili_soru_sonuclari_yazili_sinav_id_ogrenci_id_soru_id_key;
alter table public.yazili_soru_sonuclari add constraint yazili_soru_sonuclari_sinav_liste_soru_key
  unique (yazili_sinav_id, liste_ogrenci_id, soru_id);
alter table public.yazili_ogrenci_sonuclari add constraint yazili_ogrenci_sonuclari_sinav_liste_key
  unique (yazili_sinav_id, liste_ogrenci_id);

-- Kayıt fonksiyonu: öğrenci kimlikleri artık liste satırı; hepsinin bu sınıfta
-- olduğu doğrulanır. İmza (PostgREST parametre adları) değişmedi.
create or replace function public.yazili_sinav_olustur(
  p_sinifid uuid, p_ders text, p_ad text, p_tarih date, p_ogretmenid uuid, p_ogrencier jsonb,
  p_temsiliogrenciids uuid[], p_temsiliogrenciskorlar jsonb, p_maxpuanlar integer[], p_kazanimlar text[], p_sorusonuclari jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sinav_id uuid;
  v_m integer;
begin
  if auth.uid() is null or auth.uid() <> p_ogretmenid then
    raise exception 'Oturum öğretmen kimliğiyle eşleşmiyor';
  end if;
  if array_length(p_maxpuanlar, 1) is distinct from array_length(p_kazanimlar, 1)
     or exists (select 1 from unnest(p_kazanimlar) as k where length(trim(k)) = 0) then
    raise exception 'Her soru için bir kazanım girilmelidir';
  end if;
  if not exists (
    select 1 from public.ogretmen_dersleri
    where teacher_id = p_ogretmenid and class_id = p_sinifid and ders = p_ders
  ) then
    raise exception 'Bu sınıf ve ders için yetkiniz yok';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_ogrencier) e
    where not exists (
      select 1 from public.okul_ogrenci_listesi l
      where l.id = (e->>'id')::uuid and l.class_id = p_sinifid
    )
  ) or exists (
    select 1 from jsonb_array_elements(p_sorusonuclari) ss
    where not exists (select 1 from jsonb_array_elements(p_ogrencier) e where e->>'id' = ss->>'ogrenci_id')
  ) then
    raise exception 'Öğrenci listesi bu sınıfla eşleşmiyor';
  end if;

  insert into public.yazili_sinavlar (class_id, ogretmen_id, ad, tarih, ders)
  values (p_sinifid, p_ogretmenid, p_ad, p_tarih, p_ders)
  returning id into v_sinav_id;

  v_m := array_length(p_maxpuanlar, 1);
  insert into public.yazili_sorular (yazili_sinav_id, sira, max_puan, kazanim)
  select v_sinav_id, sira, p_maxpuanlar[sira], trim(p_kazanimlar[sira])
  from generate_series(1, v_m) as sira;

  insert into public.yazili_ogrenci_sonuclari (yazili_sinav_id, liste_ogrenci_id, ogrenci_id, toplam_puan, temsilci_mi)
  select v_sinav_id, l.id, l.student_id, (e->>'toplamPuan')::integer, l.id = any(p_temsiliogrenciids)
  from jsonb_array_elements(p_ogrencier) as e
  join public.okul_ogrenci_listesi l on l.id = (e->>'id')::uuid;

  insert into public.yazili_soru_sonuclari (yazili_sinav_id, liste_ogrenci_id, ogrenci_id, soru_id, puan, kaynak, estimation_version)
  select v_sinav_id, l.id, l.student_id, s.id, (ss->>'puan')::integer, ss->>'kaynak', ss->>'estimation_version'
  from jsonb_array_elements(p_sorusonuclari) as ss
  join public.okul_ogrenci_listesi l on l.id = (ss->>'ogrenci_id')::uuid
  join public.yazili_sorular s on s.yazili_sinav_id = v_sinav_id and s.sira = (ss->>'sira')::integer;

  return v_sinav_id;
end;
$$;
