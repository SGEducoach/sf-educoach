# SG EduCoach

YKS (TYT/AYT) hazırlık öğrencileri için koçluk platformu — öğrenci, öğretmen, veli, müdür ve admin rolleriyle çalışan bir Next.js + Supabase uygulaması.

Canlı: https://sg-educoach.vercel.app
Gizli yönetim paneli: `/yonetici` (sadece admin hesabı, ayrı giriş formu)

## Teknoloji

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Supabase** (Postgres + Auth + Row Level Security + RPC fonksiyonları)
- **Claude API** (`@anthropic-ai/sdk`) — AI destekli konu anlatımı üretimi
- **Resend** — e-posta hatırlatmaları
- **Web Push** — PWA bildirimleri

## Kurulum

```bash
npm install
cp .env.local.example .env.local   # değerleri doldurun
npm run dev
```

### Gerekli ortam değişkenleri (`.env.local`)

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key — **sadece sunucu tarafında**, asla client'a sızdırılmamalı |
| `ANTHROPIC_API_KEY` | Konu anlatımı üretimi için Claude API anahtarı |
| `RESEND_API_KEY` | Hatırlatma e-postaları için |
| `CRON_SECRET` | `/api/cron/hatirlatmalar` route'unu korumak için (Vercel Cron header'ı bununla eşleşmeli) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push bildirimleri için VAPID anahtar çifti |
| `VAPID_SUBJECT` | Web Push için `mailto:` iletişim adresi (opsiyonel, varsayılan var) |

## Veritabanı

`supabase/schema.sql` — sıfırdan kurulum için tek dosyalık, kümülatif şema (Supabase SQL Editor'de tamamı çalıştırılabilir).

`supabase/migrations/` — var olan bir veritabanına sırayla uygulanan artımlı değişiklikler. Yeni bir migration eklerken **hem** ilgili `NNNN_isim.sql` dosyasını oluşturun **hem de** aynı SQL'i `schema.sql`'in sonuna ekleyin (iki dosya birbirinden bağımsız kaynaklar değil — schema.sql her zaman "fresh install sonucu tüm migration'lar uygulanmış hali" ile aynı olmalı).

## Admin/yönetim script'leri (`scripts/`)

Tek seferlik veya nadir kullanılan bakım işleri için `SUPABASE_SERVICE_ROLE_KEY` kullanan Node script'leri:

- `seed-demo-users.mjs` — test amaçlı örnek öğrenci/öğretmen/veli/müdür hesapları oluşturur
- `set-admin-email.mjs eski@mail.com yeni@mail.com` — bir hesabın auth e-postasını güvenli şekilde değiştirir
- `set-user-password.mjs kullanici@mail.com [yeni-sifre]` — bir hesaba doğrudan yeni şifre atar (şifre verilmezse rastgele üretilir)
- `preload-konu-anlatimlari.mjs` / `export-konu-anlatimlari.mjs` — konu anlatımı içeriğini toplu üretme/dışa aktarma

Çalıştırma: `node scripts/<dosya>.mjs` (proje kökünden, `.env.local` otomatik okunur).

## Mimari notları

- **`/yonetici`** platformun tek kontrol noktası — `/dashboard`'dan tamamen ayrı, kendi bağımsız girişi olan, hiçbir yerden link verilmeyen bir adres. Sadece `role='admin'` olan hesaplar erişebilir; başka biri gelirse panelin var olduğunu hissettirmeden anasayfaya yönlendirilir.
- **Müdür** rolü salt-okunur gözlemci; sınıf/öğretmen atama gibi kontrol yetkileri admin'e ait.
- Şifre politikası (`src/lib/validators.ts: sifreGecerliMi`) tüm hesap türleri için ortak: en az 8 karakter, harf + rakam + özel işaret.
