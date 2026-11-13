// Kimlik listesine göre "tümünü" çeken toplu sorgular için sayfalı okuma.
//
// PostgREST max_rows = 1000: `.in("student_id", okulun_tum_ogrencileri)` gibi
// bir sorgu 1000 satırdan sonrasını HATA VERMEDEN keser. Elbistan'da deneme
// sayısı 860'a ulaştı (13.11.2026); bir iki toplu yüklemeden sonra rehber
// kapsam listesinde ve sınıf analizinde bazı öğrencilerin denemeleri sessizce
// eksik görünecekti. Kimlikler 150'lik parçalara bölünür (URL uzunluğu), her
// parça 1000'lik sayfalarla sonuna kadar okunur; sorgu SABİT bir sıralama
// (örn. .order("id")) içermelidir, yoksa sayfalar arasında satır kayabilir.

const SAYFA = 1000;
const PARCA = 150;
const ESZAMANLI = 4;

type SorguSonucu = PromiseLike<{ data: unknown; error: { message: string } | null }>;

export async function hepsiniSayfaliCek<T>(sorgu: (bas: number, son: number) => SorguSonucu): Promise<T[]> {
  const satirlar: T[] = [];
  for (let bas = 0; ; bas += SAYFA) {
    const { data, error } = await sorgu(bas, bas + SAYFA - 1);
    if (error) throw new Error(error.message);
    const parca = (data as T[]) ?? [];
    satirlar.push(...parca);
    if (parca.length < SAYFA) return satirlar;
  }
}

export async function kimlikParcaliCek<T>(idler: readonly string[], sorgu: (parca: string[], bas: number, son: number) => SorguSonucu): Promise<T[]> {
  const parcalar: string[][] = [];
  for (let i = 0; i < idler.length; i += PARCA) parcalar.push(idler.slice(i, i + PARCA));
  const sonuclar: T[][] = new Array(parcalar.length);
  let sira = 0;
  const isci = async () => {
    while (sira < parcalar.length) {
      const i = sira++;
      sonuclar[i] = await hepsiniSayfaliCek<T>((bas, son) => sorgu(parcalar[i], bas, son));
    }
  };
  await Promise.all(Array.from({ length: Math.min(ESZAMANLI, parcalar.length) }, isci));
  return sonuclar.flat();
}
