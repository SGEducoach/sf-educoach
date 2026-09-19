-- Grup Koçluk — Faz 8: süre dolunca salt okunur (kullanıcı kararı
-- 18.09.2026: "salt okunur iyi, tekrar teşvik eder"). Veriler görünür,
-- yeni kayıt/değişiklik yapılamaz. Uygulama katmanında koç zaten
-- kilitliydi; bu tetikleyici öğrencinin kendi oturumuyla yazdığı ve sunucu
-- (servis anahtarı) üzerinden yazılan kayıtları da veritabanında durdurur.
--
-- Kural:
--   * Platform yöneticisi her zaman yazabilir.
--   * Oturum açmış kullanıcı (öğrenci/koç) süresi dolmuş bir grubun üyesiyse
--     ekleme, güncelleme ve silme reddedilir.
--   * Servis anahtarıyla yazılan satır süresi dolmuş grubun bir üyesine
--     aitse (argümandaki sütun) ekleme/güncelleme reddedilir. Silme
--     serbesttir: hesap silme zinciri (cascade) takılmasın.
-- Grubun bitiş tarihi uzatılınca kilit kendiliğinden kalkar.

create or replace function public.grup_salt_okunur_uye_mi(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_profile_id is not null and (
    exists (select 1 from public.students s where s.id = p_profile_id and public.grup_suresi_doldu(s.school_id))
    or exists (select 1 from public.teachers t where t.id = p_profile_id and public.grup_suresi_doldu(t.school_id))
  );
$$;

revoke all on function public.grup_salt_okunur_uye_mi(uuid) from public, anon, authenticated;
grant execute on function public.grup_salt_okunur_uye_mi(uuid) to service_role;

create or replace function public.grup_salt_okunur_denetle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_satir jsonb;
  v_sahip uuid;
begin
  if public.is_admin() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if auth.uid() is not null then
    if public.grup_salt_okunur_uye_mi(auth.uid()) then
      raise exception 'Grubunun süresi doldu; grup salt okunur. Devam etmek için koçunla ya da SeFu Koç yönetimiyle görüş.'
        using errcode = 'P0001', hint = 'GRUP_SALT_OKUNUR';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  v_satir := to_jsonb(new);
  if tg_argv[0] = 'deneme_id' then
    select d.student_id into v_sahip from public.denemeler d where d.id = nullif(v_satir ->> 'deneme_id', '')::uuid;
  else
    v_sahip := nullif(v_satir ->> tg_argv[0], '')::uuid;
  end if;

  if public.grup_salt_okunur_uye_mi(v_sahip) then
    raise exception 'Grubun süresi doldu; grup salt okunur. Devam etmek için SeFu Koç yönetimiyle görüşün.'
      using errcode = 'P0001', hint = 'GRUP_SALT_OKUNUR';
  end if;
  return new;
end;
$$;

revoke all on function public.grup_salt_okunur_denetle() from public, anon, authenticated;

do $$
declare
  v record;
begin
  for v in
    select * from (values
      ('denemeler', 'student_id'),
      ('deneme_ders_sonuclari', 'deneme_id'),
      ('gorevler', 'olusturan_ogrenci_id'),
      ('gorev_atamalari', 'student_id'),
      ('haftalik_verimlilikler', 'student_id'),
      ('konu_calismalar', 'student_id'),
      ('ogrenci_konu_hakimiyeti', 'student_id'),
      ('soru_cozumleri', 'student_id'),
      ('ogrenci_oto_programlari', 'student_id'),
      ('duyurular', 'gonderen_id'),
      ('veli_link_requests', 'student_id')
    ) as t(tablo, sutun)
  loop
    execute format('drop trigger if exists grup_salt_okunur on public.%I', v.tablo);
    execute format(
      'create trigger grup_salt_okunur before insert or update or delete on public.%I for each row execute function public.grup_salt_okunur_denetle(%L)',
      v.tablo, v.sutun);
  end loop;
end;
$$;
