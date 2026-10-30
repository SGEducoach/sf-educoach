// Yalnız testler için: SMS modülünün kullandığı Supabase sorgu zincirini
// (select/eq/in/gte/order/limit/range/maybeSingle/insert) bellekte taklit eder.
export type Satir = Record<string, unknown>;

// Yalnız bu modülün kullandığı sorgu zincirini taklit eden bellek içi Supabase.
export function sahteAdmin(tablolar: Record<string, Satir[]>) {
  const eklenen: Record<string, Satir[]> = {};
  return {
    eklenen,
    from(tablo: string) {
      const suzgecler: ((r: Satir) => boolean)[] = [];
      let bas = 0;
      let son = Infinity;
      let sinir = Infinity;
      const satirlar = () => (tablolar[tablo] ?? []).filter((r) => suzgecler.every((f) => f(r))).slice(bas, son + 1).slice(0, sinir);
      const b = {
        select: () => b,
        eq: (k: string, v: unknown) => { suzgecler.push((r) => r[k] === v); return b; },
        in: (k: string, v: unknown[]) => { suzgecler.push((r) => v.includes(r[k])); return b; },
        gte: (k: string, v: string) => { suzgecler.push((r) => String(r[k]) >= v); return b; },
        order: () => b,
        limit: (n: number) => { sinir = n; return b; },
        range: (a: number, z: number) => { bas = a; son = z; return b; },
        maybeSingle: () => Promise.resolve({ data: satirlar()[0] ?? null, error: null }),
        insert: (satir: Satir) => { (eklenen[tablo] ??= []).push(satir); return Promise.resolve({ error: null }); },
        then: (coz: (v: unknown) => unknown) => coz({ data: satirlar(), count: satirlar().length, error: null }),
      };
      return b;
    },
  };
}
