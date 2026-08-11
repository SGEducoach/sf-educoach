-- Veli kod taleplerini yalnız sunucu üzerinden kabul eder; onay kodunu
-- kriptografik olarak güçlü üretir, ilk kullanım için 48 saat sınırlar ve
-- kodu öğrencinin uygulama içi mesaj kutusuna güvenli yaşam döngüsüyle yollar.

alter table public.veli_link_requests
  add column if not exists kod_expires_at timestamptz;

alter table public.duyurular
  add column if not exists veli_request_id uuid references public.veli_link_requests(id) on delete cascade;

create unique index if not exists duyurular_veli_request_id_unique
  on public.duyurular (veli_request_id)
  where veli_request_id is not null;

-- Anonim istemci artık öğrenci varlığını sorgulayamaz veya doğrudan talep
-- yazamaz. Talep, doğrulama ve hız sınırı uygulayan /api/veli/talep üzerinden
-- service-role ile oluşturulur.
drop policy if exists "veli_link_requests_insert_public" on public.veli_link_requests;
revoke execute on function public.find_student_id_by_okul_no(uuid, text) from anon, authenticated;

update public.veli_link_requests
set kod_expires_at = coalesce(onaylanma_at, now()) + interval '48 hours'
where durum = 'onaylandi' and kod_expires_at is null;

create or replace function public.veli_talep_mesaji_yonet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duyuru_id uuid;
begin
  if new.durum = 'onaylandi' and old.durum is distinct from 'onaylandi' then
    delete from public.duyurular where veli_request_id = new.id;

    insert into public.duyurular (gonderen_id, baslik, mesaj, veli_request_id)
    values (
      new.onaylayan_ogretmen_id,
      'Veli bağlantı kodu oluşturuldu',
      'Velinizin bağlantı kodu: ' || new.kod || E'\nBu kodu yalnız velinizle kimliğini doğruladıktan sonra paylaşın. Kodun ekran görüntüsünü veya mesajını başkalarına göndermeyin. İlk kayıt 48 saat içinde tamamlanmalıdır.',
      new.id
    )
    returning id into v_duyuru_id;

    insert into public.duyuru_aliciler (duyuru_id, profile_id)
    values (v_duyuru_id, new.student_id);
  elsif new.durum = 'kullanildi' and old.durum is distinct from 'kullanildi' then
    -- Kod artık veli hesabının giriş sırrıdır; öğrencinin kutusunda kalması
    -- gereksiz bir parola ifşası oluşturur.
    delete from public.duyurular where veli_request_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists veli_talep_mesaji_yonet_trg on public.veli_link_requests;
create trigger veli_talep_mesaji_yonet_trg
  after update of durum on public.veli_link_requests
  for each row execute function public.veli_talep_mesaji_yonet();

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
  ) then
    raise exception 'Bu talep bulunamadı, daha önce işlendi veya onaylama yetkiniz yok.';
  end if;

  v_kod := upper(encode(gen_random_bytes(6), 'hex'));

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

create or replace function public.resolve_veli_login(p_school_id uuid, p_okul_no text, p_kod text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select 'veli+' || r.id::text || '@sgeducoach.internal'
  from public.veli_link_requests r
  join public.students s on s.id = r.student_id
  where s.school_id = p_school_id
    and s.okul_no = p_okul_no
    and r.kod = upper(trim(p_kod))
    and (
      (r.durum = 'onaylandi' and r.kod_expires_at > now())
      or r.durum = 'kullanildi'
    )
  limit 1;
$$;

revoke all on function public.resolve_veli_login(uuid, text, text) from public;
grant execute on function public.resolve_veli_login(uuid, text, text) to anon, authenticated;
