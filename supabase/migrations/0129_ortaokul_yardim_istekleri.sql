-- Ortaokul Paneli — Faz 1: yardım isteği (tasarım belgesi §5.1 madde 7,
-- §22.1 "Öğrenci bir konu için yardım isteği gönderebilir").
--
-- Neden ayrı tablo: istek bir GÖREV değil (öğretmen vermedi, teslim yok,
-- notu yok) ve bir MESAJ değil (site içi yazışma hattı yalnız moderatör ↔
-- admin — bkz. 28.09.2026 kararı). Öğrenciden öğretmene doğru akan, durumu
-- olan kendi başına bir kayıt.
--
-- Paralel model kuralı gereği `ortaokul_` önekli ve ortak tablolara
-- (profiles/classes/gorevler) dokunmuyor.

create table if not exists public.ortaokul_yardim_istekleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,

  -- Müfredat bağı: hangi ders, hangi öğrenme çıktısı. İkisi de silinirse
  -- istek yok olmasın diye `set null`.
  ders_id uuid references public.ortaokul_mufredat_dersleri(id) on delete set null,
  kazanim_id uuid references public.ortaokul_mufredat_kazanimlari(id) on delete set null,

  -- Ders adının kopyası: müfredat sürümü değişip ders_id boşalsa bile
  -- isteğin neyle ilgili olduğu okunabilir kalır.
  ders_adi text not null check (char_length(btrim(ders_adi)) between 2 and 80),

  -- Öğrencinin kendi cümlesi — ZORUNLU DEĞİL. Yazı yazmak zorunda kalan
  -- öğrenci yardım istemekten vazgeçiyor (§2.2 bilişsel yük sınırı); tek
  -- dokunuşla da istek gönderilebilmeli. Üst sınır 500: çocuktan uzun
  -- serbest metin toplamak veri minimizasyonuna aykırı (§17.1).
  mesaj text check (mesaj is null or char_length(btrim(mesaj)) between 1 and 500),

  -- "Birlikte bakalım" akışı: yeni → görüldü → çözüldü. Akademik eksik
  -- olduğu için hiçbir durum "başarısız" değil (§21.2).
  durum text not null default 'yeni' check (durum in ('yeni', 'goruldu', 'cozuldu')),

  -- İsteği üstlenen öğretmen/rehber.
  ilgilenen_id uuid references public.profiles(id) on delete set null,
  gorulme_at timestamptz,
  cozulme_at timestamptz,
  -- Öğretmenin öğrenciye dönüşü: "Güçlü yan / Sonraki adım" kalıbı (§8.4).
  yanit text check (yanit is null or char_length(btrim(yanit)) between 1 and 1000),

  created_at timestamptz not null default now(),

  -- Durum ile zaman damgası birbirini tutsun: "çözüldü" ama çözülme anı boş
  -- olan kayıt öğretmen listesini yanlış sıralar.
  constraint ortaokul_yardim_cozulme_tutarli
    check ((durum = 'cozuldu') = (cozulme_at is not null))
);

-- Aynı ders için ikinci kez istek açılmasın: öğrenci düğmeye iki kez
-- bastığında ya da haftalarca yanıt gelmediğinde liste aynı çocuğun aynı
-- isteğiyle şişiyor. Çözülen istek sayılmaz — sonra tekrar isteyebilir.
create unique index if not exists ortaokul_yardim_tek_acik_istek
  on public.ortaokul_yardim_istekleri (student_id, ders_adi)
  where durum <> 'cozuldu';

create index if not exists ortaokul_yardim_ogrenci_idx
  on public.ortaokul_yardim_istekleri (student_id, created_at desc);

-- Öğretmen ekranı "yeni"leri en eskiden yeniye sıralayacak: en uzun
-- bekleyen çocuk üstte olsun.
create index if not exists ortaokul_yardim_acik_idx
  on public.ortaokul_yardim_istekleri (durum, created_at)
  where durum <> 'cozuldu';

comment on table public.ortaokul_yardim_istekleri is
  'Ortaokul öğrencisinin bir ders/öğrenme çıktısı için açtığı yardım isteği. Veli GÖRMEZ (§13.2 mahremiyet sınırı); kurum öğretmeni/moderatörü görür.';

-- ---------- RLS ----------

alter table public.ortaokul_yardim_istekleri enable row level security;

-- Öğrenci yalnız kendi adına istek açar. student_id'yi başkası yapamaz.
drop policy if exists ortaokul_yardim_ogrenci_ekleme on public.ortaokul_yardim_istekleri;
create policy ortaokul_yardim_ogrenci_ekleme on public.ortaokul_yardim_istekleri
  for insert to authenticated
  with check (student_id = auth.uid() and durum = 'yeni' and cozulme_at is null and yanit is null);

-- Okuma: isteğin sahibi öğrenci + o kurumun öğretmeni/moderatörü + admin.
-- `kurum_ogrencisini_gorebilir` veliyi KAPSAMAZ (ogretmen_okulu() şartı var),
-- bu yüzden veli bu kayıtları hiç görmüyor — kasıtlı.
drop policy if exists ortaokul_yardim_okuma on public.ortaokul_yardim_istekleri;
create policy ortaokul_yardim_okuma on public.ortaokul_yardim_istekleri
  for select to authenticated
  using (student_id = auth.uid() or public.kurum_ogrencisini_gorebilir(student_id));

-- Durumu ve yanıtı YALNIZ kurum tarafı değiştirir. Öğrenci kendi isteğini
-- "çözüldü" işaretleyemez: kapanma kararı yardımı verenin.
drop policy if exists ortaokul_yardim_kurum_guncelleme on public.ortaokul_yardim_istekleri;
create policy ortaokul_yardim_kurum_guncelleme on public.ortaokul_yardim_istekleri
  for update to authenticated
  using (public.kurum_ogrencisini_gorebilir(student_id))
  with check (public.kurum_ogrencisini_gorebilir(student_id));

-- Öğrenci yanlışlıkla açtığı isteği HENÜZ GÖRÜLMEDİYSE geri alabilir.
-- Görüldükten sonra silemez: öğretmen için beliren iş sessizce kaybolmasın.
drop policy if exists ortaokul_yardim_ogrenci_geri_alma on public.ortaokul_yardim_istekleri;
create policy ortaokul_yardim_ogrenci_geri_alma on public.ortaokul_yardim_istekleri
  for delete to authenticated
  using (student_id = auth.uid() and durum = 'yeni');

revoke all on public.ortaokul_yardim_istekleri from anon;
