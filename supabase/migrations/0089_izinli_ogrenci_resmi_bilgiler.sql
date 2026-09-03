-- Aynı ad-soyada sahip farklı öğrenciler olabilir. Eski izinli isim
-- listesinin benzersiz ad kuralını bozmadan, numara bazlı resmî liste tut.
create table if not exists public.resmi_ogrenci_listesi (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad_soyad text not null,
  okul_no text not null check (okul_no ~ '^[0-9]{1,5}$'),
  yurt_ogrencisi boolean not null,
  unique (school_id, okul_no)
);
alter table public.resmi_ogrenci_listesi enable row level security;
drop policy if exists resmi_ogrenci_listesi_admin on public.resmi_ogrenci_listesi;
create policy resmi_ogrenci_listesi_admin on public.resmi_ogrenci_listesi
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 0088'deki Türkçe normalizasyon fonksiyonları gerekir.
-- Tam ad önceliklidir. Kısaltılmış isim ancak soyad + en az bir ad
-- eşleşmesi TEK bir resmî öğrenciye aitse kabul edilir.
create or replace function public.izinli_ogrenci_resmi_kaydi(p_school_id uuid, p_ad text, p_okul_no text default null)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_parcalar text[] := string_to_array(public.ad_esleme_anahtari(p_ad), ' ');
begin
  select array_agg(io.id) into v_ids
  from public.resmi_ogrenci_listesi io
  where io.school_id = p_school_id and io.okul_no is not null
    and public.ad_esleme_anahtari(io.ad_soyad) = public.ad_esleme_anahtari(p_ad);
  if coalesce(cardinality(v_ids), 0) = 0 and cardinality(v_parcalar) >= 2 then
    select array_agg(io.id) into v_ids
    from public.resmi_ogrenci_listesi io
    cross join lateral (select string_to_array(public.ad_esleme_anahtari(io.ad_soyad), ' ') as p) ad
    where io.school_id = p_school_id and io.okul_no is not null
      and cardinality(ad.p) >= 2
      and ad.p[cardinality(ad.p)] = v_parcalar[cardinality(v_parcalar)]
      and ad.p[1:cardinality(ad.p)-1] && v_parcalar[1:cardinality(v_parcalar)-1];
  end if;
  -- Tam adı aynı olan iki kişi yalnızca resmî numaralarıyla ayrılabilir.
  if cardinality(v_ids) > 1 then
    select array_agg(io.id) into v_ids from public.resmi_ogrenci_listesi io
    where io.id = any(v_ids) and io.okul_no = p_okul_no;
    if coalesce(cardinality(v_ids), 0) = 0 then
      raise exception 'Birden fazla öğrenciyle eşleşiyor. Resmî okul numaranızı doğru yazın veya okul yönetimine başvurun.';
    end if;
  end if;
  if cardinality(v_ids) > 1 then
    raise exception 'Birden fazla öğrenciyle eşleşiyor. Lütfen tüm adlarınızı ve soyadınızı yazın; sorun sürerse okul yönetimine başvurun.';
  end if;
  return v_ids[1];
end;
$$;

-- Dışarıya isim/numara sorgulama uç noktası açılmaz.
revoke all on function public.izinli_ogrenci_resmi_kaydi(uuid, text, text) from public, anon, authenticated;

create or replace function public.ogrenci_resmi_bilgilerini_uygula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad text;
  v_resmi_id uuid;
  v_resmi public.resmi_ogrenci_listesi%rowtype;
begin
  if not exists (select 1 from public.resmi_ogrenci_listesi
    where school_id = new.school_id and okul_no is not null) then
    return new;
  end if;

  -- Önceki kayıt trigger'ının seçtiği ad yerine özgün kullanıcı girdisini
  -- kullan: böylece o trigger'daki LIMIT 1 belirsiz bir eşleşmeyi gizleyemez.
  select coalesce(nullif(trim(u.raw_user_meta_data->>'ad'), ''), p.ad) into v_ad
  from public.profiles p join auth.users u on u.id = p.id where p.id = new.id;
  v_resmi_id := public.izinli_ogrenci_resmi_kaydi(new.school_id, v_ad, new.okul_no);
  if v_resmi_id is null then
    -- Yetkili yöneticinin liste dışı manuel öğrenci eklemesi korunur.
    -- Kullanıcının değiştirebildiği admin_ekledi metadata'sına güvenilmez.
    if auth.role() = 'service_role' or public.is_admin() then return new; end if;
    raise exception 'Resmî öğrenci listesinde eşleşme bulunamadı. Adınızı ve soyadınızı kontrol edin veya okul yönetimine başvurun.';
  end if;

  select * into strict v_resmi from public.resmi_ogrenci_listesi where id = v_resmi_id;
  new.okul_no := v_resmi.okul_no;
  new.yurt_ogrencisi := coalesce(v_resmi.yurt_ogrencisi, new.yurt_ogrencisi);
  update public.profiles set ad = public.ad_baslik(v_resmi.ad_soyad) where id = new.id;
  return new;
end;
$$;

revoke all on function public.ogrenci_resmi_bilgilerini_uygula() from public, anon, authenticated;

-- Numara formatı kontrolünden önce resmî numara atanır.
drop trigger if exists a_ogrenci_resmi_bilgilerini_uygula on public.students;
create trigger a_ogrenci_resmi_bilgilerini_uygula
  before insert on public.students
  for each row execute function public.ogrenci_resmi_bilgilerini_uygula();
