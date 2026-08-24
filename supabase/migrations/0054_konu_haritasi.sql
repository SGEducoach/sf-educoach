-- Faz K1 — "Konu bilme/bilmeme göstergesi" (Konu Haritası) veri modeli.
-- Bkz. plan: konu bilme/bilmeme göstergesi — Konu Haritası fazı.
--
-- 1) 2. aşama takip cevabı: KonuCalismaForm'daki "Konuya hakimiyet"
--    (hedefe_yakinlik) seçimine göre sorulan farklı bir takip sorusunun
--    cevap kodu. Nullable — geçmiş kayıtlar etkilenmesin diye NOT NULL
--    yapılmıyor; yeni girişlerde uygulama katmanında (konuCalismaEkle)
--    zorunlu kılınıyor.
alter table public.konu_calismalar add column if not exists takip_cevabi text;

alter table public.konu_calismalar drop constraint if exists konu_calismalar_takip_cevabi_gecerli;
alter table public.konu_calismalar
  add constraint konu_calismalar_takip_cevabi_gecerli check (
    takip_cevabi is null or takip_cevabi in (
      'az_hic', 'az_az', 'az_orta', 'az_yuksek',
      'orta_evet', 'orta_biraz', 'orta_hayir',
      'yeterli_hizli_dogru', 'yeterli_dogru_yavas', 'yeterli_hizli_hata'
    )
  );

comment on column public.konu_calismalar.takip_cevabi is
  '"Konuya hakimiyet" (hedefe_yakinlik) seçimine göre sorulan 2. aşama takip sorusunun cevap kodu.';

-- 2) 9-10. sınıf müfredat üst başlık → alt başlık hiyerarşisi (Faz K4'te
--    kullanılacak — burada sadece veri modeli kuruluyor, içerik boş
--    başlıyor). ust_konu, statik mufredat-konulari.json'daki (ders,konu)
--    çiftine serbest-metin eşleşir (FK değil — konu_anlatimlari'nın
--    konu_calismalar.konu'ya eşleşme deseniyle aynı mantık; JSON
--    kaynaklı statik veri DB'de FK hedefi olamaz).
create table if not exists public.mufredat_alt_konular (
  id uuid primary key default gen_random_uuid(),
  ders text not null,
  ust_konu text not null,
  alt_baslik text not null,
  sira integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists mufredat_alt_konular_ust_idx on public.mufredat_alt_konular (ders, ust_konu);

alter table public.mufredat_alt_konular enable row level security;

drop policy if exists "mufredat_alt_konular_select" on public.mufredat_alt_konular;
create policy "mufredat_alt_konular_select" on public.mufredat_alt_konular
  for select using (true);

drop policy if exists "mufredat_alt_konular_admin_all" on public.mufredat_alt_konular;
create policy "mufredat_alt_konular_admin_all" on public.mufredat_alt_konular
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) Sınıf/kurum bazlı "Konu Haritası" raporu — agrege/isimsiz sonuç
--    döndürdüğü için SECURITY DEFINER; yetki kontrolü fonksiyon içinde
--    yapılıyor (RLS değil): p_class_id verildiyse çağıran o sınıfın
--    sınıf öğretmeni ya da admin olmalı; p_school_id verildiyse çağıran
--    o okulun moderatörü ya da admin olmalı. İkisi de null / ikisi de
--    dolu ise hata. <3 öğrencili konular gizlilik amaçlı satır olarak
--    döndürülmez (tek öğrencinin cevabı ifşa olmasın).
create or replace function public.konu_zayiflik_raporu(p_class_id uuid default null, p_school_id uuid default null)
returns table (
  ders text,
  konu text,
  ogrenci_sayisi bigint,
  uzak_sayisi bigint,
  belirsiz_sayisi bigint,
  yakin_sayisi bigint,
  uzak_orani numeric,
  en_sik_uzak_takip_cevabi text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if (p_class_id is null) = (p_school_id is null) then
    raise exception 'Tam olarak bir kapsam (sınıf veya okul) belirtilmeli.';
  end if;

  if p_class_id is not null then
    if not (
      public.is_admin()
      or exists (select 1 from public.teachers t where t.id = auth.uid() and t.class_id = p_class_id)
    ) then
      raise exception 'Bu sınıfın raporunu görme yetkiniz yok.';
    end if;
  else
    if not (public.is_admin() or public.is_school_moderator(p_school_id)) then
      raise exception 'Bu okulun raporunu görme yetkiniz yok.';
    end if;
  end if;

  return query
  with kapsamdaki_ogrenciler as (
    select s.id from public.students s
    where (p_class_id is not null and s.class_id = p_class_id)
       or (p_school_id is not null and s.school_id = p_school_id)
  ),
  gruplu as (
    select
      k.ders,
      k.konu,
      count(distinct k.student_id) as ogrenci_sayisi,
      count(*) filter (where k.hedefe_yakinlik = 'uzak') as uzak_sayisi,
      count(*) filter (where k.hedefe_yakinlik = 'belirsiz') as belirsiz_sayisi,
      count(*) filter (where k.hedefe_yakinlik = 'yakin') as yakin_sayisi
    from public.konu_calismalar k
    where k.student_id in (select id from kapsamdaki_ogrenciler)
    group by k.ders, k.konu
  ),
  uzak_cevap_sayilari as (
    select k.ders, k.konu, k.takip_cevabi, count(*) as adet
    from public.konu_calismalar k
    where k.student_id in (select id from kapsamdaki_ogrenciler)
      and k.hedefe_yakinlik = 'uzak' and k.takip_cevabi is not null
    group by k.ders, k.konu, k.takip_cevabi
  ),
  uzak_cevap_siralanmis as (
    select ders, konu, takip_cevabi,
           row_number() over (partition by ders, konu order by adet desc) as sira
    from uzak_cevap_sayilari
  )
  select
    g.ders, g.konu, g.ogrenci_sayisi, g.uzak_sayisi, g.belirsiz_sayisi, g.yakin_sayisi,
    round(g.uzak_sayisi::numeric / nullif(g.uzak_sayisi + g.belirsiz_sayisi + g.yakin_sayisi, 0), 2) as uzak_orani,
    u.takip_cevabi as en_sik_uzak_takip_cevabi
  from gruplu g
  left join uzak_cevap_siralanmis u on u.ders = g.ders and u.konu = g.konu and u.sira = 1
  where g.ogrenci_sayisi >= 3
  order by uzak_orani desc nulls last, g.ogrenci_sayisi desc
  limit 30;
end;
$$;

revoke all on function public.konu_zayiflik_raporu(uuid, uuid) from public;
grant execute on function public.konu_zayiflik_raporu(uuid, uuid) to authenticated;
