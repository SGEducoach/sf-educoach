import type { ReactNode } from "react";

// Bağımlılık eklemeden (react-markdown vb.) blog yazılarını semantik HTML'e
// çeviren küçük bir render. dangerouslySetInnerHTML KULLANMIYOR — her şey
// React elemanı olarak üretiliyor, dolayısıyla XSS yüzeyi yok.
// Desteklenenler: ## / ### başlık, - liste, 1. numaralı liste, > alıntı,
// **kalın**, *italik*, [bağlantı](url), ![görsel](url), boş satırla paragraf.
const METIN = "#3F4B5A";
const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";

function satirIci(metin: string, anahtar: string): ReactNode[] {
  const parcalar: ReactNode[] = [];
  // Sıra önemli: görsel (![]) bağlantıdan (\[]) önce denenmeli.
  const desen = /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let son = 0;
  let e: RegExpExecArray | null;
  let i = 0;
  while ((e = desen.exec(metin)) !== null) {
    if (e.index > son) parcalar.push(metin.slice(son, e.index));
    const k = `${anahtar}-${i++}`;
    if (e[2] !== undefined) {
      parcalar.push(
        // eslint-disable-next-line @next/next/no-img-element -- yönetilen Supabase Storage görseli
        <img key={k} src={e[2]} alt={e[1] ?? ""} className="my-4 w-full rounded-2xl" loading="lazy" />,
      );
    } else if (e[4] !== undefined) {
      parcalar.push(<a key={k} href={e[4]} className="underline" style={{ color: TURKUAZ }}>{e[3]}</a>);
    } else if (e[5] !== undefined) {
      parcalar.push(<strong key={k} style={{ color: LACIVERT }}>{e[5]}</strong>);
    } else if (e[6] !== undefined) {
      parcalar.push(<em key={k}>{e[6]}</em>);
    }
    son = e.index + e[0].length;
  }
  if (son < metin.length) parcalar.push(metin.slice(son));
  return parcalar;
}

export function BasitMarkdown({ icerik }: { icerik: string }) {
  const bloklar = icerik.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      {bloklar.map((blok, bi) => {
        const anahtar = `b${bi}`;
        const satirlar = blok.split("\n");

        if (blok.startsWith("### ")) {
          return <h3 key={anahtar} className="mt-2 text-lg font-extrabold sm:text-xl" style={{ color: LACIVERT }}>{satirIci(blok.slice(4), anahtar)}</h3>;
        }
        if (blok.startsWith("## ")) {
          return <h2 key={anahtar} className="mt-3 text-xl font-extrabold sm:text-2xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>{satirIci(blok.slice(3), anahtar)}</h2>;
        }
        if (satirlar.every((s) => /^[-*]\s+/.test(s))) {
          return (
            <ul key={anahtar} className="list-disc space-y-1.5 pl-5 text-base leading-7" style={{ color: METIN }}>
              {satirlar.map((s, si) => <li key={si}>{satirIci(s.replace(/^[-*]\s+/, ""), `${anahtar}-${si}`)}</li>)}
            </ul>
          );
        }
        if (satirlar.every((s) => /^\d+[.)]\s+/.test(s))) {
          return (
            <ol key={anahtar} className="list-decimal space-y-1.5 pl-5 text-base leading-7" style={{ color: METIN }}>
              {satirlar.map((s, si) => <li key={si}>{satirIci(s.replace(/^\d+[.)]\s+/, ""), `${anahtar}-${si}`)}</li>)}
            </ol>
          );
        }
        if (blok.startsWith("> ")) {
          return (
            <blockquote key={anahtar} className="rounded-r-xl border-l-4 py-2 pl-4 text-base italic leading-7" style={{ borderColor: TURKUAZ, color: METIN, background: "#F7FAFB" }}>
              {satirIci(blok.replace(/^>\s?/gm, ""), anahtar)}
            </blockquote>
          );
        }
        return <p key={anahtar} className="text-base leading-7 sm:text-lg" style={{ color: METIN }}>{satirIci(blok, anahtar)}</p>;
      })}
    </div>
  );
}
