-- Admin bir okul için "izinli öğrenci" ad-soyad listesi yükleyebilir
-- (Excel'den kopyala-yapıştır). Liste yüklenmiş bir okulda, self-signup
-- (öğrenci kendi kaydını /signup'tan oluşturması) sırasında girilen ad bu
-- listede yoksa reddedilir — sahte/yanlış kayıtları engellemek için.
-- Liste yüklenmemiş okullarda eski davranış (herkes kayıt olabilir) aynen
-- korunuyor (geriye dönük uyumluluk). Admin'in kendisinin manuel eklediği
-- (veya toplu eklediği) hesaplar bu kontrolden HER ZAMAN muaf — trigger'a
-- 'admin_ekledi' bayrağıyla işaret ediliyor.
--
-- Karşılaştırma tamamen JS tarafında normalize edilmiş (Türkçe locale-aware
-- büyük harf, adNormalize()) değerler arasında yapılıyor — SQL'in kendi
-- upper() fonksiyonu Türkçe İ/ı ayrımını yanlış yaptığı için burada
-- KULLANILMIYOR, ham karşılaştırma yapılıyor (her iki taraf da uygulama
-- katmanında zaten normalize ediliyor).

create table public.izinli_ogrenciler (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad_soyad text not null,
  created_at timestamptz not null default now(),
  unique (school_id, ad_soyad)
);

create index on public.izinli_ogrenciler (school_id);

alter table public.izinli_ogrenciler enable row level security;

create policy "izinli_ogrenciler_select_admin" on public.izinli_ogrenciler
  for select using (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := coalesce(new.raw_user_meta_data->>'role', 'ogrenci')::public.user_role;
  v_request record;
  v_school_id uuid;
  v_ad text;
  v_admin_ekledi boolean := coalesce((new.raw_user_meta_data->>'admin_ekledi')::boolean, false);
begin
  insert into public.profiles (id, ad, email, telefon, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'ad', new.email),
    new.email,
    new.raw_user_meta_data->>'telefon',
    v_role
  );

  if v_role = 'ogrenci' then
    v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;
    v_ad := new.raw_user_meta_data->>'ad';

    if not v_admin_ekledi
       and exists (select 1 from public.izinli_ogrenciler where school_id = v_school_id)
       and not exists (select 1 from public.izinli_ogrenciler where school_id = v_school_id and ad_soyad = v_ad) then
      raise exception 'Bu isim okulun kayıtlı öğrenci listesinde bulunamadı. Lütfen öğretmeninizle/okul yönetimiyle iletişime geçin.';
    end if;

    insert into public.students (id, school_id, class_id, okul_no, ayt_alan, hedef_bolum, veri_giris_sikligi)
    values (
      new.id,
      v_school_id,
      (new.raw_user_meta_data->>'class_id')::uuid,
      new.raw_user_meta_data->>'okul_no',
      (new.raw_user_meta_data->>'ayt_alan')::public.ayt_alan,
      coalesce(new.raw_user_meta_data->>'hedef_bolum', ''),
      coalesce((new.raw_user_meta_data->>'veri_giris_sikligi')::public.veri_giris_sikligi, 'haftalik')
    );
  elsif v_role = 'ogretmen' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (
      new.id,
      (new.raw_user_meta_data->>'school_id')::uuid,
      nullif(new.raw_user_meta_data->>'class_id', '')::uuid,
      coalesce(new.raw_user_meta_data->>'brans', '')
    );
  elsif v_role = 'mudur' then
    insert into public.teachers (id, school_id, class_id, brans)
    values (new.id, (new.raw_user_meta_data->>'school_id')::uuid, null, 'Müdür');
  elsif v_role = 'veli' and new.raw_user_meta_data->>'request_id' is not null then
    select * into v_request
    from public.veli_link_requests
    where id = (new.raw_user_meta_data->>'request_id')::uuid
      and durum = 'onaylandi';

    if found then
      insert into public.parent_students (parent_id, student_id)
      values (new.id, v_request.student_id)
      on conflict do nothing;

      update public.veli_link_requests set durum = 'kullanildi' where id = v_request.id;
    end if;
  end if;

  return new;
end;
$$;
