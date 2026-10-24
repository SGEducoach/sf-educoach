-- Ön kayıtlı (sisteme üye olmamış) okul öğrencileri (kullanıcı kararı 24.10.2026).
-- Plan: docs/ON_KAYITLI_OGRENCI_UYGULAMA_PLANI.md
--
-- Kimlik olarak okul_ogrenci_listesi satırı kullanılır (sahte hesap açılmaz):
--  1) Deneme sonucu (pdf_deneme_eslesme_bekleyenler) listedeki öğrenciye bağlanır.
--  2) Hesapsız öğrenciye verilen ödev/duyuru, 10 gün boyunca bağ tablolarında
--     bekler (süre VERİLME tarihinden sayılır). Öğrenci 10 gün içinde üye olursa
--     students tetikleyicisi bunları gorev_atamalari / duyuru_aliciler'e açar;
--     süresi dolanlar eklenmez ve günlük temizlikle silinir.
-- Yazma yalnız sunucu (service role) ve tetikleyici; authenticated yazamaz.

-- 1) Bekleyen deneme sonucu ↔ liste öğrencisi
alter table public.pdf_deneme_eslesme_bekleyenler
  add column if not exists liste_ogrenci_id uuid references public.okul_ogrenci_listesi(id) on delete set null;

create index if not exists pdf_eslesme_liste_ogrenci_idx
  on public.pdf_deneme_eslesme_bekleyenler (liste_ogrenci_id)
  where liste_ogrenci_id is not null;

-- Yeni PDF yüklemelerinde yalnız OKUL NUMARASI ile otomatik bağlanır. Ad
-- tek başına kimlik değildir (adaş tuzağı): ad eşleşmesi yönetici onayıyla yapılır.
create or replace function public.pdf_eslesme_listeye_bagla()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.liste_ogrenci_id is null and new.ogrenci_no is not null then
    select id into new.liste_ogrenci_id
    from public.okul_ogrenci_listesi
    where school_id = new.school_id and okul_no = new.ogrenci_no::text;
  end if;
  return new;
exception when others then
  raise warning 'pdf_eslesme_listeye_bagla: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.pdf_eslesme_listeye_bagla() from public, anon, authenticated;

drop trigger if exists pdf_eslesme_listeye_bagla on public.pdf_deneme_eslesme_bekleyenler;
create trigger pdf_eslesme_listeye_bagla
  before insert on public.pdf_deneme_eslesme_bekleyenler
  for each row execute function public.pdf_eslesme_listeye_bagla();

-- Mevcut bekleyenler: yalnız numara eşleşmesi.
update public.pdf_deneme_eslesme_bekleyenler b
set liste_ogrenci_id = l.id
from public.okul_ogrenci_listesi l
where b.durum = 'bekliyor' and b.liste_ogrenci_id is null and b.ogrenci_no is not null
  and l.school_id = b.school_id and l.okul_no = b.ogrenci_no::text;

-- 2) Hesapsız öğrenciye verilen ödev / duyuru (10 gün bekler)
create table if not exists public.bekleyen_gorev_atamalari (
  gorev_id uuid not null references public.gorevler(id) on delete cascade,
  liste_ogrenci_id uuid not null references public.okul_ogrenci_listesi(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gorev_id, liste_ogrenci_id)
);
create index if not exists bekleyen_gorev_atamalari_liste on public.bekleyen_gorev_atamalari (liste_ogrenci_id);

create table if not exists public.bekleyen_duyuru_aliciler (
  duyuru_id uuid not null references public.duyurular(id) on delete cascade,
  liste_ogrenci_id uuid not null references public.okul_ogrenci_listesi(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (duyuru_id, liste_ogrenci_id)
);
create index if not exists bekleyen_duyuru_aliciler_liste on public.bekleyen_duyuru_aliciler (liste_ogrenci_id);

alter table public.bekleyen_gorev_atamalari enable row level security;
alter table public.bekleyen_duyuru_aliciler enable row level security;
revoke all on public.bekleyen_gorev_atamalari from anon;
revoke all on public.bekleyen_duyuru_aliciler from anon;
revoke insert, update, delete, truncate, references, trigger on public.bekleyen_gorev_atamalari from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.bekleyen_duyuru_aliciler from authenticated;

-- Okuma: okul_ogrenci_listesi ile aynı kural (öğrenci adları reşit olmayanlara ait).
create policy "bekleyen_gorev_atamalari_select" on public.bekleyen_gorev_atamalari
  for select using (
    exists (
      select 1 from public.okul_ogrenci_listesi l
      where l.id = bekleyen_gorev_atamalari.liste_ogrenci_id
        and (public.is_admin() or public.is_school_moderator(l.school_id)
             or exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = l.school_id))
    )
  );
create policy "bekleyen_duyuru_aliciler_select" on public.bekleyen_duyuru_aliciler
  for select using (
    exists (
      select 1 from public.okul_ogrenci_listesi l
      where l.id = bekleyen_duyuru_aliciler.liste_ogrenci_id
        and (public.is_admin() or public.is_school_moderator(l.school_id)
             or exists (select 1 from public.teachers t where t.id = auth.uid() and t.school_id = l.school_id))
    )
  );

-- Üyelik anı: süresi dolmamış (verilmesinden ≤ 10 gün) olanlar öğrenciye açılır.
create or replace function public.liste_ogrencisine_bekleyenleri_aktar(p_liste_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.gorev_atamalari (gorev_id, student_id)
  select b.gorev_id, p_student_id
  from public.bekleyen_gorev_atamalari b
  join public.gorevler g on g.id = b.gorev_id
  where b.liste_ogrenci_id = p_liste_id and g.created_at > now() - interval '10 days'
  on conflict (gorev_id, student_id) do nothing;
  delete from public.bekleyen_gorev_atamalari where liste_ogrenci_id = p_liste_id;

  insert into public.duyuru_aliciler (duyuru_id, profile_id)
  select b.duyuru_id, p_student_id
  from public.bekleyen_duyuru_aliciler b
  join public.duyurular d on d.id = b.duyuru_id
  where b.liste_ogrenci_id = p_liste_id and d.silindi_at is null and d.created_at > now() - interval '10 days'
  on conflict (duyuru_id, profile_id) do nothing;
  delete from public.bekleyen_duyuru_aliciler where liste_ogrenci_id = p_liste_id;
end;
$$;

revoke all on function public.liste_ogrencisine_bekleyenleri_aktar(uuid, uuid) from public, anon, authenticated;

-- Günlük temizlik (api/cron/bekleyen-temizle): 10 günü geçen bekleyenleri siler.
create or replace function public.bekleyen_on_kayit_temizle()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gorev integer;
  v_duyuru integer;
begin
  delete from public.bekleyen_gorev_atamalari b
  using public.gorevler g
  where g.id = b.gorev_id and g.created_at <= now() - interval '10 days';
  get diagnostics v_gorev = row_count;

  delete from public.bekleyen_duyuru_aliciler b
  using public.duyurular d
  where d.id = b.duyuru_id and (d.created_at <= now() - interval '10 days' or d.silindi_at is not null);
  get diagnostics v_duyuru = row_count;

  return v_gorev + v_duyuru;
end;
$$;

revoke all on function public.bekleyen_on_kayit_temizle() from public, anon, authenticated;
grant execute on function public.bekleyen_on_kayit_temizle() to service_role;

-- Üyelik tetikleyicisi (0105) bekleyenleri de aktarır. Tetikleyici hatası
-- öğrenci kaydını/güncellemesini hiçbir koşulda düşürmez.
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
    begin
      perform public.liste_ogrencisine_bekleyenleri_aktar(v_id, new.id);
    exception when others then
      raise warning 'liste_ogrencisine_bekleyenleri_aktar: %', sqlerrm;
    end;
  end if;
  return new;
exception when others then
  -- Liste senkronu hiçbir koşulda öğrenci kaydını/güncellemesini düşürmesin.
  raise warning 'okul_ogrenci_listesini_esitle: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.okul_ogrenci_listesini_esitle() from public, anon, authenticated;
