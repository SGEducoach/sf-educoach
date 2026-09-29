"use client";

import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { DershaneDenemePdfFormu } from "@/components/dashboard/DershaneDenemePdfFormu";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

// Kullanıcı isteği (29.09.2026): "deneme yükle önemli bir başlık ve okullar
// içinde yer alıyor, yeri çok küçük, bulunmaz bir yerde". Artık sol menüde
// kendi bölümü var; burada önce kurum seçilir, sonra aynı yükleme formu
// tam genişlikte açılır. Kurum seçimi URL'de (?okul=) tutuluyor — Okullar
// sayfasıyla aynı parametre, iki sayfa arasında geçişte seçim korunuyor.
export function DenemeYuklemeSayfasi({ okullar, seciliOkulId }: {
  okullar: { id: string; ad: string; tur: "okul" | "dershane" }[];
  seciliOkulId: string | null;
}) {
  const router = useRouter();
  const secili = okullar.find((o) => o.id === seciliOkulId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: BORDER }}>
            <FileSpreadsheet size={18} color={MINT} />
          </div>
          <div>
            <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Deneme Yükle</h2>
            <p style={{ color: TEXT_MUTED }} className="text-xs">
              Yayınevi deneme sonuçlarını PDF ya da Excel ile toplu yükleyin. Sonuçlar yalnızca seçtiğiniz kurumun öğrencileriyle eşleştirilir.
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Kurum</span>
          <select value={seciliOkulId ?? ""} onChange={(e) => router.push(`/yonetici/deneme-yukle?okul=${encodeURIComponent(e.target.value)}`)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none sm:max-w-md"
            style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <option value="">Kurum seçin</option>
            {okullar.map((o) => (
              <option key={o.id} value={o.id}>{o.ad}{o.tur === "dershane" ? " · dershane" : ""}</option>
            ))}
          </select>
        </label>

        <p className="mt-3 text-[11px]" style={{ color: TEXT_MUTED }}>
          Adı eşleşmeyen satırlar{" "}
          <Link href="/yonetici/pdf-eslesme" className="underline" style={{ color: MINT }}>PDF Eşleştirme</Link>{" "}
          bölümüne düşer; oradan elle bir öğrenciye bağlanır.
        </p>
      </div>

      {secili
        ? <DershaneDenemePdfFormu key={secili.id} schoolId={secili.id} />
        : <p className="text-sm" style={{ color: TEXT_MUTED }}>Yüklemeye başlamak için yukarıdan bir kurum seçin.</p>}
    </div>
  );
}
