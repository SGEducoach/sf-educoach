-- Her profil için yönetim ekranlarında kullanılacak kısa ve değişmez kimlik.
-- Auth UUID'si sistem ilişkilerinin asıl anahtarı olarak kalır; bu kod yalnızca
-- aynı adlı hesapları ayırt etmeyi ve güvenli aramayı kolaylaştırır.
create sequence if not exists public.kullanici_kodu_seq as bigint start with 1;

alter table public.profiles
  add column if not exists kullanici_kodu text;

update public.profiles
set kullanici_kodu = 'SFK-' || lpad(nextval('public.kullanici_kodu_seq')::text, 7, '0')
where kullanici_kodu is null;

alter table public.profiles
  alter column kullanici_kodu set default ('SFK-' || lpad(nextval('public.kullanici_kodu_seq')::text, 7, '0')),
  alter column kullanici_kodu set not null;

create unique index if not exists profiles_kullanici_kodu_key
  on public.profiles(kullanici_kodu);

create or replace function public.kullanici_kodu_degistirilemez()
returns trigger
language plpgsql
as $$
begin
  if old.kullanici_kodu is distinct from new.kullanici_kodu then
    raise exception 'Kullanıcı kodu değiştirilemez.';
  end if;
  return new;
end;
$$;

drop trigger if exists kullanici_kodu_degistirme_koruma on public.profiles;
create trigger kullanici_kodu_degistirme_koruma
  before update of kullanici_kodu on public.profiles
  for each row execute function public.kullanici_kodu_degistirilemez();

comment on column public.profiles.kullanici_kodu is
  'Yalnızca yetkili yönetim ekranlarında gösterilen, değişmez ve benzersiz kullanıcı kodu';
