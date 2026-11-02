// Kurum SMS Geçmişi (kullanıcı isteği 02.11.2026, migration 0185): admin
// seçtiği kurumdan kimin, ne zaman, hangi numaralara, hangi içerikle SMS
// gönderdiğini görür. Sunucu bileşeni; sayfa (yonetici/page.tsx) yalnız
// admin'e açılır.
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { kurumSmsGecmisiGetir, type KurumSmsKaydi } from "@/lib/sms-veri";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

const DURUM: Record<KurumSmsKaydi["durum"], string> = {
  gonderildi: "Gönderildi", zamanlandi: "Zamanlandı", kismen: "Kısmen gönderildi", hata: "Gönderilemedi",
};

// 905321234567 → 0532 123 45 67
function telefon(t: string): string {
  const n = t.slice(2);
  return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`;
}

const tarih = (iso: string) => new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export async function KurumSmsGecmisi({ okullar, seciliOkulId }: { okullar: { id: string; ad: string }[]; seciliOkulId: string | null }) {
  const secili = okullar.find((o) => o.id === seciliOkulId) ?? okullar[0] ?? null;
  const kayitlar = secili ? await kurumSmsGecmisiGetir(createAdminClient(), secili.id) : [];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}><MessageSquare size={16} color={MINT} /></div>
          <div>
            <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Kurum SMS Geçmişi</h1>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>
              Seçilen kurumdan gönderilen SMS&apos;ler: gönderen, tarih, içerik ve alıcı numaraları (son 200 gönderim). 2 Kasım 2026&apos;dan önceki gönderimlerde numaralar kaydedilmiyordu.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {okullar.map((o) => (
            <Link key={o.id} href={`/yonetici/kurum-sms-gecmisi?okul=${o.id}`} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold"
              style={o.id === secili?.id ? { background: MINT, color: MINT_ON, border: `2px solid ${MINT}` } : { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
              {o.ad}
            </Link>
          ))}
        </div>
      </div>

      {kayitlar.length === 0 ? (
        <p className="rounded-2xl p-5 text-sm" style={{ background: BG1, color: TEXT_MUTED, border: `2px solid ${BORDER}` }}>
          {secili ? `${secili.ad} henüz SMS göndermemiş.` : "Kurum yok."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {kayitlar.map((k) => (
            <details key={k.id} className="rounded-2xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
              <summary className="cursor-pointer list-none flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <strong style={{ color: TEXT }}>{tarih(k.tarih)}</strong>
                  <span style={{ color: TEXT }}>{k.gonderen ?? "Silinmiş kullanıcı"}</span>
                  <span className="rounded-md px-1.5 py-0.5 font-bold" style={{ background: BG1_ALT, color: TEXT_MUTED }}>{k.gonderenRolu}</span>
                  <span className="rounded-md px-1.5 py-0.5 font-bold" style={{ background: BG1_ALT, color: TEXT_MUTED }}>{k.aliciTuru === "mezun" ? "Mezunlara" : "Velilere"}</span>
                  <span style={{ color: k.durum === "hata" || k.durum === "kismen" ? BLUSH : MINT }} className="font-bold">{DURUM[k.durum]}</span>
                  <span style={{ color: TEXT_MUTED }}>{k.aliciSayisi} alıcı{k.gecersizSayisi ? ` · ${k.gecersizSayisi} geçersiz numara` : ""} · başlık {k.baslik}</span>
                </span>
                <span className="text-sm" style={{ color: TEXT }}>{k.icerik}</span>
                {k.hedef && <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{k.hedef}{k.zamanlanmis ? ` · gönderim zamanı ${tarih(k.zamanlanmis)}` : ""}</span>}
                {k.hata && <span className="text-[11px]" style={{ color: BLUSH }}>{k.hata}</span>}
              </summary>
              <div className="mt-3">
                {k.alicilar === null ? (
                  <p className="text-xs" style={{ color: TEXT_MUTED }}>Bu gönderimin alıcı numaraları kaydedilmemiş (2 Kasım 2026 öncesi).</p>
                ) : k.alicilar.length === 0 ? (
                  <p className="text-xs" style={{ color: TEXT_MUTED }}>Alıcı yok.</p>
                ) : (
                  <div className="max-h-72 overflow-auto rounded-xl" style={{ border: `1px solid ${BORDER_STRONG}` }}>
                    <table className="w-full text-xs">
                      <thead><tr style={{ background: BG1_ALT, color: TEXT }}><th className="px-3 py-1.5 text-left">Numara</th><th className="px-3 py-1.5 text-left">Kime</th></tr></thead>
                      <tbody>
                        {k.alicilar.map((a) => (
                          <tr key={a.telefon} style={{ borderTop: `1px solid ${BORDER}`, color: TEXT }}>
                            <td className="px-3 py-1 whitespace-nowrap font-mono">{telefon(a.telefon)}</td>
                            <td className="px-3 py-1">{a.alici ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
