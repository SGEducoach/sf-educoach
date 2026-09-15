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
import type { AytAlan, HedefeYakinlik, OgrenmeSekli, TekrarDurumu } from "@/lib/types";
import { Etiket, SecenekSecici } from "@/components/dashboard/OgrenciVeriGirisi";
import { konuHakimiyetiKaydet, konuHakimiyetiKapsamKaydet } from "@/app/dashboard/konu-hakimiyeti-actions";
import { satirTytdeGosterilsinMi, satirAytdeGosterilsinMi } from "@/lib/konu-hakimiyeti";
import type { KonuHakimiyetiSatiri } from "@/lib/konu-hakimiyeti";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, BUTTER, BUTTER_BG, PEACH, PEACH_BG, SKY, SKY_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

const HAKIMIYET_RENK: Record<HedefeYakinlik, string> = { yakin: MINT, belirsiz: BUTTER, uzak: PEACH };
// Kullanıcı geri bildirimi: durum rozeti öncesinde sadece renkli metindi,
// satır zeminiyle neredeyse aynı tondaydı — artık renkli dolgu + kenarlıkla
// belirgin bir "chip" oluyor (Hepsini İşaretle butonlarıyla aynı görsel dil).
const HAKIMIYET_BG: Record<HedefeYakinlik, string> = { yakin: MINT_BG, belirsiz: BUTTER_BG, uzak: PEACH_BG };

export function KonuHakimiyetiEkrani({ satirlar, tamGorunum, aytAlan }: { satirlar: KonuHakimiyetiSatiri[]; tamGorunum: boolean; aytAlan: AytAlan }) {
  // Tam görünüm (12. sınıf/dershane) — kullanıcı isteği: "iki seçim
  // kutucuğu olsun önce tyt/ayt seçilsin sonra da dersler". Maarif modunda
  // (9-10-11. sınıf, dershane değil) bu seçici hiç gösterilmiyor, sınav
  // filtresi de uygulanmıyor (satirlar zaten kendi kademesine göre geliyor).
  const [seciliSinav, setSeciliSinav] = useState<"TYT" | "AYT">("TYT");
  const sinavaGoreSatirlar = !tamGorunum
    ? satirlar
    : satirlar.filter((s) => (seciliSinav === "TYT" ? satirTytdeGosterilsinMi(s) : satirAytdeGosterilsinMi(s, aytAlan)));

  const dersler = useMemo(() => Array.from(new Set(sinavaGoreSatirlar.map((s) => s.ders))), [sinavaGoreSatirlar]);
  const [seciliDers, setSeciliDers] = useState<string>("tum");
  const [seciliSeviye, setSeciliSeviye] = useState("tum");
  const seviyeler = [...new Set(sinavaGoreSatirlar.filter((s) => seciliDers === "tum" || s.ders === seciliDers).map((s) => s.seviye))];

  function sinavDegistir(s: "TYT" | "AYT") {
    setSeciliSinav(s);
    setSeciliDers("tum"); // önceki dersin seçimi yeni sınav kapsamında geçersiz olabilir
    setSeciliSeviye("tum");
  }

  const gorunenSatirlar = sinavaGoreSatirlar.filter((s) => (seciliDers === "tum" || s.ders === seciliDers)
    && (seciliSeviye === "tum" || s.seviye === seciliSeviye));
  const hakimSayisi = gorunenSatirlar.filter((s) => s.hakimiyetSeviyesi === "yakin").length;
  const toplam = gorunenSatirlar.length;
  const yuzde = toplam > 0 ? Math.round((hakimSayisi / toplam) * 100) : 0;

  const ustBasliklar = useMemo(() => {
    const map = new Map<string, { ders: string; ustKonu: string; satirlar: KonuHakimiyetiSatiri[] }>();
    for (const s of gorunenSatirlar) {
      const anahtar = `${s.ders}|${s.seviye}|${s.ustKonu}`;
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

        {tamGorunum && (
          <div className="flex gap-1 p-1 rounded-full w-fit mb-3" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
            {(["TYT", "AYT"] as const).map((s) => (
              <button key={s} type="button" onClick={() => sinavDegistir(s)}
                className="sfec-btn text-xs font-bold px-4 py-1.5 rounded-full"
                style={{ background: seciliSinav === s ? MINT : "transparent", color: seciliSinav === s ? MINT_ON : TEXT_MUTED }}>
                {s}
              </button>
            ))}
          </div>
        )}
        <select value={seciliDers} onChange={(e) => { setSeciliDers(e.target.value); setSeciliSeviye("tum"); }}
          className="text-sm px-3 py-2 rounded-xl outline-none w-full sm:w-auto mb-4"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="tum">Tüm dersler</option>
          {dersler.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Konu sınıfı" value={seciliSeviye} onChange={(e) => setSeciliSeviye(e.target.value)}
          className="mb-4 w-full rounded-xl px-3 py-2 text-sm outline-none sm:ml-2 sm:w-auto"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="tum">Tüm sınıflar</option>
          {seviyeler.map((s) => <option key={s}>{s}</option>)}
        </select>
        {seciliDers !== "tum" && seciliSeviye !== "tum" ? (
          <KapsamOnayi key={`${seciliDers}|${seciliSeviye}|${seciliSinav}`} ders={seciliDers} seviye={seciliSeviye}
            satirlar={satirlar.filter((s) => s.ders === seciliDers && s.seviye === seciliSeviye)} eksikSecimi />
        ) : <p className="mb-4 text-xs" style={{ color: TEXT_MUTED }}>“Eksik konularımı seç” için önce bir ders ve sınıf seçin. Üst başlıkları ayrıca onaylayabilirsiniz.</p>}

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
          ustBasliklar.map((u) => <UstBaslikGrubu key={`${u.ders}|${u.satirlar[0]?.seviye}|${u.ustKonu}`} ders={u.ders} ustKonu={u.ustKonu} satirlar={u.satirlar} />)
        )}
      </div>
    </div>
  );
}

function UstBaslikGrubu({ ders, ustKonu, satirlar }: { ders: string; ustKonu: string; satirlar: KonuHakimiyetiSatiri[] }) {
  // Toplu onay yalnız bu üst başlığın aynı sınıftaki alt konularını kapsar.
  const coklu = satirlar.length > 1 || satirlar[0]?.konu !== ustKonu;
  // Kullanıcı isteği: konunun hangi sınıfa ait olduğu görünmüyordu — grup
  // içindeki tüm alt konular aynı üst başlıktan geldiği için hep aynı
  // seviyeyi taşır (MUFREDAT_KONULARI'nin kendi "seviye" alanı), tek
  // seferde üst başlık satırında gösteriliyor.
  const seviye = satirlar[0]?.seviye;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-3" style={{ background: BG1_ALT }}>
        {coklu && <Layers size={13} color={TEXT_MUTED} className="shrink-0" />}
        <span style={{ color: TEXT }} className="text-sm font-bold truncate">{ustKonu}</span>
        <span style={{ color: TEXT_MUTED }} className="text-[11px] shrink-0">· {ders}</span>
        {seviye && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: SKY_BG, color: SKY }}>
            {seviye}
          </span>
        )}
      </div>
      {seviye && <div className="px-4 pt-3"><KapsamOnayi ders={ders} seviye={seviye} ustKonu={ustKonu} satirlar={satirlar} /></div>}
      <div className="flex flex-col divide-y" style={{ borderColor: BORDER }}>
        {satirlar.map((s) => <KonuSatiri key={`${s.konu}|${s.guncellenmeTarihi}`} satir={s} />)}
      </div>
    </div>
  );
}

function KapsamOnayi({ ders, seviye, ustKonu, satirlar, eksikSecimi = false }: {
  ders: string; seviye: string; ustKonu?: string; satirlar: KonuHakimiyetiSatiri[]; eksikSecimi?: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const [eksikler, setEksikler] = useState<string[]>(() => satirlar.filter((s) => s.hakimiyetSeviyesi === "uzak" || s.hakimiyetSeviyesi === "belirsiz").map((s) => s.konu));
  const [onay, setOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const kapsam = `${ders} · ${seviye}${ustKonu ? ` · ${ustKonu}` : ""}`;
  function kaydet() {
    setHata(null);
    startTransition(async () => {
      const sonuc = await konuHakimiyetiKapsamKaydet({ ders, seviye, ustKonu, eksikKonular: eksikSecimi ? eksikler : [] });
      if (sonuc.error) return setHata(sonuc.error);
      setMesaj(`${sonuc.hakimSayisi} konu hâkim olarak kaydedildi.`);
      setAcik(false); setOnay(false); router.refresh();
    });
  }
  return <div className="mb-3">
    <button type="button" disabled={pending} onClick={() => { setAcik(!acik); setOnay(!eksikSecimi); setMesaj(null); }}
      className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold" style={{ background: MINT_BG, color: MINT, border: `1px solid ${MINT}` }}>
      {eksikSecimi ? "Eksik konularımı seç" : "Bu üst başlığa hâkimim"}
    </button>
    {mesaj && <p role="status" className="mt-2 text-xs" style={{ color: MINT }}>{mesaj}</p>}
    {acik && <div className="mt-2 rounded-2xl p-3" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
      <p className="text-xs font-bold" style={{ color: TEXT }}>Kapsam: {kapsam}</p>
      {eksikSecimi && !onay && <>
        <p className="my-2 text-xs" style={{ color: TEXT_MUTED }}>Yalnız eksik konuları işaretle. İşaretlemediklerin son onayla hâkim sayılacak.</p>
        <div className="max-h-80 overflow-y-auto">{satirlar.map((s) => <label key={s.konu} className="flex cursor-pointer items-start gap-2 border-b py-2 text-xs" style={{ color: TEXT, borderColor: BORDER }}>
          <input type="checkbox" checked={eksikler.includes(s.konu)} onChange={(e) => setEksikler(e.target.checked ? [...eksikler, s.konu] : eksikler.filter((k) => k !== s.konu))} />
          <span><span className="block font-semibold">{s.konu}</span>{s.ustKonu !== s.konu && <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{s.ustKonu}</span>}</span>
        </label>)}</div>
        <button type="button" onClick={() => setOnay(true)} className="sfec-btn mt-3 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>Seçimi incele</button>
      </>}
      {onay && <>
        <p className="my-3 text-xs leading-relaxed" style={{ color: TEXT }}>{satirlar.length - (eksikSecimi ? eksikler.length : 0)} konu hâkim sayılacak{eksikSecimi ? `, ${eksikler.length} konu eksik olarak işaretlenecek` : ""}. Diğer ders ve sınıflar etkilenmez. Çalışma kaydı oluşturulmaz.</p>
        {eksikSecimi && eksikler.length > 0 && <p className="mb-3 text-xs" style={{ color: TEXT_MUTED }}>Eksikler: {eksikler.join(", ")}</p>}
        <div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={kaydet} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>{pending ? "Kaydediliyor..." : "Onayla ve kaydet"}</button>
          {eksikSecimi && <button type="button" disabled={pending} onClick={() => setOnay(false)} className="sfec-btn px-3 py-2 text-xs" style={{ color: TEXT_MUTED }}>Seçime dön</button>}</div>
      </>}
      <button type="button" disabled={pending} onClick={() => setAcik(false)} className="sfec-btn mt-2 text-xs" style={{ color: TEXT_MUTED }}>Vazgeç</button>
      {hata && <p role="alert" className="mt-2 text-xs" style={{ color: BLUSH }}>{hata}</p>}
    </div>}
  </div>;
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
          {satir.masterySkoru !== null && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}
              title={`Analiz Motoru skoru — ${satir.masteryKaynaklari.join(", ")} sinyaline dayanıyor (taslak, tartışmaya açık)`}>
              Skor {satir.masterySkoru}
            </span>
          )}
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
