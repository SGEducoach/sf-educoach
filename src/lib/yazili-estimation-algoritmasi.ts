// Yazılı Analizi Modülü - Akıllı Tahmin Algoritması v1
// Bu fonksiyon, temsilî öğrencilerin gerçek soru puanları ve tüm öğrencilerin toplam puanları
// verildiğinde, diğer öğrenciler için soru bazlı puanları tahmin eder.
// Algoritma deterministik ve aşağıdaki invariantleri korur:
//   - Her öğrencinin tahmini soru puanlarının toplamı gerçek toplam puanına eşittir.
//   - Her tahmini puan 0 ve sorunun maksimum puanı arasındadır.
//   - Temsilî öğrencilerin puanları değiştirilmez.
//   - Aynı girdi ile aynı çıktı üretilir (deterministik).

/**
 * Tahmin sonucu için döndürülen veri yapısı.
 * Öğrenci ID'sine göre o öğrencinin soru bazlı puanları dizisi.
 */
export type TahminSonucu = Record<string, number[]>;

/**
 * Temsilî öğrenci verisi.
 */
export interface TemsiliOgrenci {
  id: string;
  toplam: number; // gerçek toplam puan
  skorlar: number[]; // her soru için gerçek puan (sıra ile eşleşir)
}

/**
 * Tüm öğrenci verisi (toplam puanları).
 */
export interface OgrenciToplam {
  id: string;
  toplam: number; // gerçek toplam puan
}

/**
 * Akıllı tahmin algoritması v1.
 *
 * @param ogrenciler - Sınıftaki tüm öğrencilerin toplam puanları.
 * @param temsiliOgrenciler - Seçilen temsilî öğrencilerin gerçek toplam ve soru puanları.
 * @param maxPuanlar - Her sorunun maksimum puanı (sıra ile eşleşir).
 * @returns Her öğrenci için tahmini soru puanları (temsilîler için gerçek puanlar).
 */
export function akilliTahminV1(
  ogrenciler: OgrenciToplam[],
  temsiliOgrenciler: TemsiliOgrenci[],
  maxPuanlar: number[]
): TahminSonucu {
  // Girdi doğrulama
  if (maxPuanlar.length === 0) {
    throw new Error('Soru listesi boş olamaz');
  }
  if (temsiliOgrenciler.length === 0) {
    throw new Error('En az bir temsilî öğrenci seçilmelidir');
  }
  const m = maxPuanlar.length;

  // Temsilî öğrenci kümesi
  const reps = temsiliOgrenciler;
  const k = reps.length;

  // 1. Her soru için代表の獲得点と可能な点の合計を計算
  const repEarned: number[] = new Array(m).fill(0);
  for (const rep of reps) {
    for (let j = 0; j < m; j++) {
      repEarned[j] += rep.skorlar[j];
    }
  }
  const repPossible: number[] = maxPuanlar.map((max) => k * max);
  const questionSuccessRate: number[] = maxPuanlar.map((max, idx) => {
    const possible = repPossible[idx];
    return possible > 0 ? repEarned[idx] / possible : 0.5; //代表がいない場合は0.5（中立）
  });

  // 2. 代表の平均合計点
  const avgTotalRep =
    reps.reduce((sum, rep) => sum + rep.toplam, 0) / k;

  // 3. 各学生の事前スコアを計算（代表も含むが、後で実際のスコアで上書きする）
  const prior: Record<string, number[]> = {};
  for (const ogr of ogrenciler) {
    const total = ogr.toplam;
    const priorForStudent: number[] = new Array(m).fill(0);
    for (let j = 0; j < m; j++) {
      let priorVal = 0;
      if (avgTotalRep > 0) {
        priorVal =
          questionSuccessRate[j] * maxPuanlar[j] * (total / avgTotalRep);
      } else {
        // 代表の合計点がすべて0の場合（代表の得点がすべて0）
        priorVal = questionSuccessRate[j] * maxPuanlar[j];
      }
      // [0, maxPuan]にクランプ
      priorForStudent[j] = Math.min(
        Math.max(priorVal, 0),
        maxPuanlar[j]
      );
    }
    prior[ogr.id] = priorForStudent;
  }

  // 4. 各非代表学生について、ラムダ二分探索で合計を合わせる
  const result: TahminSonucu = {};
  for (const ogr of ogrenciler) {
    const isRep = reps.some((rep) => rep.id === ogr.id);
    if (isRep) {
      // 代表の学生は実際のスコアを使用
      const rep = reps.find((r) => r.id === ogr.id)!;
      result[ogr.id] = [...rep.skorlar]; // コピー
      continue;
    }

    const priorForStudent = prior[ogr.id];
    const total = ogr.toplam;

    // ラムダの探索範囲を決定
    // f(lambda) = Σ_j clamp(prior[j] + lambda, 0, max[j])
    // lambdaが -∞ のとき、f(lambda) = 0
    // lambdaが +∞ のとき、f(lambda) = Σ_j max[j]
    // totalは0以上sumMax以下であると仮定（バリデーションは呼び出し元で行う）

    // 二分探索でlambdaを見つける
    let lambdaLow = -10000; // 十分に小さい値
    let lambdaHigh = 10000; // 十分に大きい値
    // 実際の範囲を狭めるために、事前にf(lambdaLow)とf(lambdaHigh)を確認
    const f = (lambda: number): number => {
      let sum = 0;
      for (let j = 0; j < m; j++) {
        const val = priorForStudent[j] + lambda;
        if (val < 0) sum += 0;
        else if (val > maxPuanlar[j]) sum += maxPuanlar[j];
        else sum += val;
      }
      return sum;
    };
    // 必要なら範囲を拡張
    while (f(lambdaLow) > total) {
      lambdaLow *= 2;
    }
    while (f(lambdaHigh) < total) {
      lambdaHigh *= 2;
    }

    let lambda = 0;
    for (let iter = 0; iter < 50; iter++) {
      const lambdaMid = (lambdaLow + lambdaHigh) / 2;
      const fMid = f(lambdaMid);
      if (fMid < total) {
        lambdaLow = lambdaMid;
      } else {
        lambdaHigh = lambdaMid;
      }
    }
    lambda = (lambdaLow + lambdaHigh) / 2;

    // 一時得点を計算（クランプ済み）
    const tempScores: number[] = new Array(m).fill(0);
    for (let j = 0; j < m; j++) {
      const val = priorForStudent[j] + lambda;
      if (val < 0) tempScores[j] = 0;
      else if (val > maxPuanlar[j]) tempScores[j] = maxPuanlar[j];
      else tempScores[j] = val;
    }

    // 5. 整数点への変換（largest remainder法）
    // 一時得点の小数部分を使って、合計が正確に合うように調整
    const floored: number[] = new Array(m).fill(0);
    const fractions: number[] = new Array(m).fill(0);
    let sumFloored = 0;
    for (let j = 0; j < m; j++) {
      const f = Math.floor(tempScores[j]);
      floored[j] = f;
      fractions[j] = tempScores[j] - f;
      sumFloored += f;
    }
    const remainder = total - sumFloored; // 0以上m未満の整数
    // 分数が大きい順にソートしたインデックス
    const indicesByFraction = [...Array(m).keys()].sort(
      (a, b) => fractions[b] - fractions[a]
    );
    const finalScores: number[] = floored.slice(); // コピー
    for (let t = 0; t < remainder; t++) {
      const idx = indicesByFraction[t];
      finalScores[idx] += 1;
    }
    result[ogr.id] = finalScores;
  }

  return result;
}
