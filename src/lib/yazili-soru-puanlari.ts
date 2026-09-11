// Yazılı analizi — soru bazlı puanların üç giriş modu. Kullanıcı kararı
// (11.09.2026): "tek tek soru bazlı giriş, en iyi 2 orta 2 kötü 2 seçeneği ve
// oto yerleştir". Hem önizleme (YaziliAnaliziPanel) hem kayıt
// (yaziliSinavOlustur) BU dosyadaki fonksiyonları çağırır — ekranda görülen
// ile kaydedilen birebir aynı olsun. Hangi öğrencilerin puanının "girilen"
// (actual) sayılacağını istemcinin listesi değil, mod + toplamlar belirler.
// Göreli import: vitest yapılandırmasız çalışıyor, "@/" takma adını çözmüyor.
import { akilliTahminV1, type TahminSonucu } from "./yazili-estimation-algoritmasi";

export type GirisModu = "tek-tek" | "temsili" | "otomatik";

export const GIRIS_MODLARI: GirisModu[] = ["tek-tek", "temsili", "otomatik"];

export const GIRIS_MODU_ETIKET: Record<GirisModu, { baslik: string; aciklama: string }> = {
  "tek-tek": {
    baslik: "Tek tek soru bazlı giriş",
    aciklama: "Her öğrencinin her sorudan aldığı puanı girersiniz. En doğru analiz, en uzun giriş.",
  },
  temsili: {
    baslik: "En iyi 2 · orta 2 · kötü 2",
    aciklama: "Toplam puana göre seçilen 6 öğrencinin soru puanlarını girersiniz; diğerleri bu örneğe göre tahmin edilir.",
  },
  otomatik: {
    baslik: "Otomatik yerleştir",
    aciklama: "Soru puanı girmezsiniz; her öğrencinin toplamı sorulara, maksimum puanları oranında dağıtılır.",
  },
};

export const TEMSILI_KISI_SAYISI = 6;

export type TemsilciGrubu = "en-iyi" | "orta" | "en-dusuk";

export interface OgrenciToplamPuan {
  id: string;
  toplam: number;
}

// Toplam puana göre en iyi 2, orta 2 (medyan çevresi), en düşük 2. Eşitlikte
// id sırası — girdi sırası ne olursa olsun aynı 6 kişi seçilir (önizleme ile
// kayıt tutarlı kalsın). 6 veya daha az öğrencide herkes seçilir.
export function temsilcileriSec(ogrenciler: OgrenciToplamPuan[]): { id: string; grup: TemsilciGrubu }[] {
  const sirali = [...ogrenciler].sort((a, b) => b.toplam - a.toplam || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const n = sirali.length;
  if (n <= TEMSILI_KISI_SAYISI) {
    return sirali.map((o, i) => ({ id: o.id, grup: i < 2 ? "en-iyi" : i >= n - 2 ? "en-dusuk" : "orta" }));
  }
  const orta = Math.floor((n - 1) / 2);
  const secim: { i: number; grup: TemsilciGrubu }[] = [
    { i: 0, grup: "en-iyi" }, { i: 1, grup: "en-iyi" },
    { i: orta, grup: "orta" }, { i: orta + 1, grup: "orta" },
    { i: n - 2, grup: "en-dusuk" }, { i: n - 1, grup: "en-dusuk" },
  ];
  return secim.map(({ i, grup }) => ({ id: sirali[i].id, grup }));
}

// "Otomatik yerleştir": her öğrencinin toplamı sorulara maksimum puanları
// oranında dağıtılır, tam sayıya en büyük kalan yöntemiyle yuvarlanır —
// toplam birebir korunur, hiçbir soru maksimumunu aşmaz. DİKKAT: bu modda
// soru/kazanım başarı oranları gerçek veriye dayanmaz (herkesin profili aynı
// şekilde); yalnızca toplam puan istatistikleri anlamlıdır.
export function oransalDagit(ogrenciler: OgrenciToplamPuan[], maxPuanlar: number[]): TahminSonucu {
  const toplamMax = maxPuanlar.reduce((t, m) => t + m, 0);
  if (maxPuanlar.length === 0 || toplamMax <= 0) throw new Error("Soru listesi boş olamaz");
  const sonuc: TahminSonucu = {};
  for (const o of ogrenciler) {
    const ham = maxPuanlar.map((m) => (o.toplam * m) / toplamMax);
    const puanlar = ham.map((v) => Math.floor(v));
    let kalan = o.toplam - puanlar.reduce((t, v) => t + v, 0);
    const sira = ham
      .map((v, j) => ({ j, kesir: v - puanlar[j] }))
      .sort((a, b) => b.kesir - a.kesir || a.j - b.j);
    for (const { j } of sira) {
      if (kalan <= 0) break;
      if (puanlar[j] < maxPuanlar[j]) {
        puanlar[j] += 1;
        kalan -= 1;
      }
    }
    sonuc[o.id] = puanlar;
  }
  return sonuc;
}

// Seçilen modda soru puanı GİRİLMESİ gereken öğrenciler.
export function soruPuaniGerekenler(mod: GirisModu, ogrenciler: OgrenciToplamPuan[]): string[] {
  if (mod === "otomatik") return [];
  if (mod === "tek-tek") return ogrenciler.map((o) => o.id);
  return temsilcileriSec(ogrenciler).map((t) => t.id);
}

// Girilen soru puanlarının geçerliliği — hem ekranda (Devam et) hem sunucuda.
// adlar verilirse mesaj öğrenciyi adıyla anar.
export function soruPuaniHatasi(girdi: {
  mod: GirisModu;
  ogrenciler: OgrenciToplamPuan[];
  temsiliSkorlar: Record<string, number[]>;
  maxPuanlar: number[];
  adlar?: Record<string, string>;
}): string | null {
  const { mod, ogrenciler, temsiliSkorlar, maxPuanlar, adlar } = girdi;
  const m = maxPuanlar.length;
  if (m === 0) return "Soru listesi boş.";
  const toplamlar = new Map(ogrenciler.map((o) => [o.id, o.toplam]));
  for (const id of soruPuaniGerekenler(mod, ogrenciler)) {
    const ad = adlar?.[id] ?? "Bir öğrenci";
    const skorlar = temsiliSkorlar[id];
    if (!skorlar || skorlar.length !== m || skorlar.some((v) => !Number.isFinite(v))) {
      return `${ad}: her soru için puan girin.`;
    }
    for (let j = 0; j < m; j++) {
      if (!Number.isInteger(skorlar[j]) || skorlar[j] < 0 || skorlar[j] > maxPuanlar[j]) {
        return `${ad}: ${j + 1}. soru 0 ile ${maxPuanlar[j]} arasında tam sayı olmalı.`;
      }
    }
    const toplam = skorlar.reduce((t, v) => t + v, 0);
    const beklenen = toplamlar.get(id) ?? 0;
    if (toplam !== beklenen) {
      return `${ad}: soru puanlarının toplamı (${toplam}) toplam puanla (${beklenen}) eşleşmiyor.`;
    }
  }
  return null;
}

export interface SoruPuanHesabi {
  skorlar: TahminSonucu; // öğrenci id → soru puanları
  gercekIdler: Set<string>; // puanı öğretmence girilenler (kaynak "actual")
  tahminSurumu: string | null; // tahmin edilenlerin estimation_version değeri
}

// Önce soruPuaniHatasi ile doğrulanmış girdi bekler.
export function soruPuanlariniHesapla(girdi: {
  mod: GirisModu;
  ogrenciler: OgrenciToplamPuan[];
  temsiliSkorlar: Record<string, number[]>;
  maxPuanlar: number[];
}): SoruPuanHesabi {
  const { mod, ogrenciler, temsiliSkorlar, maxPuanlar } = girdi;
  if (mod === "otomatik") {
    return { skorlar: oransalDagit(ogrenciler, maxPuanlar), gercekIdler: new Set(), tahminSurumu: "oransal-v1" };
  }
  const girilenler = soruPuaniGerekenler(mod, ogrenciler);
  const toplamlar = new Map(ogrenciler.map((o) => [o.id, o.toplam]));
  const temsililer = girilenler.map((id) => ({ id, toplam: toplamlar.get(id) ?? 0, skorlar: temsiliSkorlar[id] ?? [] }));
  return {
    skorlar: akilliTahminV1(ogrenciler, temsililer, maxPuanlar),
    gercekIdler: new Set(girilenler),
    tahminSurumu: mod === "tek-tek" ? null : "v1",
  };
}
