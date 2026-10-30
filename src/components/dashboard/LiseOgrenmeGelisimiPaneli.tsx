"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, Sprout } from "lucide-react";
import { GELISIM_TAKIP_GUNU, gelisimTakipOzeti } from "@/lib/lise-ogrenme-gelisimi";
import type { GelisimKonusu, GelisimOgrencisi, GelisimTakibi, LiseOgrenmeGelisimi } from "@/lib/lise-ogrenme-gelisimi";
import { tabanDers } from "@/lib/konu-durumu";
import { GOREV_DURUMU_ETIKET, HAKIMIYET_SEVIYESI_ETIKET } from "@/lib/types";
import { BG1, BG1_ALT, BORDER_STRONG, BUTTER_BG, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

const tarih = (t: string) => t.includes("T")
  ? new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(t))
  : t.split("-").reverse().join(".");
const sayilar = (o: { dogru: number; yanlis: number; bos?: number }) => `${o.dogru} doğru · ${o.yanlis} yanlış${o.bos === undefined ? "" : ` · ${o.bos} boş`}`;

export function LiseOgrenmeGelisimiPaneli({ veri, ders, calismaVer }: {
  veri: LiseOgrenmeGelisimi; ders: string;
  calismaVer?: (ogrenci: GelisimOgrencisi, konu: GelisimKonusu) => ReactNode;
}) {
  const [ogrenciId, setOgrenciId] = useState("");
  const [durum, setDurum] = useState<"tumu" | "geciken" | "tamamlanan">("tumu");
  const [limit, setLimit] = useState(8);
  const ogrenci = veri.ogrenciler.find((o) => o.id === ogrenciId);
  const dersUyar = (d: string) => !ders || tabanDers(d) === ders;
  const takipler = veri.takipler.filter((g) => (!ogrenci || g.studentId === ogrenci.id) && dersUyar(g.ders));
  const ozet = gelisimTakipOzeti(takipler);
  const gorunen = takipler.filter((g) => durum === "geciken" ? g.gecikti : durum === "tamamlanan" ? g.durum === "tamamlandi" : true);
  const konular = ogrenci?.konular.filter((k) => dersUyar(k.ders)) ?? [];
  const secimStili = { background: BG1, color: TEXT, border: `1px solid ${BORDER_STRONG}` };

  return <section aria-label="Öğrenme gelişim raporu" className="flex flex-col gap-4">
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold" style={{ color: TEXT }}><Sprout size={16} color={MINT} aria-hidden="true" /> Öğrenme Gelişimi</h3>
      <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Verdiğin çalışmaları izle; öğrencinin beyanını ve ölçüm sonuçlarını ayrı gör.</p>
    </div>
    <label className="flex max-w-sm flex-col gap-1 text-xs font-semibold" style={{ color: TEXT_MUTED }}>
      Öğrenci
      <select aria-label="Gelişimi izlenecek öğrenci" value={ogrenci?.id ?? ""}
        onChange={(e) => { setOgrenciId(e.target.value); setLimit(8); }} className="min-h-11 rounded-xl px-3 py-2" style={secimStili}>
        <option value="">Tüm öğrenciler</option>
        {veri.ogrenciler.map((o) => <option key={o.id} value={o.id}>{o.ad}{o.sinif ? ` · ${o.sinif}` : ""}</option>)}
      </select>
    </label>

    <section aria-label="Verdiğim çalışmalar" className="flex flex-col gap-3">
      <div>
        <h4 className="text-sm font-bold" style={{ color: TEXT }}>Verdiğim Çalışmalar</h4>
        <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>Son {GELISIM_TAKIP_GUNU} günde atadığın konu çalışmaları ve soru çözümleri · {tarih(veri.bugun)} itibarıyla</p>
      </div>
      {veri.takipHatasi ? <p role="alert" className="rounded-xl p-3 text-xs" style={{ background: BUTTER_BG, color: TEXT }}>
        Çalışma takibi alınamadı. Sayfayı yenileyerek tekrar deneyin. Bu durum çalışma olmadığı anlamına gelmez; öğrenci kaynaklarını aşağıda inceleyebilirsiniz.
      </p> : <>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[{ sayi: ozet.geciken, etiket: "süresi geçen çalışma", renk: TEXT },
            { sayi: ozet.tamamlanan, etiket: "tamamlanan çalışma", renk: MINT },
            { sayi: ozet.olcumGelen, etiket: "sonraki deneme ölçümü olan", renk: TEXT }].map((o) => (
            <div key={o.etiket} className="rounded-2xl px-3 py-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
              <span className="text-lg font-bold" style={{ color: o.renk }}>{o.sayi}</span>
              <span className="ml-2 text-[11px]" style={{ color: TEXT_MUTED }}>{o.etiket}</span>
            </div>))}
        </div>
        <div className="flex flex-wrap gap-2 print:hidden" role="group" aria-label="Çalışma durumu">
          {([["tumu", "Tümü"], ["geciken", "Süresi geçenler"], ["tamamlanan", "Tamamlananlar"]] as const).map(([id, ad]) => (
            <button key={id} type="button" aria-pressed={durum === id} onClick={() => { setDurum(id); setLimit(8); }}
              className="sfec-btn min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ ...secimStili, background: durum === id ? MINT_BG : BG1 }}>{ad}</button>))}
        </div>
        {gorunen.slice(0, limit).map((g) => <CalismaTakibi key={g.id} takip={g} />)}
        {gorunen.length === 0 && <p className="rounded-xl p-3 text-xs" style={{ background: BG1_ALT, color: TEXT_MUTED }}>
          {takipler.length === 0 ? "Bu seçimde son 30 günde verdiğin bir çalışma yok. Konu Özeti’nde destek gereken konuyu açıp çalışma verebilirsin." : "Bu durumda çalışma yok."}
        </p>}
        {gorunen.length > limit && <button type="button" className="sfec-btn self-start rounded-xl px-3 py-2 text-xs font-semibold print:hidden"
          style={secimStili} onClick={() => setLimit(limit + 8)}>Daha fazla göster ({gorunen.length - limit})</button>}
        <p className="text-[11px] leading-relaxed" style={{ color: TEXT_MUTED }}>
          Bir çalışma, atanan her öğrenci için ayrı sayılır. Tamamlanması öğrenmenin gerçekleştiğini göstermez.
          Ölçümler görev ve atama tarihlerinin daha geç olanından sonraki günlerden alınır; çalışmanın etkisini tek başına kanıtlamaz.
        </p>
      </>}
    </section>

    <section aria-label="Öğrencinin öğrenme kaynakları" className="flex flex-col gap-2">
      <h4 className="text-sm font-bold" style={{ color: TEXT }}>Öğrencinin Konu Kaynakları</h4>
      {!ogrenci ? <p className="text-xs" style={{ color: TEXT_MUTED }}>Bir öğrenci seçerek deneme sonuçlarını, soru çözümünü, kendi beyanını ve konu çalışmalarını ayrı ayrı inceleyebilirsin.</p>
        : <>
          <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: TEXT_MUTED }}>
            <span>{ogrenci.ad} · Kayıtlı tüm geçmiş · {konular.length} konuda veri</span>
            {ogrenci.classId && <Link prefetch={false} href={`/dashboard?bolum=ozet&sinif=${encodeURIComponent(ogrenci.classId)}&ogrenci=${encodeURIComponent(ogrenci.id)}`}
              className="font-semibold underline print:hidden" style={{ color: MINT }}>Öğrenci profili</Link>}
          </div>
          {konular.length === 0 && <p className="text-xs" style={{ color: TEXT_MUTED }}>Bu seçimde konu verisi yok. Bu, öğrencinin yetersiz olduğu anlamına gelmez.</p>}
          {konular.map((k) => <details key={`${k.ders}|${k.konu}`} className="rounded-2xl p-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
            <summary className="cursor-pointer text-xs font-semibold" style={{ color: TEXT }}>{k.konu} <span className="font-normal" style={{ color: TEXT_MUTED }}>· {k.ders}</span></summary>
            <div className="mt-3 flex flex-col gap-2 text-xs" style={{ color: TEXT }}>
              {k.ustKonu && k.ustKonu !== k.konu && <p style={{ color: TEXT_MUTED }}>Üst konu: {k.ustKonu}</p>}
              <p><strong>Deneme:</strong> {k.deneme ? `${sayilar(k.deneme)} · ${k.deneme.kayit} deneme` : "Ölçüm yok"}</p>
              <p><strong>Soru çözümü:</strong> {k.soru ? sayilar(k.soru) : "Kayıt yok"}</p>
              <p><strong>Öğrenci beyanı:</strong> {k.beyan ? `${HAKIMIYET_SEVIYESI_ETIKET[k.beyan.seviye]}${k.beyan.tarih ? ` · ${tarih(k.beyan.tarih)}` : ""}` : "Beyan yok"}</p>
              <p><strong>Konu çalışması:</strong> {k.oturum > 0 ? `${k.oturum} oturum` : "Kayıt yok"}</p>
              <div className="print:hidden">{calismaVer?.(ogrenci, k)}</div>
            </div>
          </details>)}
        </>}
    </section>
  </section>;
}

function CalismaTakibi({ takip: g }: { takip: GelisimTakibi }) {
  const o = g.olcum;
  return <details className="rounded-2xl p-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-xs" style={{ color: TEXT }}>
      <span className="min-w-0 flex-1"><strong>{g.konu || "Konu belirtilmemiş"}</strong><span className="mt-1 block" style={{ color: TEXT_MUTED }}>{g.ogrenciAdi} · {g.sinif} · {g.ders}</span></span>
      <span className="rounded-full px-2 py-1 font-semibold" style={{ color: g.durum === "tamamlandi" ? MINT : TEXT, background: g.gecikti ? BUTTER_BG : BG1 }}>
        {g.gecikti ? "Süresi geçti" : GOREV_DURUMU_ETIKET[g.durum]}</span>
      <ChevronDown size={13} aria-hidden="true" />
    </summary>
    <div className="mt-3 flex flex-col gap-2 text-xs" style={{ color: TEXT }}>
      <p>{g.tur === "soru" ? `Soru çözümü${g.hedefSoru ? ` · ${g.hedefSoru} soru` : ""}` : `Konu çalışması${g.hedefDakika ? ` · ${g.hedefDakika} dakika` : ""}`} · Son tarih: {tarih(g.sonTarih)}</p>
      {g.gecikti && <p style={{ color: TEXT_MUTED }}>Kayıtlı durum: {GOREV_DURUMU_ETIKET[g.durum]}</p>}
      <p style={{ color: TEXT_MUTED }}>Ölçüm karşılaştırma tarihi: {tarih(g.referansTarihi)}</p>
      {!g.konu ? <p>Konu belirtilmediği için ölçüm eşleştirilmedi.</p> : !o ? <p>Görev tarihinden sonra aynı konuda deneme ölçümü yok.</p> : <>
        <p className="font-semibold">{o.tur === "BRANS" ? "Branş" : o.tur} · Aynı öğrencinin aynı konudaki ölçümleri</p>
        <p><strong>Görev tarihinden önce:</strong> {o.once ? `${sayilar(o.once)} · ${o.once.kayit} deneme` : "Aynı türde önceki ölçüm yok"}</p>
        <p><strong>Görev tarihinden sonra:</strong> {sayilar(o.sonra)} · {o.sonra.kayit} deneme</p>
        {o.fark === null ? <p style={{ color: TEXT_MUTED }}>Gelişim yönü için karşılaştırılabilir ölçüm az. Her iki dönemde en az 2 deneme ve 10 cevaplanmış soru gerekir.</p>
          : <p className="font-semibold" style={{ color: TEXT }}>Cevaplanan sorulardaki doğruluk: {o.fark > 0 ? `+${o.fark}` : o.fark} puan değişim.</p>}
        <p style={{ color: TEXT_MUTED }}>Her dönemden aynı türdeki son iki deneme alınır. Soru güçlüğü farklı olabilir; bu bir hâkimiyet kararı değildir.</p>
      </>}
    </div>
  </details>;
}
