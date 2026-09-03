"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, Search, Trash2 } from "lucide-react";
import {
  duyuruGecmisiGetir,
  duyuruGecmistenKaldir,
  type DuyuruGecmisiSatiri,
} from "@/app/duyuru-gecmisi-actions";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

export function DuyuruGecmisi() {
  const [veri, setVeri] = useState<DuyuruGecmisiSatiri[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [ara, setAra] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);

  async function yukle() {
    setYukleniyor(true);
    const sonuc = await duyuruGecmisiGetir();
    setHata(sonuc.error);
    setVeri(sonuc.duyurular);
    setYukleniyor(false);
  }

  useEffect(() => {
    let etkin = true;
    void duyuruGecmisiGetir().then((sonuc) => {
      if (!etkin) return;
      setHata(sonuc.error);
      setVeri(sonuc.duyurular);
      setYukleniyor(false);
    });
    return () => { etkin = false; };
  }, []);

  const liste = useMemo(() => {
    const aranan = ara.trim().toLocaleLowerCase("tr");
    if (!aranan) return veri;
    return veri.filter((duyuru) =>
      `${duyuru.baslik} ${duyuru.mesaj} ${duyuru.gonderenAdi} ${duyuru.kurumAdi} ${duyuru.hedef}`
        .toLocaleLowerCase("tr")
        .includes(aranan),
    );
  }, [ara, veri]);

  async function sil(duyuru: DuyuruGecmisiSatiri) {
    if (!confirm("Duyuru kullanıcıların mesaj kutusundan kaldırılsın mı? Admin geçmişinde kayıt korunacaktır.")) return;
    setYukleniyor(true);
    const sonuc = await duyuruGecmistenKaldir(duyuru.id);
    if (sonuc.error) {
      setHata(sonuc.error);
      setYukleniyor(false);
      return;
    }
    await yukle();
  }

  return (
    <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone color={MINT} />
          <div>
            <h1 className="font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Duyuru Geçmişi</h1>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>Gönderen, kurum, hedef, içerik ve gönderim zamanı</p>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
          <Search size={14} color={TEXT_MUTED} />
          <input
            value={ara}
            onChange={(event) => setAra(event.target.value)}
            placeholder="Duyurularda ara"
            className="bg-transparent text-sm outline-none"
            style={{ color: TEXT }}
          />
        </label>
      </div>

      {hata && <p className="mt-3 text-sm" style={{ color: BLUSH }}>{hata}</p>}
      <div className="mt-4 flex flex-col gap-3">
        {yukleniyor && veri.length === 0 && <p style={{ color: TEXT_MUTED }}>Yükleniyor...</p>}
        {!yukleniyor && liste.length === 0 && <p style={{ color: TEXT_MUTED }}>Duyuru kaydı bulunamadı.</p>}
        {liste.map((duyuru) => (
          <article
            key={duyuru.id}
            className="rounded-2xl p-4"
            style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}`, opacity: duyuru.silindi ? 0.65 : 1 }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold" style={{ color: TEXT }}>{duyuru.baslik}</h2>
                  {duyuru.silindi && (
                    <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ color: BLUSH, border: `1px solid ${BLUSH}` }}>
                      Kullanıcılardan kaldırıldı
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>
                  {duyuru.gonderenAdi} · {duyuru.gonderenRol} · {duyuru.kurumAdi}
                </p>
                <p className="text-[11px] font-semibold" style={{ color: MINT }}>
                  Hedef: {duyuru.hedef} · {duyuru.aliciSayisi} alıcı
                </p>
              </div>
              <div className="flex items-center gap-2">
                <time className="text-[11px]" style={{ color: TEXT_MUTED }}>
                  {new Date(duyuru.createdAt).toLocaleString("tr-TR")}
                </time>
                {duyuru.silinebilir && (
                  <button
                    onClick={() => void sil(duyuru)}
                    disabled={yukleniyor}
                    aria-label="Duyuruyu kaldır"
                    className="rounded-lg p-2 disabled:opacity-50"
                    style={{ color: BLUSH, border: `1px solid ${BORDER_STRONG}` }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6" style={{ color: TEXT }}>{duyuru.mesaj}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
