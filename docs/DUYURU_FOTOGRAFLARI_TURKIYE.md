# Duyuru fotoğrafları — Türkiye uyarlaması

Tarih: 25 Ekim 2026 · Dal: `codex/duyuru-fotograflari-turkiye` · Başlangıç: `4354f7bc`.

Yerleşik duyuru ve yurt kartlarının 10 fotoğrafı, Türkiye'deki gündelik okul, dershane, veli ve pansiyon ortamlarına uygun kurmaca sahnelerle yenilendi. Gerçek kurum/öğrenci fotoğrafı değildir. Kullanıcıların yüklediği özel fotoğraflar, gizleme/seçim ayarları, kart metinleri, logoları ve uygulama kodu değiştirilmedi.

Üretim: Codex yerleşik `image_gen` aracı, her fotoğraf için ayrı yeni görsel üretimi (`photorealistic-natural`). İlk kaynaklar 1536×1024 PNG; genel duyuru ve akşam yoklamasının kadrajı aynı yerleşik araçla ayrıca düzenlendi. Proje çıktıları 1200 piksel genişlikte (genel: 1200×403, akşam yoklaması: 1200×400, diğerleri: 1200×800), progressive MozJPEG, kalite 80 (çarşı: 76). Sharp yalnız boyutlandırma ve JPEG sıkıştırması için kullanıldı.

10 dosya toplamı: 1.460.184 bayttan 998.778 bayta indi (%31,6 azalma). Eski fotoğraflar Git geçmişinden geri alınabilir. Dosya adları ve URL'ler korundu. Daha önce indirilmiş/paylaşılmış kartlar kendiliğinden değişmez; kart yeniden oluşturulmalıdır. Kullanıcı 25.10.2026'da canlıya alma onayı verdi; yayın sırasında gelen `80e0f99b` ve `6fc91398` güncellemeleri korunarak güncel main üzerine taşındı. Yayın durumu, bu değişikliği içeren main commit'inin Vercel production sonucundan kontrol edilmelidir.

| Kart | Dosya | Önce (bayt) | Sonra (bayt) |
| --- | --- | ---: | ---: |
| Deneme sınavı | `public/duyuru-fotograflari/deneme-sinavi.jpg` | 84624 | 108671 |
| Veli toplantısı | `public/duyuru-fotograflari/veli-toplantisi.jpg` | 134278 | 109278 |
| Ücret hatırlatma | `public/duyuru-fotograflari/odeme.jpg` | 69768 | 90792 |
| Genel duyuru | `public/duyuru-fotograflari/genel.jpg` | 115542 | 77836 |
| Etüt | `public/duyuru-fotograflari/etut.jpg` | 117472 | 89427 |
| Rehberlik / seminer | `public/duyuru-fotograflari/seminer.jpg` | 162286 | 90575 |
| Başarı / tebrik | `public/duyuru-fotograflari/tebrik.jpg` | 125917 | 98012 |
| Akşam yoklaması | `public/duyuru-fotograflari/aksam-yoklamasi.jpg` | 156138 | 56101 |
| Evci izni | `public/duyuru-fotograflari/evci-izni.jpg` | 234300 | 109312 |
| Çarşı izni | `public/duyuru-fotograflari/carsi-izni.jpg` | 259859 | 168774 |

Korunan yerleşik fotoğraflar: `ozel-gun.jpg` (Türk bayrağı), `ders-iptali.jpg`, `devamsizlik.jpg`, `deneme-sonucu.jpg`, `kayit.jpg`, `ders-programi.jpg`. Bunlar uygun veya kültüre özgü olmayan görseller.

## Kontrol

26 Ekim 2026 önbellek düzeltmesi: yeni 10 JPG'nin canlı dosyaları SHA-256 ile yeniden doğrulandı; dosyalar güncel. Tarayıcılar aynı URL'yi bir yıl `immutable` sakladığı için eski görseli gösterebiliyordu. Admin galerisinde, kart seçimlerinde ve canvas kaynaklarında ortak `yerlesikFotoAdresi` kullanılır; her yerleşik görsel URL'sine gerçek içeriğin 12 haneli SHA-256 sürümü eklenir. Örnek: `/duyuru-fotograflari/genel.jpg?v=f53cc12595b4`. Gelecekte JPG değiştirildikten sonra `node scripts/guncelle-duyuru-foto-surumleri.mjs` çalıştırılmalı; testler dosya ve sürüm eşleşmesini denetler. Özel yüklenen fotoğraflara, gizleme ayarlarına, logolara ve diğer statik dosyaların önbellek politikasına dokunulmadı. Yayın sonucu bu düzeltmenin main commit'ine bağlı Vercel production kontrolünden doğrulanır.

- 10 yeni dosyanın JPEG biçimi, 1200 piksel genişlik ve kaynak oranına uygun yükseklik ve 170.000 bayt üst sınırı kontrol edildi.
- Üretilen 10 fotoğraf ve kart oranlarına göre ortadan kırpılmış önizlemeleri görsel olarak incelendi. Genel duyuru ve akşam yoklamasında başların kesilmesini azaltmak için kadraj yeniden üretildi. Uygulamada fotoğraf alanı normal kartta 1080×580, metin odaklı kartta 1080×400, yurt kartında 1080×360; ortadan kaplama kullanılıyor.
- İlgili mevcut 5 test dosyasında 30 test geçti (duyuru şablonları, şablon ayarları, yurt listeleri ve admin genel duyurusu). Uygulama kodunda değişiklik yok; veritabanı/migration yok.
- Gerçek hesapla tarayıcıda kart üretme/paylaşma ve canlı yayın doğrulanmadı.

## Tam üretim istemleri

### Deneme sınavı — deneme-sinavi.jpg

Kaynak üretim dosyası: `exec-556d27d0-8d09-4fb5-96cd-7a19976a005a.png`.

```text
Use case: photorealistic-natural. Asset type: landscape photograph for a Turkish school WhatsApp announcement card, not the card itself. Generate one new photorealistic editorial photograph, wide 3:2 landscape composition, natural daylight. Scene: a contemporary ordinary high-school classroom in Türkiye during a practice exam. Light wood two-person desks with blue metal frames in rows, clean off-white walls, green/white smart board at the front, one small correctly depicted Turkish flag beside the board. Several fictional teenagers seen mostly from behind or oblique side angles concentrating on generic multiple-choice exam booklets and optical answer sheets with pencils. Teacher supervising at front, candid and respectful, no close-up portraits. Authentic everyday Turkish school environment, not a university lecture theatre or an American school. Composition should stay understandable when cropped into a shallow horizontal header: key desks and students concentrated across central horizontal band, no essential objects near edges. Avoid graduation gowns/caps, yellow school buses, lockers, foreign flags, English signage, readable names, brands, watermarks, typography, added graphics. No overlay text. Warm realistic textures, professional education photography.
```

### Veli toplantısı — veli-toplantisi.jpg

Kaynak üretim dosyası: `exec-1a3bfaf0-7fc8-47a5-a447-0d4bcdd3f0eb.png`.

```text
Use case: photorealistic-natural. Asset: one new editorial photograph for the header of a school WhatsApp announcement card in Türkiye, not a finished card. Wide 3:2 landscape photograph, natural light, realistic ordinary Turkish educational setting, dignified and contemporary, natural fabric and material textures. Center the meaningful activity across the middle horizontal band, readable in a shallow wide crop, keep essential details away from edges. All people fictional, no readable personal information. No overlay text, no watermark, no brands or foreign-language signage, no yellow school bus, no graduation caps/gowns. A parent-teacher meeting in a typical Turkish high-school classroom. Parents in everyday varied clothing seated on light wood desks with blue metal legs, a middle-aged woman teacher discussing learning with them at front by a whiteboard; a small Turkish flag and framed Atatürk portrait in the background. View diagonally from the back, attentive parents and warm approachable teacher, no corporate exposed-brick office, no staged handshake, no close-up faces.
```

### Ücret hatırlatma — odeme.jpg

Kaynak üretim dosyası: `exec-dd732c2f-6dd0-4509-92f2-2f5b1b134804.png`.

```text
Use case: photorealistic-natural. Asset: one new editorial photograph for the header of a school WhatsApp announcement card in Türkiye, not a finished card. Wide 3:2 landscape photograph, natural light, realistic ordinary Turkish educational setting, dignified and contemporary, natural fabric and material textures. Center the meaningful activity across the middle horizontal band, readable in a shallow wide crop, keep essential details away from edges. All people fictional, no readable personal information. No overlay text, no watermark, no brands or foreign-language signage, no yellow school bus, no graduation caps/gowns. A parent paying a course fee at a modest well-kept Turkish tutoring centre reception. Close-to-medium shot of a parent's hand holding a plain unbranded bank card above a POS terminal, an adult administrator behind the desk, a receipt printer, a neat folder and a pencil holder; soft school corridor background, small desk Turkish flag. Screen and receipt softly out of focus, no readable card numbers, no dollar/euro cash, no currency notes, natural normal human hands, no pressure or debt-shaming.
```

### Genel duyuru — genel.jpg

İlk kaynak üretim dosyası: `exec-7328aa41-f9a0-4d20-ae61-226234bba554.png`. Seçilen son kadraj: `exec-bcab7644-7e8c-4fb4-ac91-83bbdcfad879.png`.

```text
Use case: photorealistic-natural. Asset: one new editorial photograph for the header of a school WhatsApp announcement card in Türkiye, not a finished card. Wide 3:2 landscape photograph, natural light, realistic ordinary Turkish educational setting, dignified and contemporary, natural fabric and material textures. Center the meaningful activity across the middle horizontal band, readable in a shallow wide crop, keep essential details away from edges. All people fictional, no readable personal information. No overlay text, no watermark, no brands or foreign-language signage, no yellow school bus, no graduation caps/gowns. A welcoming entrance corridor of a contemporary ordinary Turkish secondary school, clean off-white and pale blue walls, glass-fronted noticeboard with unmarked pinned paper sheets, wood classroom doors, plants and daylight. In middle distance one teacher holding a folder chatting with another adult colleague, natural candid moment. Small Turkish flag at the far reception, no readable signs or paper text, no industrial loudspeaker, no corporate luxury lobby. Calm useful general announcement visual.
```

Kadraj düzeltme istemi (ilk kaynak görsel referans olarak verildi):

```text
Edit target: the attached generated school photograph. Change composition/framing only, preserving its Turkish school environment, realistic photographic style, people and general activity. This photo is used as a 3:1 panoramic header with automatic CENTER crop; the current crop cuts people's heads off. Pull the camera significantly farther back and place ALL people's ENTIRE heads/faces and the meaningful activity strictly within the middle third of the output height (vertical 35% to 65%). Put extra empty wall/ceiling in upper third and extra floor in lower third. People smaller in frame, head-to-waist visible in central band. Preserve width-oriented documentary scene; avoid a close-up or tall subjects. No new readable text, brands, watermarks or overlay graphics. Output one photo, not a card or collage. The two adult teachers chatting in the corridor must have fully visible heads centered near 45% image height.
```

### Etüt — etut.jpg

Kaynak üretim dosyası: `exec-a50f53ac-75a7-4a35-aff2-b469fac400fa.png`.

```text
Use case: photorealistic-natural. Asset: one new editorial photograph for a school WhatsApp announcement header in Türkiye, not a finished card. Wide 3:2 landscape photograph, warm natural daylight, authentic ordinary Turkish secondary-school environment, realistic materials, documentary rather than advertising poses. Meaningful people/activity should lie across the central horizontal band and remain legible in a shallow wide crop. All people fictional, no readable names or identifying personal information. No text overlays, no brands, no watermarks, no English-language signage, no graduation gowns/caps, no yellow school buses, no luxury foreign university campus. A supportive after-school study session in a Turkish high-school study room. An adult mathematics teacher sitting beside two teenagers at a light wood desk, explaining a geometry exercise on an unbranded workbook, a pencil and a triangle ruler on the table. Two more pupils studying softly out of focus in background, orderly bookshelves and a normal classroom board. Three-quarter side view, genuine concentration and reassuring teaching, respectful faces, modest everyday school clothing; no posed library selfie and no readable text.
```

### Rehberlik / seminer — seminer.jpg

Kaynak üretim dosyası: `exec-68d8877a-5c18-4736-93f2-7ac4e60068b6.png`.

```text
Use case: photorealistic-natural. Asset: one new editorial photograph for a school WhatsApp announcement header in Türkiye, not a finished card. Wide 3:2 landscape photograph, warm natural daylight, authentic ordinary Turkish secondary-school environment, realistic materials, documentary rather than advertising poses. Meaningful people/activity should lie across the central horizontal band and remain legible in a shallow wide crop. All people fictional, no readable names or identifying personal information. No text overlays, no brands, no watermarks, no English-language signage, no graduation gowns/caps, no yellow school buses, no luxury foreign university campus. A Turkish school guidance counsellor giving a small study-planning and exam-motivation workshop in a regular secondary-school classroom. View from back/side of several teenagers at school desks listening to the approachable adult teacher near a blank whiteboard. A few notebooks and pencils, softly blurred simple school noticeboard, small Turkish flag and wall clock in background. Educational and calm, not a business conference, no corporate badges or foreign university auditorium. No readable whiteboard text.
```

### Başarı / tebrik — tebrik.jpg

Kaynak üretim dosyası: `exec-e1b044d8-f2ad-410a-bc7d-33cd1b358dbe.png`.

```text
Use case: photorealistic-natural. Asset: one new editorial photograph for a school WhatsApp announcement header in Türkiye, not a finished card. Wide 3:2 landscape photograph, warm natural daylight, authentic ordinary Turkish secondary-school environment, realistic materials, documentary rather than advertising poses. Meaningful people/activity should lie across the central horizontal band and remain legible in a shallow wide crop. All people fictional, no readable names or identifying personal information. No text overlays, no brands, no watermarks, no English-language signage, no graduation gowns/caps, no yellow school buses, no luxury foreign university campus. An achievement congratulations moment at a Turkish secondary school: one adult teacher handing an unbranded achievement certificate in a plain paper folder to a fictional teenage pupil, with two classmates smiling and gently applauding nearby. Regular tidy everyday school clothes, school courtyard or bright hallway with a Turkish flag softly visible in background. Candid mid-distance composition, proud but understated school success, no graduation ceremony, no mortarboard, no gowns, no trophy excess, certificate text entirely blurred and unreadable.
```

### Akşam yoklaması — aksam-yoklamasi.jpg

İlk kaynak üretim dosyası: `exec-30df23ec-5c30-4d11-b10c-bbbcf12966e1.png`. Seçilen son kadraj: `exec-6cb37db7-3e68-46b3-8ed4-4aa599322596.png`.

```text
Use case: photorealistic-natural. Create one new editorial photograph for a Turkish school WhatsApp announcement header, not a finished card. Wide 3:2 landscape, natural documentary photography, ordinary authentic contemporary Turkish school environment, realistic materials and faces. Place key activity across the central horizontal band so a wide crop remains understandable. All people fictional. No text overlays, readable personal information, brands, watermarks, English signage, foreign flags or luxury hotel interiors. Evening attendance at an ordinary high-school boarding residence in Türkiye. Adult duty teacher with a plain clipboard standing beside the open entrance to a tidy study room, three teenage pupils seen mostly from behind arriving with notebooks. Warm practical ceiling lighting, pale walls, wood study desks and simple noticeboard, calm supervised school atmosphere. Eye-level medium wide shot; no bedroom scenes, no readable attendance names.
```

Kadraj düzeltme istemi (ilk kaynak görsel referans olarak verildi):

```text
Edit target: the attached generated school photograph. Change composition/framing only, preserving its Turkish school environment, realistic photographic style, people and general activity. This photo is used as a 3:1 panoramic header with automatic CENTER crop; the current crop cuts people's heads off. Pull the camera significantly farther back and place ALL people's ENTIRE heads/faces and the meaningful activity strictly within the middle third of the output height (vertical 35% to 65%). Put extra empty wall/ceiling in upper third and extra floor in lower third. People smaller in frame, head-to-waist visible in central band. Preserve width-oriented documentary scene; avoid a close-up or tall subjects. No new readable text, brands, watermarks or overlay graphics. Output one photo, not a card or collage. The duty teacher holding clipboard at study-room door and arriving pupils must have fully visible heads centered near 45% image height.
```

### Evci izni — evci-izni.jpg

Kaynak üretim dosyası: `exec-dc3abc5f-2ba7-4d5d-b72a-b7784a2e2b71.png`.

```text
Use case: photorealistic-natural. Create one new editorial photograph for a Turkish school WhatsApp announcement header, not a finished card. Wide 3:2 landscape, natural documentary photography, ordinary authentic contemporary Turkish school environment, realistic materials and faces. Place key activity across the central horizontal band so a wide crop remains understandable. All people fictional. No text overlays, readable personal information, brands, watermarks, English signage, foreign flags or luxury hotel interiors. A weekend home leave moment at an ordinary Turkish boarding high school courtyard gate. A teenage pupil carrying a modest weekend duffel bag greeted by an adult parent, a duty teacher holding a folder in the middle background. Pale school building, simple metal gate, small Turkish flag softly out of focus. Natural relaxed scene, medium distance, no transport terminal, no street signage, no readable school names.
```

### Çarşı izni — carsi-izni.jpg

Kaynak üretim dosyası: `exec-de48bc21-596a-4a0f-b48c-841eae844af8.png`.

```text
Use case: photorealistic-natural. Create one new editorial photograph for a Turkish school WhatsApp announcement header, not a finished card. Wide 3:2 landscape, natural documentary photography, ordinary authentic contemporary Turkish school environment, realistic materials and faces. Place key activity across the central horizontal band so a wide crop remains understandable. All people fictional. No text overlays, readable personal information, brands, watermarks, English signage, foreign flags or luxury hotel interiors. An ordinary Anatolian Turkish town pedestrian street during a sunny weekend afternoon: three fictional high-school pupils seen from behind walking together past a modest stationery shop and a small simit bakery with striped awning. Authentic low-rise Turkish town architecture, a few adult pedestrians, welcoming everyday local context, not a tourist landmark. Shop signs outside frame or entirely unreadable, no brands, no advertising logos.
```

