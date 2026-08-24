"use client";

// Konu Hakimiyeti (Faz H2) — öğrenci müfredattaki HER konuyu gezip kalıcı
// bir hakimiyet beyanı verir (Konu Çalışma'daki oturum-bazlı
// hedefe_yakinlik'ten bağımsız, bkz. src/lib/konu-hakimiyeti.ts).
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell } from "recharts";
import { ChevronDown, ChevronUp, ListChecks, Layers } from "lucide-react";
import {
  HAKIMIYET_SEVIYESI_ETIKET, OGRENME_SEKLI_ETIKET, OGRENME_SEKLI_LISTESI, TEKRAR_DURUMU_ETIKET,
} from "@/lib/types";
import type { HedefeYakinlik, OgrenmeSekli, TekrarDurumu } from "@/lib/types";
import { Etiket, SecenekSecici } from "@/components/dashboard/OgrenciVeriGirisi";
import { konuHakimiyetiKaydet, konuHakimiyetiTopluKaydet } from "@/app/dashboard/konu-hakimiyeti-actions";
import type { KonuHakimiyetiSatiri } from "@/lib/konu-hakimiyeti";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, BUTTER, BUTTER_BG, PEACH, PEACH_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

const HAKIMIYET_RENK: Record<HedefeYakinlik, string> = { yakin: MINT, belirsiz: BUTTER, uzak: PEACH };
// Kullanıcı geri bildirimi: durum rozeti öncesinde sadece renkli metindi,
// satır zeminiyle neredeyse aynı tondaydı — artık renkli dolgu + kenarlıkla
// belirgin bir "chip" oluyor (Hepsini İşaretle butonlarıyla aynı görsel dil).
const HAKIMIYET_BG: Record<HedefeYakinlik, string> = { yakin: MINT_BG, belirsiz: BUTTER_BG, uzak: PEACH_BG };

export function KonuHakimiyetiEkrani({ satirlar }: { satirlar: KonuHakimiyetiSatiri[] }) {
  const dersler = useMemo(() => Array.from(new Set(satirlar.map((s) => s.ders))), [satirlar]);
  const [seciliDers, setSeciliDers] = useState<string>("tum");

  const gorunenSatirlar = seciliDers === "tum" ? satirlar : satirlar.filter((s) => s.ders === seciliDers);
  const hakimSayisi = gorunenSatirlar.filter((s) => s.hakimiyetSeviyesi === "yakin").length;
  const toplam = gorunenSatirlar.length;
  const yuzde = toplam > 0 ? Math.round((hakimSayisi / toplam) * 100) : 0;

  const ustBasliklar = useMemo(() => {
    const map = new Map<string, { ders: string; ustKonu: string; satirlar: KonuHakimiyetiSatiri[] }>();
    for (const s of gorunenSatirlar) {
      const anahtar = `${s.ders}|${s.ustKonu}`;
      const mevcut = map.get(anahtar);
      if (mevcut) mevcut.satirlar.push(s);
      else map.set(anahtar, { ders: s.ders, ustKonu: s.ustKonu, satirlar: [s] });
    }
    const gruplar = Array.from(map.values());
    // Kullanıcı isteği: tamamen "Yeterli" işaretlenmiş (hakim olunan) üst
    // başlıklar listenin en altına atılsın — öğrenci hâlâ çalışması gereken
    // konulara odaklansın. Kısmen hakim olunan gruplar (en az bir alt konu
    // hâlâ Orta/Yetersiz/işaretlenmemiş) yerinde, müfredat sırasında kalır.
    const tamamenHakimMi = (g: { satirlar: KonuHakimiyetiSatiri[] }) =>
      g.satirlar.every((s) => s.hakimiyetSeviyesi === "yakin");
    return gruplar
      .map((g, sira) => ({ g, sira, hakim: tamamenHakimMi(g) }))
      .sort((a, b) => (a.hakim === b.hakim ? a.sira - b.sira : a.hakim ? 1 : -1))
      .map((x) => x.g);
  }, [gorunenSatirlar]);

  const donutVeri = toplam > 0
    ? [{ name: "hakim", value: hakimSayisi }, { name: "digger", value: toplam - hakimSayisi }]
    : [{ name: "bos", value: 1 }];

  return (
    <div className="flex flex-col gap-5">
      <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
            <ListChecks size={13} color={MINT} />
          </div>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Konu Hakimiyeti</span>
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
          Geçmişten güncele bütün konuları gez, her biri için ne kadar hakim olduğunu işaretle — bir çalışma oturumu girmiş olman gerekmez.
        </p>

        <select value={seciliDers} onChange={(e) => setSeciliDers(e.target.value)}
          className="text-sm px-3 py-2 rounded-xl outline-none w-full sm:w-auto mb-4"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="tum">Tüm dersler</option>
          {dersler.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="relative shrink-0" style={{ width: 130, height: 130 }}>
            <PieChart width={130} height={130}>
              <Pie data={donutVeri} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={60}
                startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                {toplam > 0 ? (
                  <>
                    <Cell fill={MINT} />
                    <Cell fill={BORDER} />
                  </>
                ) : <Cell fill={BORDER} />}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-extrabold">%{yuzde}</span>
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold">{hakimSayisi}/{toplam}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-xs" style={{ color: TEXT_MUTED }}>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: MINT }} /> Hakim olunan konular</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: BORDER, border: `1px solid ${BORDER_STRONG}` }} /> Henüz hakim olunmayan / işaretlenmemiş</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ustBasliklar.length === 0 ? (
          <div className="rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <p style={{ color: TEXT_MUTED }} className="text-sm">Bu kapsamda henüz gösterilecek konu yok.</p>
          </div>
        ) : (
          ustBasliklar.map((u) => <UstBaslikGrubu key={`${u.ders}|${u.ustKonu}`} ders={u.ders} ustKonu={u.ustKonu} satirlar={u.satirlar} />)
        )}
      </div>
    </div>
  );
}

function UstBaslikGrubu({ ders, ustKonu, satirlar }: { ders: string; ustKonu: string; satirlar: KonuHakimiyetiSatiri[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const coklu = satirlar.length > 1 || satirlar[0]?.konu !== ustKonu;

  function topluIsaretle(seviye: HedefeYakinlik) {
    setHata(null);
    startTransition(async () => {
      const res = await konuHakimiyetiTopluKaydet({
        ders, konular: satirlar.map((s) => s.konu), hakimiyetSeviyesi: seviye,
        ogrenmeSekli: [], tekrarDurumu: "tekrar_edebilirim",
      });
      if (res.error) setHata(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ background: BG1_ALT }}>
        <div className="flex items-center gap-1.5 min-w-0">
          {coklu && <Layers size={13} color={TEXT_MUTED} className="shrink-0" />}
          <span style={{ color: TEXT }} className="text-sm font-bold truncate">{ustKonu}</span>
          <span style={{ color: TEXT_MUTED }} className="text-[11px] shrink-0">· {ders}</span>
        </div>
        {coklu && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Hepsini işaretle:</span>
            {(["uzak", "belirsiz", "yakin"] as const).map((s) => (
              <button key={s} type="button" disabled={pending} onClick={() => topluIsaretle(s)}
                className="sfec-btn text-[10px] font-bold px-2.5 py-1 rounded-full disabled:opacity-60"
                style={{ background: BG0, color: HAKIMIYET_RENK[s], border: `1px solid ${HAKIMIYET_RENK[s]}` }}>
                {HAKIMIYET_SEVIYESI_ETIKET[s]}
              </button>
            ))}
          </div>
        )}
      </div>
      {hata && (
        <div className="px-4 pt-2" style={{ background: BG1_ALT }}>
          <p style={{ color: BLUSH }} className="text-[11px] font-semibold">{hata}</p>
        </div>
      )}
      <div className="flex flex-col divide-y" style={{ borderColor: BORDER }}>
        {satirlar.map((s) => <KonuSatiri key={s.konu} satir={s} />)}
      </div>
    </div>
  );
}

function KonuSatiri({ satir }: { satir: KonuHakimiyetiSatiri }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [hakimiyet, setHakimiyet] = useState<HedefeYakinlik>(satir.hakimiyetSeviyesi ?? "belirsiz");
  const [ogrenmeSekli, setOgrenmeSekli] = useState<OgrenmeSekli[]>(satir.ogrenmeSekli);
  const [tekrarDurumu, setTekrarDurumu] = useState<TekrarDurumu>(satir.tekrarDurumu ?? "tekrar_edebilirim");
  const [pending, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  function sekilToggle(s: OgrenmeSekli) {
    setOgrenmeSekli((liste) => (liste.includes(s) ? liste.filter((x) => x !== s) : [...liste, s]));
  }

  function kaydet() {
    setHata(null);
    startTransition(async () => {
      const res = await konuHakimiyetiKaydet({ ders: satir.ders, konu: satir.konu, hakimiyetSeviyesi: hakimiyet, ogrenmeSekli, tekrarDurumu });
      if (res.error) setHata(res.error);
      else { setAcik(false); router.refresh(); }
    });
  }

  return (
    <div className="px-4 py-2.5">
      <button type="button" onClick={() => setAcik((a) => !a)} className="sfec-btn w-full flex items-center justify-between gap-2 text-left">
        <span style={{ color: TEXT }} className="text-xs font-semibold">{satir.konu}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          {satir.hakimiyetSeviyesi ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: HAKIMIYET_BG[satir.hakimiyetSeviyesi], color: HAKIMIYET_RENK[satir.hakimiyetSeviyesi], border: `1px solid ${HAKIMIYET_RENK[satir.hakimiyetSeviyesi]}` }}>
              {HAKIMIYET_SEVIYESI_ETIKET[satir.hakimiyetSeviyesi]}
            </span>
          ) : (
            <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>İşaretlenmedi</span>
          )}
          {satir.bayat && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,196,107,0.15)", color: BUTTER }} title="90+ gündür güncellenmedi">
              Gözden geçir
            </span>
          )}
          {acik ? <ChevronUp size={14} color={TEXT_MUTED} /> : <ChevronDown size={14} color={TEXT_MUTED} />}
        </span>
      </button>

      {acik && (
        <div className="mt-3 flex flex-col gap-3 pb-1">
          <SecenekSecici baslik="Hakimiyet" value={hakimiyet} onChange={setHakimiyet}
            secenekler={[["uzak", "Yetersiz"], ["belirsiz", "Orta"], ["yakin", "Yeterli"]]} />

          <div className="flex flex-col gap-1">
            <Etiket>Öğrenme şekli (birden fazlasını seçebilirsin)</Etiket>
            <div className="flex flex-wrap gap-1.5">
              {OGRENME_SEKLI_LISTESI.map((s) => {
                const secili = ogrenmeSekli.includes(s);
                return (
                  <button key={s} type="button" onClick={() => sekilToggle(s)}
                    className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full"
                    style={{ background: secili ? MINT : "transparent", color: secili ? MINT_ON : TEXT_MUTED, border: `1px solid ${secili ? MINT : BORDER_STRONG}` }}>
                    {OGRENME_SEKLI_ETIKET[s]}
                  </button>
                );
              })}
            </div>
          </div>

          <SecenekSecici baslik="Tekrar durumu" value={tekrarDurumu} onChange={setTekrarDurumu}
            secenekler={[["tekrar_edebilirim", TEKRAR_DURUMU_ETIKET.tekrar_edebilirim], ["yuzeysel_bakarim", TEKRAR_DURUMU_ETIKET.yuzeysel_bakarim], ["gerek_yok", TEKRAR_DURUMU_ETIKET.gerek_yok]]} />

          <button type="button" onClick={kaydet} disabled={pending}
            className="sfec-btn self-start text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
          {hata && <p style={{ color: BLUSH }} className="text-[11px] font-semibold">{hata}</p>}
        </div>
      )}
    </div>
  );
}
