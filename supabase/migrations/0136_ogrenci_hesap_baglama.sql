-- ============================================================
-- Öğrenci hesap bağlama (kullanıcı isteği ve kararları 03.10.2026)
-- NOT: Canlıya 03.10.2026'da SQL Editor'den "0135" adıyla uygulandı; aynı gün
-- başka bir 0135 (kurum_mufredat_alt_konulari) eklendiği için dosya 0136 oldu.
-- ============================================================
-- Sorun: bir öğrencinin hem okulda (lise) hem dershanede hesabı var ve iki
-- tarafa ayrı ayrı veri girmek istemiyor. Her öğrenci hesabı tek bir kuruma
-- bağlı (students.school_id), kurum sınırı RLS'i de buna göre kurulu (0114).
--
-- Kullanıcı kararları:
--   * "Hesap bağlama + otomatik kopya": iki hesap birbirine bağlanır;
--     öğrenci hangisine girerse kayıt veritabanında anında diğerine de
--     yazılır. Kurum sınırı/RLS'e DOKUNULMAZ — her kurum yalnızca kendi
--     kurumundaki hesabı görmeye devam eder.
--   * Bağlamayı öğrenci kendisi yapar: bir hesabında tek kullanımlık kod
--     üretir, diğer hesabına girip kodu yazar ve KVKK veri paylaşım onayını
--     verir.
--   * Yalnızca öğrencinin KENDİ girdiği kayıtlar kopyalanır: konu çalışması,
--     soru çözümü (kaynak='ogrenci') ve deneme (kaynak='ogrenci'). Görev
--     karşılığı kayıtlar (gorev_atama_id dolu), rehber girişleri
--     (giren_rehber_id dolu) ve kurumun yüklediği denemeler (kaynak=
--     'ogretmen') o kurumda kalır.
--
-- Tasarım:
--   * ogrenci_hesap_eslesmeleri: her yön için bir satır (A→B, B→A); PK
--     student_id olduğu için bir hesap en fazla bir hesapla bağlanabilir.
--   * esli_kayit_id: kopyalanan kaydın karşı hesaptaki eşi (iki yönlü).
--     Yönetici bir kaydı düzenler/silerse eşi de güncellenir/silinir.
--   * Döngü koruması: kopyalama sırasında işlem-yerel 'sefu.hesap_senkron'
--     ayarı 'on' yapılır; tetikleyiciler bu ayar açıkken çalışmaz. Ayar
--     yalnızca bu dosyadaki SECURITY DEFINER fonksiyonlarda set ediliyor —
--     PostgREST üzerinden set_config çağrılamaz.
--   * Kopya hiçbir zaman öğrencinin asıl girişini bozmaz: kopyalama bir alt
--     işlemde (exception bloğu) yapılır, hata olursa yalnızca uyarı düşer.
--   * Öğrenci hesabı silinince (cascade) karşı hesaptaki kayıtlar SİLİNMEZ:
--     silme senkronu yalnızca öğrenci satırı hâlâ duruyorsa (tek kaydın
--     doğrudan silinmesi) çalışır.
--   * Bağlantı anında geçmiş kayıtlar da iki yönde aktarılır; iki tarafa
--     da elle girilmiş aynı kayıtlar kopyalanmaz, birbirine eşlenir.

-- ---------- 1) Tablolar ----------

create table if not exists public.ogrenci_hesap_eslesmeleri (
  student_id uuid primary key references public.students(id) on delete cascade,
  es_student_id uuid not null unique references public.students(id) on delete cascade,
  kvkk_onay_at timestamptz not null,
  baglayan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (student_id <> es_student_id)
);
alter table public.ogrenci_hesap_eslesmeleri enable row level security;

drop policy if exists "ogrenci_hesap_eslesmeleri_select_kendi" on public.ogrenci_hesap_eslesmeleri;
create policy "ogrenci_hesap_eslesmeleri_select_kendi" on public.ogrenci_hesap_eslesmeleri
  for select using (student_id = auth.uid() or public.is_admin());

-- Tek kullanımlık bağlama kodları. Politika yok (herkese kapalı); erişim
-- yalnızca aşağıdaki SECURITY DEFINER fonksiyonlarla.
create table if not exists public.ogrenci_baglama_kodlari (
  student_id uuid primary key references public.students(id) on delete cascade,
  kod text not null unique,
  son_gecerlilik timestamptz not null
);
alter table public.ogrenci_baglama_kodlari enable row level security;

alter table public.konu_calismalar add column if not exists esli_kayit_id uuid;
alter table public.soru_cozumleri add column if not exists esli_kayit_id uuid;
alter table public.denemeler add column if not exists esli_kayit_id uuid;

create index if not exists konu_calismalar_esli_kayit_idx on public.konu_calismalar (esli_kayit_id) where esli_kayit_id is not null;
create index if not exists soru_cozumleri_esli_kayit_idx on public.soru_cozumleri (esli_kayit_id) where esli_kayit_id is not null;
create index if not exists denemeler_esli_kayit_idx on public.denemeler (esli_kayit_id) where esli_kayit_id is not null;

comment on column public.konu_calismalar.esli_kayit_id is 'Bağlı öğrenci hesabındaki eş kayıt (0136). Kopya ve asıl kayıt birbirini gösterir.';
comment on column public.soru_cozumleri.esli_kayit_id is 'Bağlı öğrenci hesabındaki eş kayıt (0136).';
comment on column public.denemeler.esli_kayit_id is 'Bağlı öğrenci hesabındaki eş kayıt (0136).';

-- ---------- 2) Yardımcılar ----------

create or replace function public.hesap_senkron_aktif()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('sefu.hesap_senkron', true), '') = 'on';
$$;

-- Kopyanın yazılacağı hesap: bağlı hesap varsa, aktifse ve salt okunur
-- (süresi dolmuş) bir grupta değilse.
create or replace function public.hesap_senkron_hedefi(p_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.es_student_id
  from public.ogrenci_hesap_eslesmeleri e
  join public.profiles p on p.id = e.es_student_id
  where e.student_id = p_student_id
    and p.aktif
    and not public.grup_salt_okunur_uye_mi(e.es_student_id);
$$;
revoke all on function public.hesap_senkron_hedefi(uuid) from public, anon, authenticated;

-- Geçmiş tarih sınırı: senkron kopyalarında atlanır (kopya, sınırdan geçmiş
-- bir kaydın aynısı; bağlantı anındaki geçmiş aktarımı ise eski tarihli
-- kayıtları taşır). Gövde 0122'deki ile aynı, yalnızca ilk satır eklendi.
create or replace function public.gecmis_tarih_sinir_kontrol()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sinir_gun integer := TG_ARGV[0]::integer;
begin
  if public.hesap_senkron_aktif() then
    return new;
  end if;

  if new.giren_rehber_id is not null then
    if auth.uid() is not null then
      raise exception 'Rehber girişi yalnızca rehberlik servisi ekranından yapılabilir.';
    end if;
    v_sinir_gun := 30;
  elsif new.gorev_atama_id is not null and exists (
    select 1 from public.gorev_atamalari a
    where a.id = new.gorev_atama_id and a.student_id = new.student_id
  ) then
    v_sinir_gun := greatest(v_sinir_gun, 5);
  end if;

  if new.tarih < current_date - v_sinir_gun then
    raise exception 'En fazla % gün geriye dönük giriş yapılabilir.', v_sinir_gun;
  end if;
  return new;
end;
$$;

-- ---------- 3) Tek kayıt eşleme (canlı kopya ve geçmiş aktarımı ortak) ----------
-- Kaynak kaydı hedef hesaba taşır: hedefte aynı kayıt (elle iki tarafa da
-- girilmiş) eşsiz duruyorsa yeni kopya açmaz, ikisini eşler. Dönen değer:
-- 'kopya', 'eslendi' ya da 'atlandi'. Çağıran 'sefu.hesap_senkron'u açmış
-- olmalı.

create or replace function public.konu_calismasini_tasi(p_id uuid, p_hedef uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.konu_calismalar;
  v_es uuid;
begin
  select * into k from public.konu_calismalar where id = p_id;
  if not found or k.esli_kayit_id is not null then return 'atlandi'; end if;

  select id into v_es from public.konu_calismalar
  where student_id = p_hedef and esli_kayit_id is null
    and tarih = k.tarih and ders = k.ders and konu = k.konu and sure_dakika = k.sure_dakika
    and gorev_atama_id is null and giren_rehber_id is null
  order by created_at limit 1;

  if v_es is not null then
    update public.konu_calismalar set esli_kayit_id = p_id where id = v_es;
    update public.konu_calismalar set esli_kayit_id = v_es where id = p_id;
    return 'eslendi';
  end if;

  insert into public.konu_calismalar
    (student_id, tarih, ders, konu, sure_dakika, hedefe_yakinlik, yayinevi, takip_cevabi, created_at, esli_kayit_id)
  values
    (p_hedef, k.tarih, k.ders, k.konu, k.sure_dakika, k.hedefe_yakinlik, k.yayinevi, k.takip_cevabi, k.created_at, p_id)
  returning id into v_es;
  update public.konu_calismalar set esli_kayit_id = v_es where id = p_id;
  return 'kopya';
end;
$$;

create or replace function public.soru_cozumunu_tasi(p_id uuid, p_hedef uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.soru_cozumleri;
  v_es uuid;
begin
  select * into s from public.soru_cozumleri where id = p_id;
  if not found or s.esli_kayit_id is not null then return 'atlandi'; end if;

  select id into v_es from public.soru_cozumleri
  where student_id = p_hedef and esli_kayit_id is null
    and tarih = s.tarih and ders = s.ders and dogru = s.dogru and yanlis = s.yanlis and bos = s.bos
    and kaynak = 'ogrenci' and gorev_atama_id is null and giren_rehber_id is null
  order by created_at limit 1;

  if v_es is not null then
    update public.soru_cozumleri set esli_kayit_id = p_id where id = v_es;
    update public.soru_cozumleri set esli_kayit_id = v_es where id = p_id;
    return 'eslendi';
  end if;

  -- Öğretmen "Gördüm" onayı kuruma özel: kopyaya taşınmaz.
  insert into public.soru_cozumleri
    (student_id, tarih, ders, dogru, yanlis, bos, sure_dakika, konu, yayinevi, kaynak, created_at, esli_kayit_id)
  values
    (p_hedef, s.tarih, s.ders, s.dogru, s.yanlis, s.bos, s.sure_dakika, s.konu, s.yayinevi, 'ogrenci', s.created_at, p_id)
  returning id into v_es;
  update public.soru_cozumleri set esli_kayit_id = v_es where id = p_id;
  return 'kopya';
end;
$$;

create or replace function public.denemeyi_tasi(p_id uuid, p_hedef uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.denemeler;
  v_es uuid;
begin
  select * into d from public.denemeler where id = p_id;
  if not found or d.esli_kayit_id is not null then return 'atlandi'; end if;

  -- Hedef kurum bu tarih+tür için sonuçları zaten yüklediyse (kaynak=
  -- 'ogretmen') öğrencinin girişi oraya taşınmaz — uygulamadaki "okul
  -- yüklediyse tekrar giremezsin" kuralıyla aynı (veri-actions.ts denemeEkle).
  if exists (
    select 1 from public.denemeler
    where student_id = p_hedef and tarih = d.tarih and tur = d.tur and kaynak = 'ogretmen'
  ) then
    return 'atlandi';
  end if;

  select id into v_es from public.denemeler
  where student_id = p_hedef and esli_kayit_id is null
    and tarih = d.tarih and tur = d.tur and kaynak = 'ogrenci'
    and gorev_atama_id is null and giren_rehber_id is null
  order by created_at limit 1;

  if v_es is not null then
    update public.denemeler set esli_kayit_id = p_id where id = v_es;
    update public.denemeler set esli_kayit_id = v_es where id = p_id;
    return 'eslendi';
  end if;

  insert into public.denemeler
    (student_id, tarih, tur, sure_dakika, hedefe_yakinlik, yayinevi, kaynak, zorluk, created_at, esli_kayit_id)
  values
    (p_hedef, d.tarih, d.tur, d.sure_dakika, d.hedefe_yakinlik, d.yayinevi, 'ogrenci', d.zorluk, d.created_at, p_id)
  returning id into v_es;
  update public.denemeler set esli_kayit_id = v_es where id = p_id;

  -- Ders sonuçları (geçmiş aktarımında hazır; canlı girişte deneme önce,
  -- sonuçlar sonra geldiği için burada boştur ve aşağıdaki tetikleyici taşır).
  insert into public.deneme_ders_sonuclari (deneme_id, ders, dogru, yanlis)
  select v_es, r.ders, r.dogru, r.yanlis from public.deneme_ders_sonuclari r where r.deneme_id = p_id
  on conflict (deneme_id, ders) do nothing;
  return 'kopya';
end;
$$;

revoke all on function public.konu_calismasini_tasi(uuid, uuid) from public, anon, authenticated;
revoke all on function public.soru_cozumunu_tasi(uuid, uuid) from public, anon, authenticated;
revoke all on function public.denemeyi_tasi(uuid, uuid) from public, anon, authenticated;

-- ---------- 4) Canlı kopya tetikleyicileri (AFTER INSERT) ----------

create or replace function public.hesap_senkron_ekle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hedef uuid;
  v_kaynak text := coalesce(to_jsonb(new) ->> 'kaynak', 'ogrenci');
begin
  if public.hesap_senkron_aktif()
     or new.esli_kayit_id is not null
     or new.gorev_atama_id is not null
     or new.giren_rehber_id is not null
     or v_kaynak <> 'ogrenci' then
    return null;
  end if;

  v_hedef := public.hesap_senkron_hedefi(new.student_id);
  if v_hedef is null then return null; end if;

  begin
    perform set_config('sefu.hesap_senkron', 'on', true);
    if tg_table_name = 'konu_calismalar' then
      perform public.konu_calismasini_tasi(new.id, v_hedef);
    elsif tg_table_name = 'soru_cozumleri' then
      perform public.soru_cozumunu_tasi(new.id, v_hedef);
    else
      perform public.denemeyi_tasi(new.id, v_hedef);
    end if;
    perform set_config('sefu.hesap_senkron', 'off', true);
  exception when others then
    -- Asıl giriş her durumda kaydedilir; kopya hatası yalnızca loga düşer.
    perform set_config('sefu.hesap_senkron', 'off', true);
    raise warning 'hesap senkronu (% %): %', tg_table_name, new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function public.hesap_senkron_ekle() from public, anon, authenticated;

drop trigger if exists konu_calismalar_hesap_senkron_ekle on public.konu_calismalar;
create trigger konu_calismalar_hesap_senkron_ekle
  after insert on public.konu_calismalar
  for each row execute function public.hesap_senkron_ekle();

drop trigger if exists soru_cozumleri_hesap_senkron_ekle on public.soru_cozumleri;
create trigger soru_cozumleri_hesap_senkron_ekle
  after insert on public.soru_cozumleri
  for each row execute function public.hesap_senkron_ekle();

drop trigger if exists denemeler_hesap_senkron_ekle on public.denemeler;
create trigger denemeler_hesap_senkron_ekle
  after insert on public.denemeler
  for each row execute function public.hesap_senkron_ekle();

-- ---------- 5) Düzenleme ve silme senkronu ----------
-- Öğrenci kendi kaydını düzenleyemez/silemez (RLS'te yalnızca insert var);
-- bunlar yönetici düzeltmeleri. Eşi de aynı şekilde düzeltilir.

create or replace function public.hesap_senkron_guncelle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.hesap_senkron_aktif() or new.esli_kayit_id is null then
    return null;
  end if;

  begin
    perform set_config('sefu.hesap_senkron', 'on', true);
    if tg_table_name = 'konu_calismalar' then
      if (new.tarih, new.ders, new.konu, new.sure_dakika, new.hedefe_yakinlik, new.yayinevi, new.takip_cevabi)
         is distinct from (old.tarih, old.ders, old.konu, old.sure_dakika, old.hedefe_yakinlik, old.yayinevi, old.takip_cevabi) then
        update public.konu_calismalar
        set tarih = new.tarih, ders = new.ders, konu = new.konu, sure_dakika = new.sure_dakika,
            hedefe_yakinlik = new.hedefe_yakinlik, yayinevi = new.yayinevi, takip_cevabi = new.takip_cevabi
        where id = new.esli_kayit_id;
      end if;
    elsif tg_table_name = 'soru_cozumleri' then
      -- Yalnızca veri alanları; öğretmen onayı kuruma özel kalır.
      if (new.tarih, new.ders, new.dogru, new.yanlis, new.bos, new.sure_dakika, new.konu, new.yayinevi)
         is distinct from (old.tarih, old.ders, old.dogru, old.yanlis, old.bos, old.sure_dakika, old.konu, old.yayinevi) then
        update public.soru_cozumleri
        set tarih = new.tarih, ders = new.ders, dogru = new.dogru, yanlis = new.yanlis, bos = new.bos,
            sure_dakika = new.sure_dakika, konu = new.konu, yayinevi = new.yayinevi
        where id = new.esli_kayit_id;
      end if;
    elsif new.kaynak <> 'ogrenci' then
      -- Kurum PDF'i öğrencinin girişini devraldı (deneme-sonucu-kaydet.ts,
      -- kaynak 'ogrenci' → 'ogretmen'): kayıt artık kurumun; eşleşme çözülür,
      -- karşı hesaptaki öğrenci girişi olduğu gibi kalır.
      update public.denemeler set esli_kayit_id = null where id in (new.id, new.esli_kayit_id);
    else
      if (new.tarih, new.tur, new.sure_dakika, new.hedefe_yakinlik, new.yayinevi, new.zorluk)
         is distinct from (old.tarih, old.tur, old.sure_dakika, old.hedefe_yakinlik, old.yayinevi, old.zorluk) then
        update public.denemeler
        set tarih = new.tarih, tur = new.tur, sure_dakika = new.sure_dakika,
            hedefe_yakinlik = new.hedefe_yakinlik, yayinevi = new.yayinevi, zorluk = new.zorluk
        where id = new.esli_kayit_id;
      end if;
    end if;
    perform set_config('sefu.hesap_senkron', 'off', true);
  exception when others then
    perform set_config('sefu.hesap_senkron', 'off', true);
    raise warning 'hesap senkronu güncelleme (% %): %', tg_table_name, new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function public.hesap_senkron_guncelle() from public, anon, authenticated;

create or replace function public.hesap_senkron_sil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Öğrenci satırı artık yoksa silme, hesabın silinmesinden (cascade)
  -- geliyor — karşı kurumdaki kayıtlar korunur. (pg_trigger_depth() bunu
  -- ayırt edemiyor: AFTER tetikleyicileri ifade sonunda üst seviyede çalışır.)
  if public.hesap_senkron_aktif() or old.esli_kayit_id is null
     or not exists (select 1 from public.students where id = old.student_id) then
    return null;
  end if;

  perform set_config('sefu.hesap_senkron', 'on', true);
  execute format('delete from public.%I where id = $1', tg_table_name) using old.esli_kayit_id;
  perform set_config('sefu.hesap_senkron', 'off', true);
  return null;
end;
$$;
revoke all on function public.hesap_senkron_sil() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['konu_calismalar', 'soru_cozumleri', 'denemeler'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_hesap_senkron_guncelle', t);
    execute format('create trigger %I after update on public.%I for each row execute function public.hesap_senkron_guncelle()',
      t || '_hesap_senkron_guncelle', t);
    execute format('drop trigger if exists %I on public.%I', t || '_hesap_senkron_sil', t);
    execute format('create trigger %I after delete on public.%I for each row execute function public.hesap_senkron_sil()',
      t || '_hesap_senkron_sil', t);
  end loop;
end;
$$;

-- ---------- 6) Deneme ders sonuçları ----------
-- Öğrenci denemeyi ve ders sonuçlarını ayrı ifadelerle ekliyor (veri-
-- actions.ts denemeEkle); sonuçlar, eşi olan denemenin eşine yansıtılır.

create or replace function public.hesap_senkron_deneme_sonucu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_es_deneme uuid;
  v_ders text := case when tg_op = 'DELETE' then old.ders else new.ders end;
begin
  if public.hesap_senkron_aktif() then
    return null;
  end if;

  -- Deneme silindiği için (cascade) giden sonuçlarda aşağıdaki sorgu boş
  -- döner ve hiçbir şey yapılmaz; denemenin eşi deneme seviyesinde silinir.
  select esli_kayit_id into v_es_deneme from public.denemeler
  where id = case when tg_op = 'DELETE' then old.deneme_id else new.deneme_id end
    and kaynak = 'ogrenci';
  if v_es_deneme is null then return null; end if;

  begin
    perform set_config('sefu.hesap_senkron', 'on', true);
    if tg_op = 'DELETE' then
      delete from public.deneme_ders_sonuclari where deneme_id = v_es_deneme and ders = v_ders;
    else
      if tg_op = 'UPDATE' and old.ders <> new.ders then
        delete from public.deneme_ders_sonuclari where deneme_id = v_es_deneme and ders = old.ders;
      end if;
      insert into public.deneme_ders_sonuclari (deneme_id, ders, dogru, yanlis)
      values (v_es_deneme, new.ders, new.dogru, new.yanlis)
      on conflict (deneme_id, ders) do update set dogru = excluded.dogru, yanlis = excluded.yanlis;
    end if;
    perform set_config('sefu.hesap_senkron', 'off', true);
  exception when others then
    perform set_config('sefu.hesap_senkron', 'off', true);
    raise warning 'hesap senkronu deneme sonucu: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function public.hesap_senkron_deneme_sonucu() from public, anon, authenticated;

drop trigger if exists deneme_ders_sonuclari_hesap_senkron on public.deneme_ders_sonuclari;
create trigger deneme_ders_sonuclari_hesap_senkron
  after insert or update or delete on public.deneme_ders_sonuclari
  for each row execute function public.hesap_senkron_deneme_sonucu();

-- ---------- 7) Geçmiş aktarımı ----------

create or replace function public.ogrenci_gecmisini_aktar(p_kaynak uuid, p_hedef uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_sonuc text;
  v_kopya integer := 0;
  v_eslenen integer := 0;
  v_atlanan integer := 0;
begin
  perform set_config('sefu.hesap_senkron', 'on', true);

  for r in
    select 'konu' as tur, id, created_at from public.konu_calismalar
      where student_id = p_kaynak and esli_kayit_id is null and gorev_atama_id is null and giren_rehber_id is null
    union all
    select 'soru', id, created_at from public.soru_cozumleri
      where student_id = p_kaynak and esli_kayit_id is null and kaynak = 'ogrenci'
        and gorev_atama_id is null and giren_rehber_id is null
    union all
    select 'deneme', id, created_at from public.denemeler
      where student_id = p_kaynak and esli_kayit_id is null and kaynak = 'ogrenci'
        and gorev_atama_id is null and giren_rehber_id is null
    order by created_at
  loop
    begin
      v_sonuc := case r.tur
        when 'konu' then public.konu_calismasini_tasi(r.id, p_hedef)
        when 'soru' then public.soru_cozumunu_tasi(r.id, p_hedef)
        else public.denemeyi_tasi(r.id, p_hedef)
      end;
    exception when others then
      -- Eski bir kayıt sonradan eklenen bir kısıtı (ör. süre üst sınırı)
      -- ihlal ediyorsa yalnızca o kayıt atlanır.
      v_sonuc := 'atlandi';
    end;
    if v_sonuc = 'kopya' then v_kopya := v_kopya + 1;
    elsif v_sonuc = 'eslendi' then v_eslenen := v_eslenen + 1;
    else v_atlanan := v_atlanan + 1;
    end if;
  end loop;

  perform set_config('sefu.hesap_senkron', 'off', true);
  return jsonb_build_object('kopyalanan', v_kopya, 'eslenen', v_eslenen, 'atlanan', v_atlanan);
end;
$$;
revoke all on function public.ogrenci_gecmisini_aktar(uuid, uuid) from public, anon, authenticated;

-- ---------- 8) Öğrencinin çağırdığı fonksiyonlar ----------

-- Bağlama kodu üretir (15 dk geçerli, tek kullanımlık). Karışabilecek
-- karakterler (0/O, 1/I/L) alfabede yok.
create or replace function public.hesap_baglama_kodu_olustur()
returns table (kod text, son_gecerlilik timestamptz)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_alfabe constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_kod text;
  v_son timestamptz := now() + interval '15 minutes';
begin
  if v_uid is null or not exists (select 1 from public.students where id = v_uid) then
    raise exception 'Bu işlem yalnızca öğrenci hesapları içindir.';
  end if;
  if exists (select 1 from public.ogrenci_hesap_eslesmeleri where student_id = v_uid) then
    raise exception 'Bu hesap zaten başka bir hesaba bağlı.';
  end if;

  loop
    v_bytes := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
    v_kod := '';
    for i in 0..7 loop
      v_kod := v_kod || substr(v_alfabe, 1 + get_byte(v_bytes, i) % length(v_alfabe), 1);
    end loop;
    v_kod := substr(v_kod, 1, 4) || '-' || substr(v_kod, 5, 4);
    exit when not exists (select 1 from public.ogrenci_baglama_kodlari b where b.kod = v_kod);
  end loop;

  insert into public.ogrenci_baglama_kodlari (student_id, kod, son_gecerlilik)
  values (v_uid, v_kod, v_son)
  on conflict (student_id) do update set kod = excluded.kod, son_gecerlilik = excluded.son_gecerlilik;

  return query select v_kod, v_son;
end;
$$;
revoke all on function public.hesap_baglama_kodu_olustur() from public, anon;
grant execute on function public.hesap_baglama_kodu_olustur() to authenticated;

-- Kodu girerek bağlar ve geçmiş kayıtları iki yönde aktarır.
create or replace function public.hesap_bagla(p_kod text, p_kvkk_onay boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kod text := upper(regexp_replace(coalesce(p_kod, ''), '[^A-Za-z0-9]', '', 'g'));
  v_es uuid;
  v_benim_okul uuid;
  v_es_okul uuid;
  v_es_kurum text;
  v_buraya jsonb;
  v_oraya jsonb;
begin
  if v_uid is null or not exists (select 1 from public.students where id = v_uid) then
    raise exception 'Bu işlem yalnızca öğrenci hesapları içindir.';
  end if;
  if not coalesce(p_kvkk_onay, false) then
    raise exception 'Bağlamak için iki kurum arasında veri paylaşımına onay vermelisin.';
  end if;
  if length(v_kod) <> 8 then
    raise exception 'Kod 8 karakter olmalı (ör. ABCD-1234).';
  end if;
  v_kod := substr(v_kod, 1, 4) || '-' || substr(v_kod, 5, 4);

  delete from public.ogrenci_baglama_kodlari b
  where b.kod = v_kod and b.son_gecerlilik > now()
  returning b.student_id into v_es;

  if v_es is null then
    raise exception 'Kod geçersiz ya da süresi dolmuş. Diğer hesabından yeni bir kod üret.';
  end if;
  if v_es = v_uid then
    raise exception 'Kodu, kodu ürettiğin hesaptan farklı olan diğer hesabına girmelisin.';
  end if;
  if exists (select 1 from public.ogrenci_hesap_eslesmeleri where student_id in (v_uid, v_es)) then
    raise exception 'Hesaplardan biri zaten başka bir hesaba bağlı.';
  end if;

  select school_id into v_benim_okul from public.students where id = v_uid;
  select s.school_id, sc.ad into v_es_okul, v_es_kurum
  from public.students s join public.schools sc on sc.id = s.school_id where s.id = v_es;
  if v_benim_okul = v_es_okul then
    raise exception 'İki hesap aynı kurumda; bağlama yalnızca farklı kurumlardaki hesaplar içindir.';
  end if;

  -- Başka bir öğrencinin hesabıyla veri karışmasın: iki hesabın adı aynı
  -- olmalı (Türkçe harf / büyük-küçük harf / boşluk farkı önemsiz).
  if (select public.ad_anahtari(ad) from public.profiles where id = v_uid)
     is distinct from (select public.ad_anahtari(ad) from public.profiles where id = v_es) then
    raise exception 'İki hesaptaki ad soyad aynı değil. Kurum yöneticinden adını düzelttirip tekrar dene.';
  end if;

  if not (select aktif from public.profiles where id = v_es)
     or public.grup_salt_okunur_uye_mi(v_uid) or public.grup_salt_okunur_uye_mi(v_es) then
    raise exception 'Hesaplardan biri şu an veri girişine kapalı; bağlanamaz.';
  end if;

  insert into public.ogrenci_hesap_eslesmeleri (student_id, es_student_id, kvkk_onay_at, baglayan_id)
  values (v_uid, v_es, now(), v_uid), (v_es, v_uid, now(), v_uid);

  v_oraya := public.ogrenci_gecmisini_aktar(v_uid, v_es);
  v_buraya := public.ogrenci_gecmisini_aktar(v_es, v_uid);

  insert into public.admin_audit_log (actor_id, eylem, detay)
  values (v_uid, 'ogrenci_hesap_baglandi',
    jsonb_build_object('es_student_id', v_es, 'buraya', v_buraya, 'oraya', v_oraya));

  return jsonb_build_object('es_kurum', v_es_kurum, 'buraya', v_buraya, 'oraya', v_oraya);
end;
$$;
revoke all on function public.hesap_bagla(text, boolean) from public, anon;
grant execute on function public.hesap_bagla(text, boolean) to authenticated;

create or replace function public.hesap_baglantim()
returns table (es_kurum text, es_kurum_turu text, baglanti_tarihi timestamptz, bekleyen_kod text, kod_son_gecerlilik timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select sc.ad, sc.tur::text, e.created_at, b.kod, b.son_gecerlilik
  from (select auth.uid() as uid) u
  left join public.ogrenci_hesap_eslesmeleri e on e.student_id = u.uid
  left join public.students s on s.id = e.es_student_id
  left join public.schools sc on sc.id = s.school_id
  left join public.ogrenci_baglama_kodlari b on b.student_id = u.uid and b.son_gecerlilik > now()
  where u.uid is not null;
$$;
revoke all on function public.hesap_baglantim() from public, anon;
grant execute on function public.hesap_baglantim() to authenticated;

-- Bağlantıyı koparır. Aktarılmış kayıtlar iki kurumda da kalır, yalnızca
-- birbirleriyle eşleri çözülür (bundan sonra senkron olmaz).
create or replace function public.hesap_baglantisini_kopar()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_es uuid;
begin
  select es_student_id into v_es from public.ogrenci_hesap_eslesmeleri where student_id = v_uid;
  if v_es is null then
    raise exception 'Bağlı bir hesabın yok.';
  end if;

  perform set_config('sefu.hesap_senkron', 'on', true);
  update public.konu_calismalar set esli_kayit_id = null where student_id in (v_uid, v_es) and esli_kayit_id is not null;
  update public.soru_cozumleri set esli_kayit_id = null where student_id in (v_uid, v_es) and esli_kayit_id is not null;
  update public.denemeler set esli_kayit_id = null where student_id in (v_uid, v_es) and esli_kayit_id is not null;
  perform set_config('sefu.hesap_senkron', 'off', true);

  delete from public.ogrenci_hesap_eslesmeleri where student_id in (v_uid, v_es);

  insert into public.admin_audit_log (actor_id, eylem, detay)
  values (v_uid, 'ogrenci_hesap_baglantisi_koparildi', jsonb_build_object('es_student_id', v_es));
end;
$$;
revoke all on function public.hesap_baglantisini_kopar() from public, anon;
grant execute on function public.hesap_baglantisini_kopar() to authenticated;
