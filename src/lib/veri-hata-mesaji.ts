// Veri girişi (konu çalışması / soru çözümü / deneme) ekranlarına ham
// veritabanı mesajı düşmesin.
//
// Öğrenci hatası (28.09.2026): süre üst sınırı kısıtı devreye girince ekranda
// `new row for relation "soru_cozumleri" violates check constraint
// "soru_cozumleri_sure_ust_sinir"` yazdı. Kısıtın kendisi 0125 ile düzeltildi;
// bu katman da ileride başka bir kısıt tetiklenirse öğrencinin İngilizce
// veritabanı metni görmemesi için var.
//
// Kural: tanınan kısıtlar adıyla çevrilir. Tanınmayan ama AÇIKÇA veritabanı
// mesajı olan metinler genel bir cümleye indirgenir (bilgi öğrenciye zaten bir
// şey ifade etmiyor). Tetikleyicilerin Türkçe yazılmış mesajları olduğu gibi
// korunur — bkz. grupHatasiCevir, aynı ilke.

const CEVIRILER: { esle: RegExp; mesaj: string }[] = [
  {
    esle: /soru_cozumleri_sure_ust_sinir/,
    mesaj: "Süre, girdiğin toplam soru sayısının (doğru + yanlış + boş) iki katını geçemez. Süreyi ya da soru sayılarını kontrol et.",
  },
  {
    esle: /konu_calismalar_sure_ust_sinir/,
    mesaj: "Tek bir çalışma oturumu için girilebilecek süreyi aştın. Günlük toplamı değil, o oturumun süresini gir.",
  },
  {
    esle: /denemeler_sure_ust_sinir/,
    mesaj: "Deneme süresi gerçek sınav süresinden uzun olamaz. Süreyi kontrol et.",
  },
  {
    esle: /sure_dakika_check/,
    mesaj: "Süre sıfırdan büyük olmalı.",
  },
  {
    esle: /(dogru|yanlis|bos)_check/,
    mesaj: "Soru sayıları eksi olamaz.",
  },
  {
    esle: /GECMIS_TARIH|gecmis_tarih_sinir/,
    mesaj: "Bu tarih için giriş süresi dolmuş. Daha yakın bir gün seç.",
  },
  {
    esle: /row-level security|permission denied/i,
    mesaj: "Bu kaydı ekleme yetkin yok. Yanlış olduğunu düşünüyorsan hata bildir.",
  },
  {
    esle: /duplicate key|23505/i,
    mesaj: "Bu kayıt zaten girilmiş.",
  },
  {
    esle: /JWT|not authenticated/i,
    mesaj: "Oturumun sona ermiş. Sayfayı yenileyip tekrar dene.",
  },
];

// Çevrilmemiş ama kullanıcıya gösterilmemesi gereken ham veritabanı metinleri.
const HAM_VERITABANI = /violates|constraint|null value in column|invalid input syntax|relation "|column "|duplicate key/i;

export function veriHatasiCevir(mesaj: string | null | undefined): string {
  const ham = (mesaj ?? "").trim();
  if (!ham) return "Kayıt yapılamadı, tekrar dene.";
  for (const { esle, mesaj: cevirisi } of CEVIRILER) {
    if (esle.test(ham)) return cevirisi;
  }
  if (HAM_VERITABANI.test(ham)) {
    return "Girdiğin değerler kaydedilemedi. Değerleri kontrol edip tekrar dene; sorun sürerse hata bildir.";
  }
  return ham;
}
