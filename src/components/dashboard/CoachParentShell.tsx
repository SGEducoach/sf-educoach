"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Plus, UserPlus } from "lucide-react";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, TEXT, TEXT_MUTED, BLUSH,
} from "@/lib/theme";
import { StudentPanel, type StudentPanelData } from "./StudentPanel";
import { ogrenciBagla } from "@/app/dashboard/actions";

export function CoachParentShell({
  students, kind,
}: {
  students: StudentPanelData[];
  kind: "coach" | "parent";
}) {
  const [seciliId, setSeciliId] = useState<string | null>(students[0]?.id ?? null);
  const [formAcik, setFormAcik] = useState(false);
  const [email, setEmail] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const secili = students.find((s) => s.id === seciliId) ?? students[0] ?? null;

  function baglaGonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startTransition(async () => {
      const res = await ogrenciBagla(kind, email);
      if (res.error) setHata(res.error);
      else {
        setEmail("");
        setFormAcik(false);
      }
    });
  }

  return (
    <div>
      <div className="mb-7">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Öğrenciler</span>
            <span style={{ color: TEXT_MUTED }} className="text-xs">· {students.length} kişi</span>
          </div>
          <button onClick={() => setFormAcik(!formAcik)}
            className="sgec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
            style={{ background: formAcik ? MINT : MINT_BG, color: formAcik ? "#12321F" : MINT }}>
            <UserPlus size={12} /> Öğrenci bağla
          </button>
        </div>

        {formAcik && (
          <form onSubmit={baglaGonder} className="mb-4 p-3.5 rounded-2xl flex flex-col sm:flex-row gap-2.5 items-start sm:items-end" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
            <label className="flex flex-col gap-1 flex-1 w-full">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Öğrencinin e-postası</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none w-full" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG1, color: TEXT }} />
            </label>
            <button type="submit" disabled={pending} className="sgec-btn text-xs font-bold py-2 px-4 rounded-xl disabled:opacity-60 shrink-0" style={{ background: MINT, color: "#12321F" }}>
              <Plus size={12} className="inline -mt-0.5 mr-1" />{pending ? "Ekleniyor..." : "Ekle"}
            </button>
            {hata && <div className="text-xs font-semibold w-full" style={{ color: BLUSH }}>{hata}</div>}
          </form>
        )}

        {students.length === 0 ? (
          <p style={{ color: TEXT_MUTED }} className="text-sm py-6 text-center rounded-3xl">
            Henüz bağlı öğrenci yok. Yukarıdan öğrencinin e-postasını girerek bağlayabilirsiniz.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {students.map((s, i) => {
              const sonDeneme = s.exams[s.exams.length - 1];
              const yuzde = sonDeneme ? Math.min(100, (sonDeneme.puan / s.hedefPuan) * 100) : 0;
              const seciliMi = s.id === seciliId;
              const baslar = s.ad.split(" ").map((p) => p[0]).join("");
              return (
                <button
                  key={s.id}
                  onClick={() => setSeciliId(s.id)}
                  className="sgec-fade sgec-card text-left rounded-3xl p-4"
                  style={{
                    background: seciliMi ? BG1_ALT : BG1,
                    border: `1px solid ${seciliMi ? MINT : BORDER}`,
                    animationDelay: `${i * 60}ms`,
                    boxShadow: seciliMi ? "0 8px 22px rgba(0,0,0,0.28)" : "none",
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{ background: seciliMi ? MINT_BG : "rgba(255,255,255,0.06)", color: seciliMi ? MINT : TEXT_MUTED }}>
                      {baslar}
                    </div>
                    <span style={{ color: TEXT }} className="font-bold text-sm flex-1">{s.ad}</span>
                    <ChevronRight size={14} color={TEXT_MUTED} />
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div style={{ width: `${yuzde}%`, background: MINT, height: "100%", transition: "width .6s ease" }} />
                  </div>
                  <div style={{ color: TEXT_MUTED }} className="text-[11px]">
                    {s.hedefBolum} · Hedefe %{Math.round(yuzde)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {secili && (
        <StudentPanel
          student={secili}
          canAddExam={false}
          canAddStudy={false}
          canAddNotification={kind === "coach"}
        />
      )}
    </div>
  );
}
