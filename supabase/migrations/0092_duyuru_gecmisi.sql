alter table public.duyurular
  add column if not exists school_id uuid references public.schools(id) on delete set null,
  add column if not exists gonderen_rol text,
  add column if not exists gonderen_adi text,
  add column if not exists hedef text,
  add column if not exists alici_sayisi integer not null default 0,
  add column if not exists silindi_at timestamptz,
  add column if not exists silen_id uuid references public.profiles(id) on delete set null;

create index if not exists duyurular_school_created_idx on public.duyurular(school_id, created_at desc);
create index if not exists duyurular_silindi_idx on public.duyurular(silindi_at);

-- Eski kayıtların gönderici ad/rol/kurum bilgisini mümkün olduğu kadar tamamla.
update public.duyurular d set
  gonderen_adi = coalesce(d.gonderen_adi, p.ad),
  gonderen_rol = coalesce(d.gonderen_rol, p.role::text),
  school_id = coalesce(d.school_id, t.school_id),
  hedef = coalesce(d.hedef, 'Geçmiş gönderim')
from public.profiles p left join public.teachers t on t.id=p.id
where d.gonderen_id=p.id;

update public.duyurular d
set alici_sayisi = x.sayi
from (
  select duyuru_id, count(*)::integer as sayi
  from public.duyuru_aliciler
  group by duyuru_id
) x
where d.id=x.duyuru_id and d.alici_sayisi=0;

-- Alıcılar, kullanıcı görünümünden kaldırılmış duyuruyu okuyamaz.
drop policy if exists "duyurular_select_alici" on public.duyurular;
create policy "duyurular_select_alici" on public.duyurular for select using (
  silindi_at is null and exists (
    select 1 from public.duyuru_aliciler da
    where da.duyuru_id=duyurular.id and da.profile_id=auth.uid()
  )
);


create or replace function public.duyuru_gonderen_meta_doldur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad text;
  v_rol text;
  v_school_id uuid;
begin
  if new.gonderen_id is not null then
    select p.ad, p.role::text, t.school_id
      into v_ad, v_rol, v_school_id
    from public.profiles p
    left join public.teachers t on t.id=p.id
    where p.id=new.gonderen_id;

    new.gonderen_adi := coalesce(new.gonderen_adi, v_ad);
    new.gonderen_rol := coalesce(new.gonderen_rol, v_rol);
    new.school_id := coalesce(new.school_id, v_school_id);
  end if;
  new.hedef := coalesce(new.hedef, 'Bireysel bildirim');
  return new;
end;
$$;

drop trigger if exists duyuru_gonderen_meta_trigger on public.duyurular;
create trigger duyuru_gonderen_meta_trigger
before insert on public.duyurular
for each row execute function public.duyuru_gonderen_meta_doldur();

create or replace function public.duyuru_alici_meta_guncelle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
begin
  select s.school_id into v_school_id
  from public.students s
  where s.id=new.profile_id;

  if v_school_id is null then
    select s.school_id into v_school_id
    from public.parent_students ps
    join public.students s on s.id=ps.student_id
    where ps.parent_id=new.profile_id
    limit 1;
  end if;

  update public.duyurular d
  set
    alici_sayisi=(select count(*)::integer from public.duyuru_aliciler da where da.duyuru_id=new.duyuru_id),
    school_id=coalesce(d.school_id, v_school_id)
  where d.id=new.duyuru_id;
  return new;
end;
$$;

drop trigger if exists duyuru_alici_meta_trigger on public.duyuru_aliciler;
create trigger duyuru_alici_meta_trigger
after insert on public.duyuru_aliciler
for each row execute function public.duyuru_alici_meta_guncelle();
