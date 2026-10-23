"use client";

import { useState } from "react";
import { Users, Target, ListChecks } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import type { DershaneAnaSayfaVerisi, HaftalikNokta, NetTuru } from "@/lib/dershane-ana-sayfa";
import { NET_TURLERI, noktaMetni } from "@/lib/dershane-ana-sayfa-hesap";
import { kapsamKarari } from "@/lib/kapsam";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT, MINT_BG,
  SKY, SKY_BG, BUTTER, LILAC, BLUSH, PEACH,
} from "@/lib/theme";

// Kapsam dürüstlüğü (Rehber Radarı Adım 1, kullanıcı onayı 07.10.2026):
// bir ortalama KAÇ ÖĞRENCİDEN geldiğini söylemeden gösterilmez. Elbistan'da
// "9. sınıf net ortalaması" 20 öğrencinin 2'sinden hesaplanıyordu; rehber
// bunu "düşük performans" diye okuyor, oysa gerçek "ölçülmemiş".
//
// Çizgi kararı (20.10.2026 denetimi): kapsamı yetersiz haftanın ortalaması
// veri katmanında HİÇ üretilmez (netOrtalama null) ve çizgi o haftada KOPAR;
// önceden bütün çizgi kesikli çiziliyor ama yetersiz haftanın ham değeri
// yine de normal bir nokta gibi bağlanıyordu.

// Kademe (9./10./11./12. sınıf) çizgi/bar rengi — dersRenkleri (theme.ts)
// ile aynı paletten, en fazla 4 kademe olduğu için 4 sabit renk yeterli.
const KADEME_RENK: Record<string, string> = { "9": MINT, "10": SKY, "11": BUTTER, "12": LILAC };
const KADEME_RENGI = (seviye: string) => KADEME_RENK[seviye] ?? TEXT_MUTED;
const SINIF_RENKLERI = [MINT, SKY, BUTTER, LILAC, PEACH, BLUSH, TEXT_MUTED, TEXT];

function tarihFormat(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

function IstatKart({ icon: Icon, etiket, deger, altYazi, renk, bg }: {
  icon: typeof Target; etiket: string; deger: string | number; altYazi?: string; renk: string; bg: string;
}) {
  return (
    <div className="sfec-fade rounded-3xl p-4 flex-1 min-w-0" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon size={14} color={renk} />
        </div>
        <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold uppercase tracking-wider">{etiket}</span>
      </div>
      <div style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[28px] font-bold leading-none">{deger}</div>
      {altYazi && <div style={{ color: TEXT_MUTED }} className="text-xs mt-1.5">{altYazi}</div>}
    </div>
  );
}

interface SeriBilgisi { ad: string; renk: string }

// Tooltip: recharts boş (null) noktaları listelemez; kapsamı yetersiz hafta
// "hiç veri yok" gibi görünürdü. Burada her serinin o haftaki durumu — net
// ya da NEDEN net olmadığı — kendi n/toplam'ıyla yazılır.
function NetTooltip({ active, label, payload, seriler }: {
  active?: boolean; label?: string;
  payload?: readonly { payload?: unknown }[];
  seriler: SeriBilgisi[];
}) {
  if (!active || !payload?.length) return null;
  const satir = (payload[0].payload ?? {}) as Record<string, unknown>;
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}`, maxWidth: 260 }}>
      <div className="mb-1 font-semibold" style={{ color: TEXT_MUTED }}>{String(satir.aralik ?? label ?? "")}</div>
      {seriler.map((s) => (
        <div key={s.ad} className="mt-0.5" style={{ color: TEXT }}>
          <span style={{ color: s.renk }} className="font-bold">{s.ad}: </span>
          {String(satir[`${s.ad}|metin`] ?? "—")}
        </div>
      ))}
    </div>
  );
}

function TurSecici({ tur, setTur, veri }: { tur: NetTuru; setTur: (t: NetTuru) => void; veri: DershaneAnaSayfaVerisi }) {
  return (
    <div role="tablist" aria-label="Deneme türü" className="flex flex-wrap items-center gap-2">
      {NET_TURLERI.map((t) => {
        const secili = t === tur;
        const s = veri.turler[t];
        return (
          <button key={t} type="button" role="tab" aria-selected={secili} onClick={() => setTur(t)}
            className="sfec-btn rounded-xl px-3 py-1.5 text-xs font-bold"
            style={{ background: secili ? BG1_ALT : "transparent", color: secili ? TEXT : TEXT_MUTED, border: `2px solid ${secili ? BORDER_STRONG : BORDER}` }}>
            {t} denemeleri
            <span className="ml-1.5 font-normal" style={{ color: TEXT_MUTED }}>{s.denemeOgrenci} öğrenci</span>
          </button>
        );
      })}
    </div>
  );
}

export function DershaneAnaSayfa({ veri }: { veri: DershaneAnaSayfaVerisi }) {
  const [tur, setTur] = useState<NetTuru>(veri.varsayilanTur);
  const seri = veri.turler[tur];

  const buHaftaGenel = seri.genel[seri.genel.length - 1];
  const buHaftaSoru = veri.soru.genel[veri.soru.genel.length - 1];
  const buHaftaKademeSoru = veri.soru.kademeler.map((k) => `${k.seviye}. sınıf: ${k.noktalar[k.noktalar.length - 1].soruSayisi}`).join(" · ");

  // Bu haftanın kapsamı — kart ve kademe listesi aynı karara bakar.
  const genelKapsam = kapsamKarari(buHaftaGenel.denemeOgrenci, veri.ogrenciSayisi);
  const kademeKapsamlari = seri.kademeler.map((k) => {
    const nokta = k.noktalar[k.noktalar.length - 1];
    return { seviye: k.seviye, ogrenciSayisi: k.ogrenciSayisi, nokta, karar: kapsamKarari(nokta.denemeOgrenci, k.ogrenciSayisi) };
  });

  const { baslangic, bitis } = veri.tarihAraligi;
  const aralikMetni = `${tarihFormat(baslangic)} – ${tarihFormat(bitis)}`;
  const aralik = (n: HaftalikNokta) => `${tarihFormat(n.haftaBaslangic)} – ${tarihFormat(n.haftaBitis)}`;

  const genelSerileri: SeriBilgisi[] = [
    { ad: "Genel", renk: TEXT },
    ...seri.kademeler.map((k) => ({ ad: `${k.seviye}. sınıf`, renk: KADEME_RENGI(k.seviye) })),
  ];
  const netChartData = seri.genel.map((n, i) => {
    const satir: Record<string, string | number | null> = {
      tarih: tarihFormat(n.haftaBaslangic), aralik: aralik(n), Genel: n.netOrtalama, "Genel|metin": noktaMetni(n),
    };
    for (const k of seri.kademeler) {
      satir[`${k.seviye}. sınıf`] = k.noktalar[i].netOrtalama;
      satir[`${k.seviye}. sınıf|metin`] = noktaMetni(k.noktalar[i]);
    }
    return satir;
  });

  const sinifSerileri: SeriBilgisi[] = seri.siniflar.map((x, i) => ({ ad: x.ad, renk: SINIF_RENKLERI[i % SINIF_RENKLERI.length] }));
  const sinifChartData = seri.genel.map((n, i) => {
    const satir: Record<string, string | number | null> = { tarih: tarihFormat(n.haftaBaslangic), aralik: aralik(n) };
    for (const x of seri.siniflar) { satir[x.ad] = x.noktalar[i].netOrtalama; satir[`${x.ad}|metin`] = noktaMetni(x.noktalar[i]); }
    return satir;
  });

  const soruChartData = veri.soru.genel.map((n, i) => {
    const satir: Record<string, string | number> = { tarih: tarihFormat(n.haftaBaslangic) };
    for (const k of veri.soru.kademeler) satir[`${k.seviye}. sınıf`] = k.noktalar[i].soruSayisi;
    return satir;
  });

  const turdeDenemeVar = seri.denemeKaydi > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <IstatKart icon={Users} etiket="Toplam öğrenci" deger={veri.ogrenciSayisi} renk={MINT} bg={MINT_BG} />
        <IstatKart icon={Target} etiket={`Bu hafta ${tur} net ort.`}
          deger={genelKapsam.yeterli ? (buHaftaGenel.netOrtalama ?? "—") : "—"}
          altYazi={genelKapsam.uyari
            ?? (buHaftaGenel.denemeSayisi > 0 ? `${buHaftaGenel.denemeSayisi} ${tur} denemesi · ${genelKapsam.etiket}` : `Bu hafta ${tur} denemesi yok`)}
          renk={SKY} bg={SKY_BG} />
        <IstatKart icon={ListChecks} etiket="Bu hafta çözülen soru" deger={buHaftaSoru.soruSayisi}
          altYazi={buHaftaKademeSoru || undefined} renk={MINT} bg={MINT_BG} />
      </div>

      {veri.ogrenciSayisi === 0 ? (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}`, color: TEXT_MUTED }}>
          Kurumunuzda henüz kayıtlı öğrenci yok — veriler öğrenciler eklendikçe burada görünecek.
        </div>
      ) : (
        <>
          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold block mb-2">
              Net grafikleri hangi deneme türüne ait?
            </span>
            <TurSecici tur={tur} setTur={setTur} veri={veri} />
            <p className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>
              TYT ve AYT netleri birbirine karıştırılmaz; aşağıdaki net kartları ve grafikleri yalnızca
              {" "}<strong style={{ color: TEXT }}>{tur}</strong> denemelerini gösterir.
              {veri.digerDenemeKaydi > 0 && ` Branş denemeleri (${veri.digerDenemeKaydi} kayıt) bu grafiklere dahil değildir.`}
            </p>
          </div>

          {/* Kademe kapsamı — ortalamadan ÖNCE geliyor, çünkü "ölçülmemiş"i
              "düşük performans" sanmak bu panelin en pahalı hatası. */}
          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold block">
              Bu haftanın kapsamı — {tur}
            </span>
            <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
              Net ortalaması yalnızca {tur} denemesi girmiş öğrencilerden hesaplanır. Kapsam düşükse ortalama gösterilmez — o kademe
              {" "}<strong style={{ color: TEXT }}>başarısız değil, ölçülmemiş</strong> demektir.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {kademeKapsamlari.map((k) => (
                <div key={k.seviye} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2" style={{ background: BG1_ALT }}>
                  <span className="text-sm font-semibold" style={{ color: KADEME_RENGI(k.seviye) }}>{k.seviye}. sınıf</span>
                  {k.karar.yeterli ? (
                    <span className="text-xs" style={{ color: TEXT }}>
                      <strong>{k.nokta.netOrtalama ?? "—"}</strong> net · <span style={{ color: TEXT_MUTED }}>{k.karar.etiket}</span>
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: BLUSH }}>{k.karar.uyari}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-1 block">
              {tur} net ortalaması — son 8 hafta
            </span>
            {!turdeDenemeVar ? (
              <p className="py-8 text-center text-xs" style={{ color: TEXT_MUTED }}>
                Son 8 haftada ({aralikMetni}) {tur} denemesi girilmemiş; grafik çizilmedi.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs" style={{ color: TEXT_MUTED }}>
                  Çizginin koptuğu haftalarda yeterli öğrenci deneme girmemiştir (bir kapsamın en az %30&apos;u gerekir);
                  o hafta için ortalama üretilmez, eğilim olarak okunmamalı. Noktaların üzerine gelince n/toplam öğrenci görünür.
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={netChartData} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                    <XAxis dataKey="tarih" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                    <RTooltip cursor={false} filterNull={false}
                      content={(p) => <NetTooltip active={p.active} label={String(p.label ?? "")} payload={p.payload} seriler={genelSerileri} />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: TEXT_MUTED }} />
                    <Line type="monotone" dataKey="Genel" stroke={TEXT} strokeWidth={2.5}
                      dot={{ r: 3.5, fill: TEXT, strokeWidth: 2, stroke: BG1 }} connectNulls={false} />
                    {seri.kademeler.map((k) => (
                      <Line key={k.seviye} type="monotone" dataKey={`${k.seviye}. sınıf`} stroke={KADEME_RENGI(k.seviye)} strokeWidth={2}
                        dot={{ r: 3, fill: KADEME_RENGI(k.seviye), strokeWidth: 1.5, stroke: BG1 }} connectNulls={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <p className="mt-2 text-[11px]" style={{ color: TEXT_MUTED }}>
                  {aralikMetni} · kurum geneli, haftalık kapsam ({tur}):{" "}
                  {seri.genel.map((n) => `${tarihFormat(n.haftaBaslangic)} ${n.denemeOgrenci}/${n.ogrenciSayisi}`).join(" · ")} öğrenci
                </p>
              </>
            )}
          </div>

          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 block">
              Sınıf bazlı {tur} net ortalaması — son 8 hafta
            </span>
            {!turdeDenemeVar ? (
              <p className="py-8 text-center text-xs" style={{ color: TEXT_MUTED }}>
                Son 8 haftada ({aralikMetni}) {tur} denemesi girilmemiş; grafik çizilmedi.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={sinifChartData} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                    <XAxis dataKey="tarih" tick={{ fontSize: 11, fill: TEXT_MUTED }} />
                    <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} />
                    <RTooltip cursor={false} filterNull={false}
                      content={(p) => <NetTooltip active={p.active} label={String(p.label ?? "")} payload={p.payload} seriler={sinifSerileri} />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {seri.siniflar.map((x, i) => (
                      <Line key={x.id} type="monotone" dataKey={x.ad} stroke={SINIF_RENKLERI[i % SINIF_RENKLERI.length]} strokeWidth={2} dot={false} connectNulls={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <p className="mt-2 text-[11px]" style={{ color: TEXT_MUTED }}>
                  {aralikMetni} · bir sınıfın o hafta en az %30&apos;u {tur} denemesi girmediyse çizgi o haftada kopar; sınıf başına n/toplam öğrenci noktaya gelince görünür.
                </p>
              </>
            )}
          </div>

          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 block">
              Kademe bazlı çözülen soru sayısı — son 8 hafta
            </span>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={soruChartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="tarih" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                <RTooltip cursor={false}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }}
                  labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }} />
                <Legend wrapperStyle={{ fontSize: 11, color: TEXT_MUTED }} />
                {veri.soru.kademeler.map((k) => (
                  <Bar key={k.seviye} dataKey={`${k.seviye}. sınıf`} fill={KADEME_RENGI(k.seviye)} radius={[4, 4, 0, 0]} maxBarSize={22} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[11px]" style={{ color: TEXT_MUTED }}>
              {aralikMetni} · öğrencilerin girdiği soru çözümü kayıtlarının toplamı (deneme türünden bağımsız).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
