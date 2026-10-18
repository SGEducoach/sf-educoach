-- Yurt nöbet devri, yurt sorumlusu müdür yardımcısının onayından geçer.
-- Tabloya yalnız sunucu servis rolü erişir; onay fonksiyonu nöbet ve talebi
-- aynı veritabanı işlemi içinde günceller.
create table if not exists public.yurt_nobet_takas_talepleri (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  -- Liste yeniden yüklendiğinde talep geçmişi kaybolmasın; eski görev artık onaylanamaz.
  nobet_id uuid references public.yurt_nobet_gorevleri(id) on delete set null,
  tarih date not null,
  devreden_id uuid not null references public.teachers(id) on delete cascade,
  devreden_adi text not null,
  devralan_id uuid not null references public.teachers(id) on delete cascade,
  devralan_adi text not null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'onaylandi', 'reddedildi')),
  karar_veren_id uuid references public.profiles(id) on delete set null,
  karar_at timestamptz,
  created_at timestamptz not null default now(),
  check (devreden_id <> devralan_id)
);

create unique index if not exists yurt_takas_tek_bekleyen_nobet
  on public.yurt_nobet_takas_talepleri (nobet_id) where durum = 'bekliyor';
create index if not exists yurt_takas_okul_bekleyen
  on public.yurt_nobet_takas_talepleri (school_id, created_at desc) where durum = 'bekliyor';
create index if not exists yurt_takas_devreden
  on public.yurt_nobet_takas_talepleri (devreden_id, created_at desc);

alter table public.yurt_nobet_takas_talepleri enable row level security;
revoke all on public.yurt_nobet_takas_talepleri from anon, authenticated;
grant select, insert, update, delete on public.yurt_nobet_takas_talepleri to service_role;

create or replace function public.yurt_nobet_takas_karari(
  p_talep_id uuid, p_school_id uuid, p_karar_veren_id uuid, p_karar text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_talep public.yurt_nobet_takas_talepleri%rowtype;
  v_nobet public.yurt_nobet_gorevleri%rowtype;
  v_hedef_adi text;
begin
  if p_karar not in ('onaylandi', 'reddedildi') then
    raise exception 'Geçersiz takas kararı.';
  end if;
  if not exists (
    select 1 from public.mudur_yardimcilari my
    join public.teachers t on t.id = my.profile_id and t.school_id = my.school_id
    join public.profiles p on p.id = my.profile_id
    where my.profile_id = p_karar_veren_id and my.school_id = p_school_id
      and my.yurt = true and p.role = 'ogretmen' and p.aktif = true
  ) then
    raise exception 'Yurt sorumlusu yetkisi bulunamadı.';
  end if;

  select * into v_talep from public.yurt_nobet_takas_talepleri
  where id = p_talep_id and school_id = p_school_id for update;
  if not found then raise exception 'Takas talebi bulunamadı.'; end if;
  if v_talep.durum <> 'bekliyor' then raise exception 'Bu talep zaten karara bağlanmış.'; end if;

  if p_karar = 'onaylandi' then
    select * into v_nobet from public.yurt_nobet_gorevleri
    where id = v_talep.nobet_id and school_id = p_school_id for update;
    if not found or v_nobet.teacher_id is distinct from v_talep.devreden_id
      or v_nobet.tarih is distinct from v_talep.tarih then
      raise exception 'Nöbet değişmiş; talep artık onaylanamaz.';
    end if;
    if v_nobet.tarih < (now() at time zone 'Europe/Istanbul')::date then
      raise exception 'Geçmiş nöbet devredilemez.';
    end if;
    select p.ad into v_hedef_adi from public.teachers t
      join public.profiles p on p.id = t.id
      where t.id = v_talep.devralan_id and t.school_id = p_school_id
        and p.role = 'ogretmen' and p.aktif = true;
    if v_hedef_adi is null or btrim(v_hedef_adi) = '' then
      raise exception 'Devralacak aktif öğretmen bulunamadı.';
    end if;
    if exists (
      select 1 from public.yurt_nobet_gorevleri
      where school_id = p_school_id and teacher_id = v_talep.devralan_id
        and tarih = v_talep.tarih and id <> v_talep.nobet_id
    ) then
      raise exception 'Devralacak öğretmenin aynı tarihte zaten yurt nöbeti var.';
    end if;
    update public.yurt_nobet_gorevleri
      set teacher_id = v_talep.devralan_id, ad_soyad = btrim(v_hedef_adi)
      where id = v_talep.nobet_id;
  else
    v_hedef_adi := v_talep.devralan_adi;
  end if;

  update public.yurt_nobet_takas_talepleri
    set durum = p_karar, karar_veren_id = p_karar_veren_id, karar_at = now()
    where id = p_talep_id;
  return jsonb_build_object(
    'tarih', v_talep.tarih, 'devredenId', v_talep.devreden_id,
    'devredenAdi', v_talep.devreden_adi, 'devralanId', v_talep.devralan_id,
    'devralanAdi', v_hedef_adi, 'karar', p_karar
  );
end;
$$;

revoke all on function public.yurt_nobet_takas_karari(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.yurt_nobet_takas_karari(uuid, uuid, uuid, text) to service_role;
