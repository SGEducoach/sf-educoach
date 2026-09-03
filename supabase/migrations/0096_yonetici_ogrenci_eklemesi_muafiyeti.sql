-- Kullanıcı bulgusu (03.09.2026): "Admin panelinde Öğrenci Ekle kısmında
-- bilgileri girip Öğrenci ekle butonuna bastıktan sonra butonun hemen
-- üzerine kırmızı renkli iki süslü parantez {} çıkıyor ve sistem çalışmıyor."
--
-- KÖK NEDEN (Supabase auth_logs ile doğrulandı):
--   POST /admin/users -> 500 unexpected_failure
--   "Resmî öğrenci listesinde eşleşme bulunamadı..." (SQLSTATE P0001)
-- Migration 0089'daki a_ogrenci_resmi_bilgilerini_uygula trigger'ı, resmî
-- listede eşleşme bulamadığında yalnızca `auth.role() = 'service_role' or
-- public.is_admin()` durumunda muafiyet tanıyor. Ancak hesap açma işi
-- GoTrue'nun KENDİ veritabanı bağlantısında (supabase_auth_admin) yürüyor:
-- orada ne service_role JWT'si ne de auth.uid() var, dolayısıyla iki kontrol
-- de false dönüyor ve YETKİLİ YÖNETİCİNİN eklemesi de reddediliyordu.
-- GoTrue bu tetikleyici hatasını gövdesiz bir 500 olarak döndürdüğü için
-- supabase-js mesajı "{}" oluyor ve ekranda kırmızı "{}" görünüyordu.
--
-- ÇÖZÜM: tek kullanımlık, tahmin edilemez bir yönetici jetonu.
-- raw_user_meta_data'nın kendisi GÜVENİLMEZ (kendi kaydını yapan öğrenci
-- signUp sırasında istediğini yazabilir — 0089'un yorumu bunu doğru tespit
-- etmişti), bu yüzden bayrağın kendisine değil, YALNIZCA service-role'ün
-- yazabildiği bu tabloda karşılığı olan rastgele bir jetona bakılıyor.
-- (app_metadata denendi ve ELENDİ: GoTrue özel app_metadata'yı auth.users
-- satırı eklendikten SONRA yazıyor, trigger anında henüz görünmüyor.)
create table if not exists public.yonetici_ekleme_jetonlari (
  jeton text primary key,
  olusturan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.yonetici_ekleme_jetonlari enable row level security;
-- Bilerek HİÇBİR politika yok: tabloya yalnızca service-role ve
-- SECURITY DEFINER fonksiyonlar erişebilir.

create or replace function public.yonetici_ekleme_jetonu_gecerli(p_jeton text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select true from public.yonetici_ekleme_jetonlari
    where jeton = p_jeton and created_at > now() - interval '15 minutes'
  ), false);
$$;
revoke all on function public.yonetici_ekleme_jetonu_gecerli(text) from public, anon, authenticated;

create or replace function public.ogrenci_resmi_bilgilerini_uygula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad text;
  v_jeton text;
  v_yonetici_ekledi boolean;
  v_resmi_id uuid;
  v_resmi public.resmi_ogrenci_listesi%rowtype;
begin
  if not exists (select 1 from public.resmi_ogrenci_listesi
    where school_id = new.school_id and okul_no is not null) then
    return new;
  end if;

  -- Önceki kayıt trigger'ının seçtiği ad yerine özgün kullanıcı girdisini
  -- kullan: böylece o trigger'daki LIMIT 1 belirsiz bir eşleşmeyi gizleyemez.
  select coalesce(nullif(trim(u.raw_user_meta_data->>'ad'), ''), p.ad),
         u.raw_user_meta_data->>'yonetici_jetonu'
    into v_ad, v_jeton
  from public.profiles p join auth.users u on u.id = p.id where p.id = new.id;

  v_yonetici_ekledi := v_jeton is not null and public.yonetici_ekleme_jetonu_gecerli(v_jeton);

  begin
    v_resmi_id := public.izinli_ogrenci_resmi_kaydi(new.school_id, v_ad, new.okul_no);
  exception when others then
    -- Belirsiz eşleşme ("birden fazla öğrenciyle eşleşiyor") yalnızca
    -- yetkili yönetici eklemesinde yutulur; öğrencinin kendi kaydında
    -- uyarı olduğu gibi yüzeye çıkmaya devam eder.
    if not v_yonetici_ekledi then raise; end if;
    v_resmi_id := null;
  end;

  if v_resmi_id is null then
    -- Yetkili yöneticinin liste dışı manuel öğrenci eklemesi korunur.
    if v_yonetici_ekledi or auth.role() = 'service_role' or public.is_admin() then return new; end if;
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
