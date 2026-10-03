"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Link2Off, Copy, Check, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH, SKY, SKY_BG } from "@/lib/theme";

// Öğrenci hesap bağlama (migration 0136, kullanıcı isteği 03.10.2026): hem
// okulda hem dershanede hesabı olan öğrenci iki hesabını bağlar; bundan
// sonra hangisine veri girerse diğerine de otomatik yazılır. Bütün kurallar
// veritabanında (hesap_baglama_kodu_olustur / hesap_bagla /
// hesap_baglantisini_kopar RPC'leri) — bu bileşen yalnızca arayüz.
export type HesapBaglantisi = {
  esKurum: string | null;
  esKurumTuru: string | null;
  baglantiTarihi: string | null;
  bekleyenKod: string | null;
  kodSonGecerlilik: string | null;
};

function saat(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

function aktarimOzeti(sonuc: { buraya?: { kopyalanan?: number }; oraya?: { kopyalanan?: number }; es_kurum?: string }) {
  const buraya = sonuc.buraya?.kopyalanan ?? 0;
  const oraya = sonuc.oraya?.kopyalanan ?? 0;
  return `Hesapların bağlandı. Geçmiş kayıtlardan ${oraya} tanesi ${sonuc.es_kurum ?? "diğer kuruma"} hesabına, ${buraya} tanesi bu hesaba aktarıldı. Bundan sonra hangi hesaba girersen gir, kayıt iki tarafa da yazılacak.`;
}

export function HesapBaglama({ baglanti }: { baglanti: HesapBaglantisi }) {
  const supabase = createClient();
  const router = useRouter();
  const [kod, setKod] = useState<{ kod: string; son: string } | null>(
    baglanti.bekleyenKod && baglanti.kodSonGecerlilik ? { kod: baglanti.bekleyenKod, son: baglanti.kodSonGecerlilik } : null,
  );
  const [girilenKod, setGirilenKod] = useState("");
  const [onay, setOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [koparOnayi, setKoparOnayi] = useState(false);

  async function kodUret() {
    setHata(null); setMesaj(null); setPending(true);
    const { data, error } = await supabase.rpc("hesap_baglama_kodu_olustur");
    setPending(false);
    if (error) return setHata(error.message);
    const satir = (Array.isArray(data) ? data[0] : data) as { kod: string; son_gecerlilik: string } | undefined;
    if (satir) setKod({ kod: satir.kod, son: satir.son_gecerlilik });
  }

  async function bagla(e: React.FormEvent) {
    e.preventDefault();
    setHata(null); setMesaj(null);
    if (!onay) return setHata("Devam etmek için veri paylaşımı onayını işaretle.");
    setPending(true);
    const { data, error } = await supabase.rpc("hesap_bagla", { p_kod: girilenKod, p_kvkk_onay: true });
    setPending(false);
    if (error) return setHata(error.message);
    setMesaj(aktarimOzeti((data ?? {}) as Parameters<typeof aktarimOzeti>[0]));
    setGirilenKod(""); setOnay(false);
    router.refresh();
  }

  async function kopar() {
    setHata(null); setMesaj(null); setPending(true);
    const { error } = await supabase.rpc("hesap_baglantisini_kopar");
    setPending(false);
    setKoparOnayi(false);
    if (error) return setHata(error.message);
    setMesaj("Bağlantı kaldırıldı. Şimdiye kadar aktarılan kayıtlar iki hesapta da duruyor; yeni girişler artık kopyalanmayacak.");
    router.refresh();
  }

  async function kodKopyala() {
    if (!kod) return;
    try {
      await navigator.clipboard.writeText(kod.kod);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch { /* pano izni yoksa kod zaten ekranda */ }
  }

  const bagli = !!baglanti.esKurum;
  const inputStil = { border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT };

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: SKY_BG }}>
          <Link2 size={14} color={SKY} />
        </div>
        <h2 className="text-[14px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Diğer kurumdaki hesabım</h2>
      </div>

      {bagli ? (
        <>
          <p className="mt-3 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
            Bu hesap <b style={{ color: TEXT }}>{baglanti.esKurum}</b> hesabınla bağlı
            {baglanti.baglantiTarihi ? ` (${new Date(baglanti.baglantiTarihi).toLocaleDateString("tr-TR")})` : ""}.
            Girdiğin konu çalışmaları, soru çözümleri ve denemeler iki hesaba da otomatik yazılıyor. Öğretmen görevleri
            ve kurumun yüklediği deneme sonuçları her kurumda ayrı kalır.
          </p>
          {!koparOnayi ? (
            <button type="button" onClick={() => setKoparOnayi(true)} disabled={pending}
              className="sfec-btn mt-3 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              <Link2Off size={13} /> Bağlantıyı kaldır
            </button>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: TEXT }}>Emin misin?</span>
              <button type="button" onClick={kopar} disabled={pending}
                className="sfec-btn text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60" style={{ background: BLUSH, color: "#fff" }}>
                {pending ? "Kaldırılıyor..." : "Evet, kaldır"}
              </button>
              <button type="button" onClick={() => setKoparOnayi(false)} disabled={pending}
                className="sfec-btn text-xs font-bold px-3.5 py-2 rounded-xl" style={{ color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
                Vazgeç
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mt-3 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
            Hem okulunda hem dershanende SeFu Koç hesabın varsa ikisini bağla, verini tek yere gir. Bağlayınca
            geçmiş kayıtların da iki hesaba aktarılır. İki hesapta da adın aynı yazılmış olmalı.
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 rounded-2xl p-3.5" style={{ border: `2px dashed ${BORDER_STRONG}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Kodu bu hesapta üret</p>
              {kod ? (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-[0.2em]" style={{ color: TEXT, fontFamily: "ui-monospace, monospace" }}>{kod.kod}</span>
                    <button type="button" onClick={kodKopyala} aria-label="Kodu kopyala" className="sfec-btn p-1.5 rounded-lg" style={{ color: TEXT_MUTED }}>
                      {kopyalandi ? <Check size={14} color={MINT} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>
                    Saat {saat(kod.son)}&apos;e kadar geçerli. Diğer hesabına giriş yap, Profilim&apos;de bu kodu yaz.
                  </p>
                </div>
              ) : (
                <button type="button" onClick={kodUret} disabled={pending}
                  className="sfec-btn mt-2 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
                  style={{ background: MINT, color: MINT_ON }}>
                  <KeyRound size={13} /> Bağlama kodu üret
                </button>
              )}
            </div>

            <form onSubmit={bagla} className="flex-1 rounded-2xl p-3.5 flex flex-col gap-2" style={{ border: `2px dashed ${BORDER_STRONG}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>ya da diğer hesabında ürettiğin kodu gir</p>
              <input value={girilenKod} onChange={(e) => setGirilenKod(e.target.value.toUpperCase())}
                placeholder="ABCD-1234" maxLength={9} autoComplete="off"
                className="text-sm px-3 py-1.5 rounded-xl outline-none tracking-[0.15em]" style={inputStil} />
              <label className="flex items-start gap-2 text-[11px] leading-snug" style={{ color: TEXT_MUTED }}>
                <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} className="mt-0.5" />
                <span>
                  Konu çalışması, soru çözümü ve deneme kayıtlarımın iki kurumdaki hesabım arasında paylaşılmasına ve her iki
                  kurumun yetkililerince görülmesine onay veriyorum. Bu onayı bağlantıyı kaldırarak geri alabilirim.
                </span>
              </label>
              <button type="submit" disabled={pending || girilenKod.replace(/[^A-Za-z0-9]/g, "").length !== 8}
                className="sfec-btn self-start flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
                style={{ background: MINT, color: MINT_ON }}>
                <Link2 size={13} /> {pending ? "Bağlanıyor..." : "Hesapları bağla"}
              </button>
            </form>
          </div>
        </>
      )}

      {hata && <div className="mt-3 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</div>}
      {mesaj && (
        <div className="mt-3 flex items-start gap-1.5 text-xs font-semibold leading-relaxed" style={{ color: MINT }}>
          <Check size={13} className="mt-0.5 shrink-0" /> <span>{mesaj}</span>
        </div>
      )}
    </div>
  );
}
