"use client";

// SMS modülü (kullanıcı kararı 28.10.2026): müdür, müdür yardımcısı ve rehber
// öğretmen, kurumun KENDİ SMS paketiyle velilere SMS gönderir. Başlık sağlayıcıdan
// gelir ve salt okunurdur; yalnız içerik yazılır. Telefon numaraları bu ekrana
// hiç gelmez, yalnız “geçerli numarası var mı” bilgisi gelir.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, FileText, History, Lock, MessageSquareText, Pencil, Send, Settings2, Trash2 } from "lucide-react";
import { BG0, BG1, BLUSH, BLUSH_BG, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, MINT_ON, SKY, SKY_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { SMS_ICERIK_SINIRI, smsUzunlugu } from "@/lib/sms-mesaj";
import type { SmsAyarOzeti, SmsGecmisKaydi, SmsOgrencisi, SmsSablonu, SmsSinifi } from "@/lib/sms-veri";
import { smsAlicilariGetir, smsMesajGonder, smsSablonKaydet, smsSablonSil } from "@/app/dashboard/sms-actions";
import { SmsAyarlari } from "@/components/dashboard/SmsAyarlari";

type Sekme = "gonder" | "sablonlar" | "gecmis" | "ayarlar";

const girdi = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };
const tarihYaz = (iso: string) => new Date(iso).toLocaleString("tr-TR", {
  timeZone: "Europe/Istanbul", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});

const DURUM: Record<SmsGecmisKaydi["durum"], { etiket: string; renk: string; zemin: string }> = {
  gonderildi: { etiket: "Gönderildi", renk: MINT, zemin: MINT_BG },
  zamanlandi: { etiket: "Zamanlandı", renk: SKY, zemin: SKY_BG },
  kismen: { etiket: "Kısmen gönderildi", renk: BUTTER, zemin: BUTTER_BG },
  hata: { etiket: "Gönderilemedi", renk: BLUSH, zemin: BLUSH_BG },
};

// Türkiye sabit UTC+3: datetime-local değeri İstanbul saati kabul edilir.
function istanbulZamaniniIsoYap(yerel: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(yerel)) return null;
  const t = new Date(`${yerel}:00+03:00`);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

export function SmsModulu({ ayar, siniflar, sablonlar, gecmis, rolEtiketi, kapsamYok, ayarYapabilir, zamanlama, okulId }: {
  ayar: SmsAyarOzeti | null;
  siniflar: SmsSinifi[];
  sablonlar: SmsSablonu[];
  gecmis: SmsGecmisKaydi[];
  rolEtiketi: string;
  /** Müdür yardımcısı/rehber olup henüz sınıf düzeyi atanmamış. */
  kapsamYok: boolean;
  ayarYapabilir: boolean;
  /** Bağlı sağlayıcı ileri tarihli gönderimi destekliyor mu. */
  zamanlama: boolean;
  okulId?: string;
}) {
  const router = useRouter();
  const hazir = ayar !== null && !!ayar.seciliBaslik;
  const [sekme, setSekme] = useState<Sekme>(!hazir && ayarYapabilir ? "ayarlar" : "gonder");
  const [seciliSiniflar, setSeciliSiniflar] = useState<Set<string>>(new Set());
  const [ogrenciler, setOgrenciler] = useState<SmsOgrencisi[] | null>(null);
  const [disarida, setDisarida] = useState<Set<string>>(new Set());
  const [yukleniyor, setYukleniyor] = useState(false);
  const [icerik, setIcerik] = useState("");
  const [zamanli, setZamanli] = useState(false);
  const [zaman, setZaman] = useState("");
  const [mesaj, setMesaj] = useState<{ hata: boolean; metin: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const yarisSayaci = useRef(0);

  const uzunluk = smsUzunlugu(icerik);
  const gecerliOgrenciler = (ogrenciler ?? []).filter((o) => o.gecerli);
  const seciliOgrenciSayisi = gecerliOgrenciler.filter((o) => !disarida.has(o.id)).length;
  const gecersizSayisi = (ogrenciler ?? []).length - gecerliOgrenciler.length;

  async function sinifSecimiDegisti(yeni: Set<string>) {
    setSeciliSiniflar(yeni);
    setMesaj(null);
    const sira = ++yarisSayaci.current;
    if (yeni.size === 0) { setOgrenciler(null); setYukleniyor(false); return; }
    setYukleniyor(true);
    const sonuc = await smsAlicilariGetir([...yeni]);
    if (sira !== yarisSayaci.current) return; // daha yeni bir seçim var
    setYukleniyor(false);
    if (sonuc.error) { setOgrenciler(null); setMesaj({ hata: true, metin: sonuc.error }); return; }
    setOgrenciler(sonuc.ogrenciler);
  }

  function sinifIsaretle(id: string) {
    const yeni = new Set(seciliSiniflar);
    if (yeni.has(id)) yeni.delete(id); else yeni.add(id);
    void sinifSecimiDegisti(yeni);
  }

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (!ayar?.seciliBaslik) return;
    setMesaj(null);
    let zamanIso: string | null = null;
    if (zamanli) {
      zamanIso = istanbulZamaniniIsoYap(zaman);
      if (!zamanIso) return setMesaj({ hata: true, metin: "Gönderim tarih ve saatini seçin." });
    }
    const onay = `${seciliOgrenciSayisi} veli numarasına “${ayar.seciliBaslik}” başlığıyla SMS ${zamanIso ? "zamanlanacak" : "gönderilecek"}. Mesaj kurumunuzun SMS paketinden düşer. Onaylıyor musunuz?`;
    if (!window.confirm(onay)) return;
    const tumuSecili = (ogrenciler ?? []).every((o) => !o.gecerli || !disarida.has(o.id));
    startTransition(async () => {
      const sonuc = await smsMesajGonder({
        sinifIdleri: [...seciliSiniflar],
        // Tüm geçerli öğrenciler seçiliyse sınıfların tamamı; aksi hâlde yalnız işaretliler.
        ogrenciIdleri: tumuSecili ? null : gecerliOgrenciler.filter((o) => !disarida.has(o.id)).map((o) => o.id),
        icerik, zamanIso,
      });
      if (sonuc.error || !sonuc.sonuc) return setMesaj({ hata: true, metin: sonuc.error ?? "Gönderilemedi." });
      const s = sonuc.sonuc;
      const ek = [s.gecersizSayisi ? `${s.gecersizSayisi} öğrencide geçerli numara yok` : "", s.tekrarSayisi ? `${s.tekrarSayisi} tekrar eden numara tek SMS sayıldı` : ""].filter(Boolean).join("; ");
      setMesaj({ hata: false, metin: `${s.aliciSayisi} numaraya ${s.durum === "zamanlandi" ? "zamanlandı" : "gönderildi"}.${ek ? ` (${ek})` : ""}` });
      setIcerik("");
      setZamanli(false);
      setZaman("");
      router.refresh();
    });
  }

  const sekmeler: { id: Sekme; etiket: string; Ikon: typeof Send }[] = [
    { id: "gonder", etiket: "Mesaj Gönder", Ikon: Send },
    { id: "sablonlar", etiket: "Şablonlar", Ikon: FileText },
    { id: "gecmis", etiket: "Geçmiş", Ikon: History },
    ...(ayarYapabilir ? [{ id: "ayarlar" as const, etiket: "Bağlantı Ayarları", Ikon: Settings2 }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
            <MessageSquareText size={20} color={MINT} aria-hidden="true" /> SMS
          </h1>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>{rolEtiketi} · velilere kurumunuzun kendi SMS paketiyle mesaj</p>
        </div>
        {hazir && (
          <p className="text-xs" style={{ color: TEXT_MUTED }}>
            {ayar.saglayiciAdi}{ayar.bakiye ? ` · kalan: ${ayar.bakiye}` : ""}
          </p>
        )}
      </header>

      <nav aria-label="SMS bölümleri" className="flex gap-1 overflow-x-auto rounded-2xl p-1.5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        {sekmeler.map(({ id, etiket, Ikon }) => (
          <button key={id} type="button" onClick={() => setSekme(id)} aria-current={sekme === id ? "page" : undefined}
            className="sfec-btn inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-sm font-bold"
            style={{ color: sekme === id ? TEXT : TEXT_MUTED, background: sekme === id ? MINT_BG : "transparent", border: `1px solid ${sekme === id ? MINT : "transparent"}` }}>
            <Ikon size={16} color={sekme === id ? MINT : TEXT_MUTED} aria-hidden="true" /> {etiket}
          </button>
        ))}
      </nav>

      {sekme === "gonder" && (
        !hazir ? (
          <Bilgi>
            Kurumunuzun SMS bağlantısı henüz kurulmamış. {ayarYapabilir ? "“Bağlantı Ayarları” bölümünden sağlayıcınızı seçip hesap bilgilerinizi girin." : "Kurum yöneticinizden SMS sağlayıcı bilgilerinin girilmesini isteyin."}
          </Bilgi>
        ) : kapsamYok ? (
          <Bilgi>Size henüz sorumlu olduğunuz sınıf düzeyi atanmamış. Kurum yöneticinizle görüşün.</Bilgi>
        ) : siniflar.length === 0 ? (
          <Bilgi>Kapsamınızda sınıf bulunmuyor.</Bilgi>
        ) : (
          <form onSubmit={gonder} className="flex flex-col gap-4">
            <fieldset className="rounded-2xl p-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
              <legend className="px-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>1 · Alıcılar (veliler)</legend>
              <div className="flex flex-wrap gap-2">
                {siniflar.map((s) => {
                  const secili = seciliSiniflar.has(s.id);
                  return (
                    <label key={s.id} className="sfec-btn inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold"
                      style={{ background: secili ? MINT_BG : BG0, color: TEXT, border: `1px solid ${secili ? MINT : BORDER_STRONG}` }}>
                      <input type="checkbox" checked={secili} onChange={() => sinifIsaretle(s.id)} className="size-4" />
                      {s.seviye}-{s.sube}
                      <span className="text-xs font-normal" style={{ color: TEXT_MUTED }}>{s.ulasilabilir}/{s.ogrenciSayisi}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>Sınıf yanındaki sayı: ulaşılabilir veli / öğrenci sayısı.</p>

              {yukleniyor && <p className="mt-3 text-xs" style={{ color: TEXT_MUTED }}>Öğrenciler yükleniyor…</p>}
              {ogrenciler && !yukleniyor && (
                <div className="mt-3">
                  <p className="text-sm font-bold" style={{ color: TEXT }}>
                    {seciliOgrenciSayisi} öğrencinin velisine gidecek
                    {gecersizSayisi > 0 && <span className="ml-2 text-xs font-normal" style={{ color: BUTTER }}>({gecersizSayisi} öğrencide geçerli veli telefonu yok)</span>}
                  </p>
                  <ul className="mt-2 grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
                    {ogrenciler.map((o) => (
                      <li key={o.id}>
                        <label className={`flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm ${o.gecerli ? "cursor-pointer" : "opacity-60"}`} style={{ color: TEXT }}>
                          <input type="checkbox" disabled={!o.gecerli} checked={o.gecerli && !disarida.has(o.id)} className="size-4"
                            onChange={() => setDisarida((d) => { const y = new Set(d); if (y.has(o.id)) y.delete(o.id); else y.add(o.id); return y; })} />
                          <span className="truncate">{o.ad}</span>
                          {o.okulNo && <span className="text-xs" style={{ color: TEXT_MUTED }}>{o.okulNo}</span>}
                          {!o.gecerli && <span className="text-xs" style={{ color: BUTTER }}>numara yok</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </fieldset>

            <fieldset className="rounded-2xl p-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
              <legend className="px-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>2 · Mesaj</legend>
              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-xs font-bold" style={{ color: TEXT_MUTED }}>Başlık</span>
                  <p className="mt-1 inline-flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER}` }}>
                    <Lock size={14} color={TEXT_MUTED} aria-hidden="true" /> {ayar.seciliBaslik}
                    <span className="ml-auto text-xs font-normal" style={{ color: TEXT_MUTED }}>sağlayıcıdan, değiştirilemez</span>
                  </p>
                </div>
                {sablonlar.length > 0 && (
                  <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>
                    Şablondan doldur
                    <select value="" onChange={(e) => { const s = sablonlar.find((x) => x.id === e.target.value); if (s) setIcerik(s.icerik); }}
                      className="min-h-11 rounded-xl px-3 py-2 text-sm font-normal" style={girdi}>
                      <option value="">Şablon seçin…</option>
                      {sablonlar.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
                    </select>
                  </label>
                )}
                <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>
                  İçerik
                  <textarea value={icerik} onChange={(e) => setIcerik(e.target.value)} rows={5} maxLength={SMS_ICERIK_SINIRI} required
                    placeholder="Sayın velimiz, …" className="rounded-xl px-3 py-2 text-sm font-normal" style={girdi} />
                </label>
                <p className="text-xs" style={{ color: TEXT_MUTED }}>
                  {uzunluk.karakter}/{SMS_ICERIK_SINIRI} karakter · yaklaşık {uzunluk.parca} SMS
                  {uzunluk.unicode && " (Türkçe karakterler mesajı daha kısa parçalara böler; sağlayıcı sayımı esastır)"}
                </p>
              </div>
            </fieldset>

            {zamanlama && (
              <fieldset className="rounded-2xl p-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
                <legend className="px-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>3 · Zaman</legend>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold" style={{ color: TEXT }}>
                  <input type="checkbox" checked={zamanli} onChange={(e) => setZamanli(e.target.checked)} className="size-4" />
                  <CalendarClock size={16} aria-hidden="true" /> İleri tarihli gönder
                </label>
                {zamanli && (
                  <div className="mt-2">
                    <input type="datetime-local" value={zaman} onChange={(e) => setZaman(e.target.value)} aria-label="Gönderim zamanı (Türkiye saati)"
                      className="min-h-11 rounded-xl px-3 py-2 text-sm" style={girdi} />
                    <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
                      Türkiye saati. Zamanlanan mesaj sağlayıcıda bekler; iptali sağlayıcı panelinden yapılır.
                    </p>
                  </div>
                )}
              </fieldset>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={pending || seciliOgrenciSayisi === 0 || icerik.trim() === ""}
                className="sfec-btn inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
                <Send size={16} aria-hidden="true" /> {pending ? "Gönderiliyor…" : zamanli ? "Zamanla" : "Gönder"}
              </button>
              <p className="text-xs" style={{ color: TEXT_MUTED }}>Yalnız bilgilendirme amaçlı kullanın; ticari/reklam içerikli mesaj göndermeyin.</p>
            </div>
          </form>
        )
      )}

      {sekme === "sablonlar" && (
        <Sablonlar sablonlar={sablonlar} kullan={(s) => { setIcerik(s.icerik); setSekme("gonder"); }} />
      )}

      {sekme === "gecmis" && <Gecmis kayitlar={gecmis} />}

      {sekme === "ayarlar" && ayarYapabilir && <SmsAyarlari ozet={ayar} okulId={okulId} />}

      {mesaj && sekme === "gonder" && (
        <p role={mesaj.hata ? "alert" : "status"} className="text-sm" style={{ color: mesaj.hata ? BLUSH : MINT }}>{mesaj.metin}</p>
      )}
    </div>
  );
}

function Bilgi({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl p-4 text-sm" style={{ background: BUTTER_BG, color: TEXT, border: `1px solid ${BORDER}` }}>
      <AlertTriangle size={18} color={BUTTER} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function Sablonlar({ sablonlar, kullan }: { sablonlar: SmsSablonu[]; kullan: (s: SmsSablonu) => void }) {
  const router = useRouter();
  const [duzenlenen, setDuzenlenen] = useState<string | undefined>();
  const [ad, setAd] = useState("");
  const [icerik, setIcerik] = useState("");
  const [mesaj, setMesaj] = useState<{ hata: boolean; metin: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await smsSablonKaydet({ id: duzenlenen, ad, icerik });
      if (sonuc.error) return setMesaj({ hata: true, metin: sonuc.error });
      setDuzenlenen(undefined); setAd(""); setIcerik("");
      setMesaj({ hata: false, metin: "Şablon kaydedildi." });
      router.refresh();
    });
  }

  function sil(s: SmsSablonu) {
    if (!window.confirm(`“${s.ad}” şablonu silinsin mi?`)) return;
    startTransition(async () => {
      const sonuc = await smsSablonSil(s.id);
      if (sonuc.error) return setMesaj({ hata: true, metin: sonuc.error });
      if (duzenlenen === s.id) { setDuzenlenen(undefined); setAd(""); setIcerik(""); }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={kaydet} className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <h2 className="text-sm font-bold" style={{ color: TEXT }}>{duzenlenen ? "Şablonu düzenle" : "Yeni şablon"}</h2>
        <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>
          Şablon adı
          <input value={ad} onChange={(e) => setAd(e.target.value)} maxLength={80} required className="min-h-11 rounded-xl px-3 py-2 text-sm font-normal" style={girdi} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>
          İçerik
          <textarea value={icerik} onChange={(e) => setIcerik(e.target.value)} rows={4} maxLength={SMS_ICERIK_SINIRI} required className="rounded-xl px-3 py-2 text-sm font-normal" style={girdi} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="sfec-btn min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
            {duzenlenen ? "Güncelle" : "Şablonu kaydet"}
          </button>
          {duzenlenen && (
            <button type="button" onClick={() => { setDuzenlenen(undefined); setAd(""); setIcerik(""); }} className="sfec-btn min-h-11 rounded-xl px-4 text-sm font-bold" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>Vazgeç</button>
          )}
        </div>
        {mesaj && <p role={mesaj.hata ? "alert" : "status"} className="text-sm" style={{ color: mesaj.hata ? BLUSH : MINT }}>{mesaj.metin}</p>}
      </form>

      {sablonlar.length === 0 ? (
        <p className="text-sm" style={{ color: TEXT_MUTED }}>Henüz şablon yok.</p>
      ) : (
        <ul className="grid gap-2">
          {sablonlar.map((s) => (
            <li key={s.id} className="rounded-2xl p-3" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold" style={{ color: TEXT }}>{s.ad}</h3>
                <div className="flex gap-1">
                  <button type="button" onClick={() => kullan(s)} className="sfec-btn min-h-10 rounded-lg px-3 text-xs font-bold" style={{ background: MINT_BG, color: TEXT, border: `1px solid ${MINT}` }}>Mesajda kullan</button>
                  <button type="button" aria-label={`${s.ad} şablonunu düzenle`} onClick={() => { setDuzenlenen(s.id); setAd(s.ad); setIcerik(s.icerik); }} className="sfec-btn grid size-10 place-items-center rounded-lg" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}><Pencil size={14} color={TEXT} aria-hidden="true" /></button>
                  <button type="button" aria-label={`${s.ad} şablonunu sil`} disabled={pending} onClick={() => sil(s)} className="sfec-btn grid size-10 place-items-center rounded-lg disabled:opacity-50" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}><Trash2 size={14} color={BLUSH} aria-hidden="true" /></button>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: TEXT_MUTED }}>{s.icerik}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Gecmis({ kayitlar }: { kayitlar: SmsGecmisKaydi[] }) {
  if (kayitlar.length === 0) return <p className="text-sm" style={{ color: TEXT_MUTED }}>Henüz gönderim yapılmamış.</p>;
  return (
    <ul className="grid gap-2">
      {kayitlar.map((k) => {
        const d = DURUM[k.durum];
        return (
          <li key={k.id} className="rounded-2xl p-3" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: d.zemin, color: d.renk }}>{d.etiket}</span>
              <span className="text-xs" style={{ color: TEXT_MUTED }}>
                {tarihYaz(k.tarih)}{k.gonderen ? ` · ${k.gonderen}` : ""} · {k.aliciSayisi} numara · başlık: {k.baslik}
              </span>
            </div>
            {k.hedef && <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>{k.hedef}</p>}
            {k.zamanlanmis && <p className="mt-1 text-xs" style={{ color: SKY }}>Planlanan zaman: {tarihYaz(k.zamanlanmis)}</p>}
            <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: TEXT }}>{k.icerik}</p>
            {k.hata && <p className="mt-1 text-xs" style={{ color: BLUSH }}>{k.hata}</p>}
          </li>
        );
      })}
    </ul>
  );
}
