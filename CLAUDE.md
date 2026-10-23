@AGENTS.md

# Oturum başlangıcı (zorunlu — kod ya da analiz işine geçmeden önce)

Bu depoda aynı anda birçok oturum ve çalışma kopyası (worktree) var; bazıları
`main`'in yüzlerce commit gerisinde kalıyor (23.10.2026 ölçümü: 85–340 commit).
Eski bir kopyada "bu özellik yok" sanmak ya da bayat kod üzerinde çalışmak en
sık yapılan hata. Bu yüzden ilk işin:

1. `git fetch origin` çalıştır, sonra `git rev-list --left-right --count origin/main...HEAD`
   ile bu kopyanın `main`'den **kaç commit geride/ileride** olduğunu bul ve
   kullanıcıya **tek satırda** söyle ("main'den N commit geride").
2. Geride ise ve commit edilmemiş değişiklik yoksa **önce güncelle**
   (`git merge origin/main`; uygulamada sync aracı varsa onu kullan). Commit
   edilmemiş iş varsa onu **silme/saklamadan** kullanıcıya sor.
3. `docs/SEFUKOC_GUNLUK_DURUM.md` dosyasının **Bölüm 1 (Genel Pano)** ve ilgili
   modül kartını oku. Kartta "Doğrulanmadı" yazan hiçbir şeyi tamamlanmış sayma;
   bir özelliğin var olup olmadığını **güncel kodda ara** (grep) — hafızaya ya
   da eski sohbete güvenme.
4. Kullanıcıya 5 satırı geçmeyen "güncel durum" ver, sonra işe başla.

Yeni bir iş için eski bir sohbeti ya da bayat dalı sürdürme: güncel `main`'den
yeni dal aç. İş bitince günlük durum dosyasına (aynı dosya, yeni dosya üretme)
oturum satırı ve devir notu ekle.

Ek kurallar (iş emirlerinden): `git add -A` / `git add .` kullanma, dosyaları tek
tek ekle; başka oturumların commit edilmemiş işine dokunma; kişisel veri (öğrenci
adı, numara) depoya girmez.
