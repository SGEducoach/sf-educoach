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
import type { AytAlan } from "./types";
import { TYT_DERSLERI, AYT_DERSLERI } from "./types";

export interface MufredatKonusu {
  ders: string;
  konu: string;
  seviye: string;
}

export const MUFREDAT_KONULARI: MufredatKonusu[] = konular;

const TUM_ALANLAR: AytAlan[] = ["SAY", "EA", "SOZ"];

// AYT_DERSLERI (types.ts) bazı dersleri sınav yapısına özgü alt-adlarla
// tutuyor ("Tarih-1"/"Tarih-2", "Felsefe Grubu") — müfredattaki düz ders
// adlarıyla (Tarih, Felsefe) eşleştirmek için normalize ediyoruz.
function dersAdiNormalize(ad: string): string {
  return ad.replace(/-\d$/, "").replace("Felsefe Grubu", "Felsefe");
}

// Bir dersin hangi AYT alan(lar)ına ait olduğunu döndürür. TYT_DERSLERI'ndeki
// dersler herkese ortaktır (TYT'yi SAY/EA/SÖZ fark etmeksizin tüm öğrenciler
// girer) — bu yüzden üç alana da dahil edilir. Ayrıca AYT_DERSLERI'nde o
// alana özgü olarak geçiyorsa (örn. Matematik → SAY+EA, Edebiyat → EA+SÖZ)
// zaten TYT_DERSLERI kontrolüyle kapsanmış olur; TYT_DERSLERI'nde olmayıp
// sadece belirli alan(lar)ın AYT'sinde geçen bir ders yoksa (mevcut veride
// hepsi TYT_DERSLERI'nde olduğundan) bu fonksiyon pratikte hep üç alanı da
// dönebilir — ileride TYT'de olmayan yeni bir AYT-özel ders eklenirse doğru
// şekilde daralır.
export function dersinAlanlari(ders: string): AytAlan[] {
  if ((TYT_DERSLERI as readonly string[]).includes(ders)) return TUM_ALANLAR;
  return TUM_ALANLAR.filter((alan) =>
    (AYT_DERSLERI[alan] as readonly string[]).some((d) => dersAdiNormalize(d) === ders)
  );
}

export interface MufredatKonusuAlanli extends MufredatKonusu {
  alanlar: AytAlan[];
}

// "Bütün konular SAY/EA/SÖZ'e göre etiketlenmiş" hali — her konu, hangi
// AYT alan(lar)ına ait olduğunu `alanlar` alanında taşır.
export const MUFREDAT_KONULARI_ALANLI: MufredatKonusuAlanli[] = MUFREDAT_KONULARI.map((k) => ({
  ...k,
  alanlar: dersinAlanlari(k.ders),
}));

// Seçilen alanın (TYT ortak + o alanın AYT'si) tüm konularını döndürür.
export function alanaGoreKonular(alan: AytAlan): MufredatKonusuAlanli[] {
  return MUFREDAT_KONULARI_ALANLI.filter((k) => k.alanlar.includes(alan));
}
