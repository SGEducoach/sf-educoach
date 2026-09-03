create table public.etkinlik_gruplari (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teachers(id) on delete cascade,
 school_id uuid not null references public.schools(id) on delete cascade, isim text not null check(char_length(isim) between 2 and 100),
 created_at timestamptz not null default now()
);
create table public.etkinlik_grup_uyeleri (
 group_id uuid not null references public.etkinlik_gruplari(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade, created_at timestamptz not null default now(),
 primary key(group_id,student_id)
);
create table public.etkinlik_calismalari (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.etkinlik_gruplari(id) on delete cascade,
 isim text not null check(char_length(isim) between 2 and 150), tarih date not null, baslangic_saat time not null, bitis_saat time not null,
 created_at timestamptz not null default now(), check(bitis_saat>baslangic_saat)
);
create table public.etkinlik_calisma_atamalari (
 id uuid primary key default gen_random_uuid(), calisma_id uuid not null references public.etkinlik_calismalari(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 durum text not null default 'karar_bekliyor' check(durum in('karar_bekliyor','kabul','reddedildi')),
 cakisiyor boolean not null default false, red_gerekcesi text check(red_gerekcesi is null or char_length(red_gerekcesi) between 3 and 500),
 karar_at timestamptz, created_at timestamptz not null default now(), unique(calisma_id,student_id)
);
create index etkinlik_gruplari_teacher_idx on public.etkinlik_gruplari(teacher_id);
create index etkinlik_atamalari_student_idx on public.etkinlik_calisma_atamalari(student_id,created_at desc);

create or replace function public.etkinlik_grubu_kapsam_kontrolu() returns trigger language plpgsql as $$
begin
 if not exists(
   select 1 from public.teachers t join public.schools s on s.id=t.school_id
   where t.id=new.teacher_id and t.school_id=new.school_id and s.tur='okul'
     and t.brans in ('Beden Eğitimi','Müzik')
 ) then raise exception 'Etkinlik grupları yalnızca okullardaki Beden Eğitimi ve Müzik öğretmenlerine açıktır.'; end if;
 return new;
end $$;
create trigger etkinlik_grubu_kapsam_trg before insert or update on public.etkinlik_gruplari
for each row execute function public.etkinlik_grubu_kapsam_kontrolu();

create or replace function public.etkinlik_uyesi_kurum_kontrolu() returns trigger language plpgsql as $$
begin
 if not exists(
   select 1 from public.etkinlik_gruplari g join public.students s on s.id=new.student_id
   where g.id=new.group_id and g.school_id=s.school_id
 ) then raise exception 'Öğrenci etkinlik grubuyla aynı okula ait olmalıdır.'; end if;
 return new;
end $$;
create trigger etkinlik_uyesi_kurum_trg before insert or update on public.etkinlik_grup_uyeleri
for each row execute function public.etkinlik_uyesi_kurum_kontrolu();
alter table public.etkinlik_gruplari enable row level security;
alter table public.etkinlik_grup_uyeleri enable row level security;
alter table public.etkinlik_calismalari enable row level security;
alter table public.etkinlik_calisma_atamalari enable row level security;
create policy "etkinlik_grup_select" on public.etkinlik_gruplari for select using(teacher_id=auth.uid() or exists(select 1 from public.etkinlik_grup_uyeleri u where u.group_id=id and u.student_id=auth.uid()));
create policy "etkinlik_uye_select" on public.etkinlik_grup_uyeleri for select using(student_id=auth.uid() or exists(select 1 from public.etkinlik_gruplari g where g.id=group_id and g.teacher_id=auth.uid()));
create policy "etkinlik_calisma_select" on public.etkinlik_calismalari for select using(exists(select 1 from public.etkinlik_gruplari g where g.id=group_id and (g.teacher_id=auth.uid() or exists(select 1 from public.etkinlik_grup_uyeleri u where u.group_id=g.id and u.student_id=auth.uid()))));
create policy "etkinlik_atama_select" on public.etkinlik_calisma_atamalari for select using(student_id=auth.uid() or exists(select 1 from public.etkinlik_calismalari c join public.etkinlik_gruplari g on g.id=c.group_id where c.id=calisma_id and g.teacher_id=auth.uid()));
-- Yazma işlemleri sunucu action'larında rol/kurum/üyelik doğrulandıktan sonra service-role ile yapılır.
