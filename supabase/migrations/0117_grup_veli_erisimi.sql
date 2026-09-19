-- Grup Koçluk — Faz 6: veli erişimi (kullanıcı kararı 18.09.2026: "veli
-- olsun", koç onaylar). Veli talebi grup kodu + öğrenci kullanıcı adıyla
-- açılır (sunucu grup kodunu kuruma çevirir; gruplar kurum listelerinde
-- görünmez). Onay yetkisi: grubun koçu (öğretmen + o grubun moderatörü).
-- Okul/dershane akışı değişmez: sınıf öğretmeni onayı aynen sürer.

create or replace function public.veli_talep_onayla(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kod text;
  v_guncellendi uuid;
begin
  if not exists (
    select 1
    from public.veli_link_requests r
    join public.students s on s.id = r.student_id
    join public.teachers t on t.class_id = s.class_id
    where r.id = p_request_id and r.durum = 'bekliyor' and t.id = auth.uid()
  ) and not exists (
    select 1
    from public.veli_link_requests r
    join public.students s on s.id = r.student_id
    join public.schools g on g.id = s.school_id and g.grup_kapasitesi is not null
    join public.teachers t on t.id = auth.uid() and t.school_id = s.school_id
    join public.school_moderators m on m.profile_id = auth.uid() and m.school_id = s.school_id
    where r.id = p_request_id and r.durum = 'bekliyor'
  ) then
    raise exception 'Bu talep bulunamadı, daha önce işlendi veya onaylama yetkiniz yok.';
  end if;

  v_kod := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  update public.veli_link_requests
  set durum = 'onaylandi',
      kod = v_kod,
      onaylayan_ogretmen_id = auth.uid(),
      onaylanma_at = now(),
      kod_expires_at = now() + interval '48 hours'
  where id = p_request_id and durum = 'bekliyor'
  returning id into v_guncellendi;

  if v_guncellendi is null then
    raise exception 'Talep daha önce işlenmiş.';
  end if;

  return v_kod;
end;
$$;

revoke all on function public.veli_talep_onayla(uuid) from public;
grant execute on function public.veli_talep_onayla(uuid) to authenticated;
