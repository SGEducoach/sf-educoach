"use client";

import { useState, useTransition } from "react";
import { Search, Users } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { kullaniciAra, type KullaniciSonuc } from "@/app/yonetici/actions";
import type { UserRole } from "@/lib/types";

const ROL_SEKME: { id: UserRole | "hepsi"; ad: string }[] = [
  { id: "hepsi", ad: "Tümü" },
  { id: "ogrenci", ad: "Öğrenci" },
  { id: "ogretmen", ad: "Öğretmen" },
  { id: "veli", ad: "Veli" },
  { id: "mudur", ad: "Müdür" },
];

const ROL_ETIKET: Record<UserRole, string> = {
  ogrenci: "Öğrenci", ogretmen: "Öğretmen", veli: "Veli", mudur: "Müdür", admin: "Admin",
};

// Okul/sınıf sınırı olmadan tüm hesaplarda arama — admin panelinin "tek
// kontrol noktası" ilkesinin bir parçası: herhangi bir kullanıcıyı bulmak
// için doğru okulu/sınıfı önceden bilmeye gerek yok.
export function KullaniciArama() {
  const [sorgu, setSorgu] = useState("");
  const [rol, setRol] = useState<UserRole | "hepsi">("hepsi");
  const [sonuclar, setSonuclar] = useState<KullaniciSonuc[]>([]);
  const [aramaYapildi, setAramaYapildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ara(q: string, r: UserRole | "hepsi") {
    setHata(null);
    if (q.trim().length < 2) { setSonuclar([]); setAramaYapildi(false); return; }
    startTransition(async () => {
      const res = await kullaniciAra(q, r);
      if (res.error) return setHata(res.error);
      setSonuclar(res.sonuclar);
      setAramaYapildi(true);
    });
  }

  return (
    <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
          <Users size={13} color={LILAC} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Kullanıcı ara</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} color={TEXT_MUTED} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={sorgu}
            onChange={(e) => { setSorgu(e.target.value); ara(e.target.value, rol); }}
            placeholder="Ad veya e-posta ile ara (en az 2 karakter)..."
            className="text-sm pl-9 pr-3 py-2 rounded-xl outline-none w-full"
            style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
          />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap mb-4">
        {ROL_SEKME.map((r) => {
          const aktif = rol === r.id;
          return (
            <button key={r.id} type="button"
              onClick={() => { setRol(r.id); ara(sorgu, r.id); }}
              className="sgec-btn text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: aktif ? MINT : "rgba(255,255,255,0.06)", color: aktif ? "#0B3B24" : TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
              {r.ad}
            </button>
          );
        })}
      </div>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-2">{hata}</div>}

      {pending ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Aranıyor...</p>
      ) : aramaYapildi && sonuclar.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Sonuç bulunamadı.</p>
      ) : sonuclar.length > 0 ? (
        <div className="flex flex-col gap-2">
          {sonuclar.map((k) => (
            <div key={k.id} className="rounded-xl px-3.5 py-2.5 flex items-center justify-between flex-wrap gap-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
              <div>
                <div style={{ color: TEXT }} className="text-sm font-semibold">
                  {k.ad} <span style={{ color: LILAC }} className="text-[10px] font-bold ml-1">{ROL_ETIKET[k.role]}</span>
                </div>
                <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">
                  {[k.email, k.okulAdi, k.sinifAdi, k.okulNo && `#${k.okulNo}`, k.brans].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
