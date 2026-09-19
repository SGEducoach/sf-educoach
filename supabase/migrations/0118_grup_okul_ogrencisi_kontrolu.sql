-- Grup Koçluk — Faz 7: okul öğrencisi gruba eklenemez (kullanıcı kararı
-- 18.09.2026: "okul öğrencisi ücretsiz kullanımın kıymetini bilsin,
-- dershane serbest"). Koç öğrenci eklerken ad; okul hesaplarındaki
-- öğrencilerle ve okulların öğrenci listeleriyle karşılaştırılır. Eşleşirse
-- ekleme durur ve yönetici onayına düşer (aynı ada sahip farklı bir kişi
-- olabilir); yönetici onaylarsa koç o adı ekleyebilir.
--
-- GÜVENLİK: eşleşme detayı (hangi okul) yalnızca yöneticiye gösterilir;
-- tablo ve fonksiyon yalnızca sunucu (service_role) içindir.

-- Ad karşılaştırma anahtarı: Türkçe harfler ve büyük/küçük harf farkı
-- sadeleşir, boşluklar tekleşir ("Ayşe  YILMAZ" = "ayse yilmaz").
create or replace function public.ad_anahtari(p_ad text)
returns text
language sql
immutable
set search_path = public
as $$
  select btrim(regexp_replace(
    lower(translate(coalesce(p_ad, ''), 'İIıŞşĞğÜüÖöÇç', 'iiissgguuoocc')),
    '\s+', ' ', 'g'));
$$;

create or replace function public.okul_ogrencisi_ad_eslesmesi(p_ad text)
returns table (okul text, kaynak text, sayi integer)
language sql
stable
security definer
set search_path = public
as $$
  with anahtar as (select public.ad_anahtari(p_ad) as a),
  eslesmeler as (
    select sc.ad as okul, 'hesap'::text as kaynak
    from public.students s
    join public.profiles p on p.id = s.id
    join public.schools sc on sc.id = s.school_id and sc.tur = 'okul'
    where public.ad_anahtari(p.ad) = (select a from anahtar)
    union all
    select sc.ad, 'liste'
    from public.okul_ogrenci_listesi l
    join public.schools sc on sc.id = l.school_id and sc.tur = 'okul'
    where l.student_id is null and public.ad_anahtari(l.ad_soyad) = (select a from anahtar)
    union all
    select sc.ad, 'resmi liste'
    from public.resmi_ogrenci_listesi r
    join public.schools sc on sc.id = r.school_id and sc.tur = 'okul'
    where public.ad_anahtari(r.ad_soyad) = (select a from anahtar)
  )
  select okul, kaynak, count(*)::integer from eslesmeler group by okul, kaynak;
$$;

revoke all on function public.okul_ogrencisi_ad_eslesmesi(text) from public, anon, authenticated;
grant execute on function public.okul_ogrencisi_ad_eslesmesi(text) to service_role;

create table if not exists public.grup_ogrenci_onaylari (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ad text not null,
  ad_anahtari text not null,
  eslesme text not null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'onaylandi', 'reddedildi')),
  talep_eden_id uuid references public.profiles(id) on delete set null,
  karar_veren_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  karar_at timestamptz,
  unique (school_id, ad_anahtari)
);

alter table public.grup_ogrenci_onaylari enable row level security;
revoke all on public.grup_ogrenci_onaylari from anon, authenticated;
