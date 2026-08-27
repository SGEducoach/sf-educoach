-- Ana Sayfa (yeni "/" tasarımı) — admin panelinden yönetilen metin/slider
-- ayarları (27.08.2026 kullanıcı isteği): "Ana sayfada kullanılan
-- metinleri, slider görsellerini ve slider geçiş süresi gibi ayarları
-- adminin kendisi bu bölümden tanımlayıp istediği zaman değiştirecek."
-- Tek satırlık (singleton) ayar tablosu — platform_ayarlari ile aynı desen.
create table public.ana_sayfa_ayarlari (
  id int primary key default 1,
  baslik text not null,
  govde text not null,
  slider_gecis_saniye int not null default 6 check (slider_gecis_saniye >= 4),
  updated_at timestamptz not null default now(),
  constraint ana_sayfa_ayarlari_singleton check (id = 1)
);

alter table public.ana_sayfa_ayarlari enable row level security;
create policy "ana_sayfa_ayarlari_select_all" on public.ana_sayfa_ayarlari for select using (true);
create policy "ana_sayfa_ayarlari_update_admin" on public.ana_sayfa_ayarlari for update using (public.is_admin());
create policy "ana_sayfa_ayarlari_insert_admin" on public.ana_sayfa_ayarlari for insert with check (public.is_admin());

-- Kullanıcının verdiği taslak metin varsayılan olarak dolduruluyor — admin
-- panelinden istediği zaman değiştirebilir.
insert into public.ana_sayfa_ayarlari (id, baslik, govde) values (
  1,
  'Potansiyelini Sahaya Yansıt: Veri Odaklı Uzaktan Koçluk Sistemimizle Başarı Artık Tesadüf Değil',
  $govde$Eğitimde başarının anahtarı, doğru zamanda yapılan doğru hamlelerdir. Yenilikçi uzaktan koçluk platformumuz; öğrenci, öğretmen, okul yönetimi ve veli arasındaki iletişim duvarlarını kaldırarak tam kapsamlı bir başarı ekosistemi sunuyor.

Öğrencilerimiz günlük çalışma programlarını ve deneme sınavı sonuçlarını sisteme eksiksiz girerken; uzman eğitimcilerimiz bu verileri anlık olarak analiz eder. Öğrencinin hangi konuda eksik kaldığı, soru çözme hızındaki değişimler ve deneme performansındaki grafikler detaylıca incelenerek kişiselleştirilmiş geri dönütler sağlanır. Öğretmenler ve dershane eğitimcileri, öğrencinin soru çözüm verimliliğini ve çalışma disiplinini adım adım takip ederek sürece nokta atışı müdahalelerde bulunabilir.

Platformumuz yalnızca öğretmen ve öğrenciye değil, tüm eğitim paydaşlarına şeffaf bir takip imkanı tanır:

Müdürler ve Okul Yönetimi: Kurum genelindeki akademik başarıyı, sınıfların performans ortalamalarını ve koçluk süreçlerinin verimliliğini üst perspektiften izleyebilir.

Kurs Eğitimcileri: Kurum dışı veya takviye eğitimlerde öğrencilerin konu eksikliklerini nokta atışı tespit edip stratejik çalışma programları oluşturabilir.

Veliler: Çocuklarının deneme netlerindeki değişimi, günlük çalışma sürelerini ve öğretmen geri dönütlerini doğrudan takip ederek sürecin güvenilir bir parçası haline gelir.

Eğitim maratonunda öğrencinizin deneme ve çalışma performansını şansa bırakmayın. Veriyle yönlendirilen, anlık geri dönütlerle desteklenen ve başarıyı hedefleyen SeFu koçluk platformumuzla tanışın!$govde$
);

-- Slider görselleri — birden fazla, sıralı. Aynı Supabase Storage deseni
-- (bkz. migration 0082, tg-denemeleri bucket'ı) — public bucket, admin-only yazma.
create table public.ana_sayfa_slider_gorselleri (
  id uuid primary key default gen_random_uuid(),
  dosya_yolu text not null,
  sira int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ana_sayfa_slider_gorselleri enable row level security;
create policy "ana_sayfa_slider_select_all" on public.ana_sayfa_slider_gorselleri for select using (true);
create policy "ana_sayfa_slider_insert_admin" on public.ana_sayfa_slider_gorselleri for insert with check (public.is_admin());
create policy "ana_sayfa_slider_delete_admin" on public.ana_sayfa_slider_gorselleri for delete using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('ana-sayfa', 'ana-sayfa', true)
on conflict (id) do nothing;

create policy "ana_sayfa_objects_select_all" on storage.objects
  for select using (bucket_id = 'ana-sayfa');
create policy "ana_sayfa_objects_insert_admin" on storage.objects
  for insert with check (bucket_id = 'ana-sayfa' and public.is_admin());
create policy "ana_sayfa_objects_delete_admin" on storage.objects
  for delete using (bucket_id = 'ana-sayfa' and public.is_admin());
