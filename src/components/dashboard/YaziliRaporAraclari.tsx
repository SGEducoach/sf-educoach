"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

// Rapor sayfasının üst araç çubuğu — yazdırmada görünmez.
export function YaziliRaporAraclari() {
  const router = useRouter();
  const geri = () => {
    // Rapor doğrudan bir bağlantıdan açıldıysa geri gidilecek sayfa yok.
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  };

  return (
    <div className="mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-2 print:hidden">
      <button
        type="button"
        onClick={geri}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#adb5bd] bg-white px-3 py-2 text-sm font-semibold text-[#212529]"
      >
        <ArrowLeft size={16} /> Geri
      </button>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-[#495057]">PDF için yazdırma penceresinde &quot;PDF olarak kaydet&quot;i seçin.</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2540] px-4 py-2 text-sm font-semibold text-white"
        >
          <Printer size={16} /> Yazdır / PDF
        </button>
      </div>
    </div>
  );
}
