// Deneme PDF'inin Claude ile okunmasında hedef öğrencileri gruplar hâlinde
// isteme (kullanıcı bildirimi 27.09.2026: kalabalık dershane PDF'inde tek
// yanıt 8000 token sınırını aşıyordu). Grup yanıtı yine sığmazsa grup ikiye
// bölünüp tekrar denenir; tek öğrenci bile sığmıyorsa hata çağırana gider.
// Claude çağrısı dışarıdan verilir — mantık gerçek API olmadan test edilir.

export class YanitSigmadiHatasi extends Error {
  constructor() {
    super("Yanıt sınırı aşıldı");
    this.name = "YanitSigmadiHatasi";
  }
}

export interface GrupOkumaSonucu<T> {
  sonuclar: T[];
  okunamayanAdlar: string[];
}

export async function gruplaraBolerekOku<T>(
  hedefler: string[],
  oku: (grup: string[]) => Promise<GrupOkumaSonucu<T>>,
  secenek: { grupBoyutu: number; esZamanli: number; tekKisiSigmadi: () => Error },
): Promise<GrupOkumaSonucu<T> & { grupSayisi: number }> {
  const bolerekOku = async (grup: string[]): Promise<GrupOkumaSonucu<T>> => {
    try {
      return await oku(grup);
    } catch (e) {
      if (!(e instanceof YanitSigmadiHatasi)) throw e;
      if (grup.length <= 1) throw secenek.tekKisiSigmadi();
      const orta = Math.ceil(grup.length / 2);
      const [a, b] = await Promise.all([bolerekOku(grup.slice(0, orta)), bolerekOku(grup.slice(orta))]);
      return { sonuclar: [...a.sonuclar, ...b.sonuclar], okunamayanAdlar: [...a.okunamayanAdlar, ...b.okunamayanAdlar] };
    }
  };

  const gruplar: string[][] = [];
  for (let i = 0; i < hedefler.length; i += secenek.grupBoyutu) gruplar.push(hedefler.slice(i, i + secenek.grupBoyutu));
  const sonuclar: GrupOkumaSonucu<T>[] = [];
  for (let i = 0; i < gruplar.length; i += secenek.esZamanli) {
    sonuclar.push(...await Promise.all(gruplar.slice(i, i + secenek.esZamanli).map(bolerekOku)));
  }
  return {
    sonuclar: sonuclar.flatMap((g) => g.sonuclar),
    okunamayanAdlar: [...new Set(sonuclar.flatMap((g) => g.okunamayanAdlar))],
    grupSayisi: gruplar.length,
  };
}
