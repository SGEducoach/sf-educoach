// Grup Koçluk denetimi (kullanıcı isteği 27.09.2026): koç/öğrenci ekranlarına
// veritabanından ham mesaj düşmesin. Tetikleyici ve RLS hataları tek yerde
// kullanıcı diline çevrilir; tanınmayan mesaj olduğu gibi bırakılır
// (bilgi kaybetmemek için).

const CEVIRILER: { esle: RegExp; mesaj: string }[] = [
  {
    esle: /GRUP_KAPASITESI_DOLU/,
    mesaj: "Grup kapasitesi dolu. Yer açmak için bir öğrenciyi pasife alın ya da kapasite artırımı için SeFu Koç yönetimiyle görüşün.",
  },
  {
    esle: /GRUP_KAPASITESI_DUSUK/,
    mesaj: "Yeni kapasite şu anki aktif öğrenci sayısının altında. Önce öğrenci pasife alın, sonra kapasiteyi düşürün.",
  },
  {
    esle: /GRUP_SALT_OKUNUR|salt okunur/i,
    mesaj: "Grubun süresi doldu; grup salt okunur. Yeni kayıt için SeFu Koç yönetimiyle görüşün.",
  },
  {
    esle: /row-level security|permission denied/i,
    mesaj: "Bu işlem için yetkiniz yok. Yanlış olduğunu düşünüyorsanız hata bildirin.",
  },
  {
    esle: /duplicate key|already (exists|registered)|23505/i,
    mesaj: "Bu kayıt zaten var.",
  },
  {
    esle: /JWT|session|not authenticated/i,
    mesaj: "Oturumunuz sona ermiş. Sayfayı yenileyip tekrar deneyin.",
  },
];

export function grupHatasiCevir(mesaj: string | null | undefined): string {
  const ham = (mesaj ?? "").trim();
  if (!ham) return "Beklenmeyen bir hata oldu, tekrar deneyin.";
  // Tetikleyici mesajlarının başındaki teknik önek ("... raise exception:")
  // ayıklanır; kalan metin zaten Türkçe yazılmış olabilir.
  const sade = ham.replace(/^.*?(GRUP_[A-Z_]+:?\s*)/, "$1");
  for (const { esle, mesaj: cevirisi } of CEVIRILER) {
    if (esle.test(sade)) return cevirisi;
  }
  return sade;
}
