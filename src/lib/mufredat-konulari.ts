// SeFu Koç — resmi müfredat (2024 Maarif Modeli) konu listesi.
// Kaynak: kullanıcının sağladığı çerçeve programları (Coğrafya, Din Kültürü,
// Felsefe, Fizik, Kimya, Matematik, Biyoloji, Tarih 9-10-11, T.C. İnkılap
// Tarihi ve Atatürkçülük 12, Türk Dili ve Edebiyatı). Türkçe/Edebiyat için
// Maarif Modeli ayrı konu başlığı vermediğinden (tema/beceri bazlı) klasik
// ÖSYM TYT Türkçe / AYT Edebiyat konu listesi kullanıldı.
//
// Gerçek veri mufredat-konulari.json'da duruyor — hem burada (uygulama
// kodu, TS) hem scripts/preload-konu-anlatimlari.mjs'de (Node script, build
// adımı olmadan çalışır) tek kaynaktan okunuyor.
import konular from "./mufredat-konulari.json";

export interface MufredatKonusu {
  ders: string;
  konu: string;
  seviye: string;
}

export const MUFREDAT_KONULARI: MufredatKonusu[] = konular;
