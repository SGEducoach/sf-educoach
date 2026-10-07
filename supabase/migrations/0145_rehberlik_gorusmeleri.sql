-- Rehber Radarı Faz 4 — görüşme kaydı (kullanıcı kararı 07.10.2026: önce
-- iptal edildi, sonra "uzun sürmezse uygula" denildi).
--
-- Rehber öğretmenin asıl iş ürünü bu: bireysel görüşme, veli görüşmesi,
-- yönlendirme. Sistemde hiç yoktu; rehber görüşmelerini kâğıtta tutuyordu.
--
-- GİZLİLİK — bu tablonun tek zor yanı. Görüşme içeriği mesleki gizlilik
-- kapsamında; MEB uygulamasında da görüşme kayıtları branş öğretmenine ve
-- serbestçe müdüre açık DEĞİLDİR. Kullanıcı kararı (07.10.2026), dar
-- başlangıç:
--   GÖREBİLEN : o okulun Rehberlik Servisi üyeleri, YALNIZ kendi kademesine
--               atanmış öğrenciler için (rehber_ogrenciyi_gorebilir) + admin
--   GÖREMEYEN : öğrenci, veli, branş öğretmeni, MÜDÜR — hiçbir koşulda
--   DEĞİŞTİREBİLEN: yalnız notu YAZAN rehber (başka rehber okur, düzenlemez)
-- Dar başlayıp gerekirse açmak, geniş başlayıp sızdırmaktan iyidir.
--
-- RLS etkin ve öğrenci/veli/müdür için HİÇBİR politika yok — PostgreSQL'de
-- politikası olmayan rol için erişim varsayılan olarak REDDEDİLİR, yani
-- gizlilik "unutulmuş bir kontrol"e değil varsayılana dayanıyor.

create table if not exists public.rehberlik_gorusmeleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  -- Notu yazan rehber. Hesap silinse bile kayıt kaybolmasın (set null).
  rehber_id uuid references public.profiles(id) on delete set null,
  -- Kapsam kontrolü için kurum kopyası: öğrenci okuldan çıksa da notun
  -- hangi kuruma ait olduğu belli kalır.
  school_id uuid not null references public.schools(id) on delete cascade,

  tarih date not null default current_date,

  -- Görüşme türü. Rehberin yaptığı iş tek çeşit değil ve raporlamada
  -- ayrışması gerekiyor (bireysel görüşme ≠ veli görüşmesi ≠ RAM sevki).
  tur text not null default 'bireysel'
    check (tur in ('bireysel', 'veli', 'yonlendirme', 'diger')),

  -- "not" PostgreSQL'de ayrılmış sözcük — kolon adı `icerik`.
  -- Alt sınır 3: boş/anlamsız kayıt birikmesin. Üst sınır 4000: görüşme
  -- özeti bu kadarla yazılır, daha uzunu dosyaya ait.
  icerik text not null check (char_length(btrim(icerik)) between 3 and 4000),

  created_at timestamptz not null default now()
);

create index if not exists rehberlik_gorusmeleri_student_idx
  on public.rehberlik_gorusmeleri (student_id, tarih desc);
create index if not exists rehberlik_gorusmeleri_school_idx
  on public.rehberlik_gorusmeleri (school_id);

alter table public.rehberlik_gorusmeleri enable row level security;

-- OKUMA: servis üyesi + öğrenci kendi kademesinde + aynı kurum.
-- rehber_ogrenciyi_gorebilir (0144) servis üyesi olmayana TRUE döndüğü için
-- (kalıp: "rehber değilsen serbest geç") okul_rehberi_mi şartı ŞART —
-- yoksa branş öğretmeni de okur.
drop policy if exists "gorusme_rehber_okur" on public.rehberlik_gorusmeleri;
create policy "gorusme_rehber_okur" on public.rehberlik_gorusmeleri
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.okul_rehberi_mi()
      and public.kurum_uyesi_mi(school_id)
      and public.rehber_ogrenciyi_gorebilir(student_id)
    )
  );

-- YAZMA: yalnız kendi adına, kendi kademesindeki öğrenciye.
drop policy if exists "gorusme_rehber_yazar" on public.rehberlik_gorusmeleri;
create policy "gorusme_rehber_yazar" on public.rehberlik_gorusmeleri
  for insert to authenticated
  with check (
    rehber_id = auth.uid()
    and public.okul_rehberi_mi()
    and public.kurum_uyesi_mi(school_id)
    and public.rehber_ogrenciyi_gorebilir(student_id)
  );

-- DÜZELTME ve SİLME: yalnız notu YAZAN rehber. Başka rehber okuyabilir ama
-- bir meslektaşının görüşme kaydını değiştiremez.
drop policy if exists "gorusme_sahibi_duzenler" on public.rehberlik_gorusmeleri;
create policy "gorusme_sahibi_duzenler" on public.rehberlik_gorusmeleri
  for update to authenticated
  using (rehber_id = auth.uid() and public.okul_rehberi_mi())
  with check (rehber_id = auth.uid() and public.okul_rehberi_mi());

drop policy if exists "gorusme_sahibi_siler" on public.rehberlik_gorusmeleri;
create policy "gorusme_sahibi_siler" on public.rehberlik_gorusmeleri
  for delete to authenticated
  using (rehber_id = auth.uid() and public.okul_rehberi_mi());

comment on table public.rehberlik_gorusmeleri is
  'Rehberlik gorusme kayitlari (0145). GIZLI: yalniz o okulun servis uyeleri, kendi kademesindeki ogrenciler icin. Ogrenci/veli/brans ogretmeni/mudur GOREMEZ.';
