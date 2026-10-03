"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, BedDouble, ChevronDown, KeyRound, MailWarning, Plus, Save, Search, Settings, ShieldCheck, Trash2, UserCheck, UserPlus, UserX, X } from "lucide-react";
import {
  moderatorAktiflikDegistir, moderatorHesapSil, moderatorKurumBilgisiGetir, moderatorKurumGuncelle,
  moderatorOgrenciEkle, moderatorOgrenciSinifTasi, moderatorOgretmenBransDegistir, moderatorOgretmenEkle,
  moderatorEpostaKaydet, moderatorOkulSiniflari, moderatorSifreBelirle, moderatorSifreSifirla, moderatorSinifEkle,
  moderatorSinifOgretmenleriGetir, moderatorSinifOgretmeniAta, moderatorSinifSil, moderatorYurtDurumuDegistir,
  moderatorOgrenciKayitlari, moderatorOgrenciKaydiGuncelle, moderatorOgrenciKaydiSil,
  type ModeratorKullanici, type ModeratorOgretmenSecenegi, type ModeratorSinifOzeti,
} from "@/app/moderator/actions";
import { AYT_ALAN_ETIKET } from "@/lib/types";
import type { KurumKademesi, KurumTuru } from "@/lib/types";
import { alanSorulurMu, hedefEtiketi, kademeBul, kurumSeviyeleri, panelBransListesi } from "@/lib/kademe";
import type { AytAlan, SinifSeviyesi } from "@/lib/types";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { KULLANICI_ADI_IPUCU, kullaniciAdiSanitize, okulNoSanitize, teslimEdilebilirEpostaMi } from "@/lib/validators";
import { SosyalEtkinlikler } from "@/components/dashboard/SosyalEtkinlikler";
import type { OgrenciYonetimKaydi } from "@/app/yonetici/actions";

export function ModeratorPanel({ okulAdi, kullanicilar, schoolId, kurumTuru, kademe, yurtlu = false, bolum = "ogrenciler" }: {
  okulAdi: string; kullanicilar: ModeratorKullanici[];
  // Branş listesi kurumun kademesine göre (ortaokul/lise/dershane).
  kurumTuru?: KurumTuru; kademe?: KurumKademesi | null;
  // Yurdu olmayan kurumda "yurt öğrencisi" işareti hiç gösterilmiyor
  // (migration 0133, kullanıcı isteği 02.10.2026).
  yurtlu?: boolean;
  // schoolId: yalnızca admin /yonetici → Moderatörler'den bu okulu
  // GÖRÜNTÜLERKEN geçilir (bkz. moderator/page.tsx) — aksiyon fonksiyonlarına
  // iletilir ki requireModerator() admin'in kendi (var olmayan) moderatör
  // satırı yerine hedef okulu kullanabilsin.
  schoolId?: string;
  // Menüde seçili bölüm (kullanıcı isteği 03.10.2026, bkz.
  // ModeratorNavigasyonu). Deneme bölümleri sayfada ayrıca çiziliyor.
  bolum?: "ogrenciler" | "ogretmenler" | "siniflar" | "kurum";
}) {
  const [mesaj, setMesaj] = useState<string | null>(null);
  const dershane = kurumTuru === "dershane";

  return <div className="flex flex-col gap-5">
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2"><ShieldCheck size={18} color={MINT} /><h1 style={{ color: TEXT }} className="font-bold">{okulAdi}</h1></div>
      <p style={{ color: TEXT_MUTED }} className="mt-2 text-xs leading-relaxed">Yetkiniz yalnız bu kurumun öğrenci, öğretmen, müdür ve bağlı velileriyle sınırlıdır. Başka kurumların kayıtları görüntülenmez veya değiştirilemez.</p>
    </div>
    {mesaj && <div role="status" className="rounded-xl p-3 text-xs font-bold" style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT, background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>{mesaj}</div>}

    {bolum === "ogrenciler" && (
      <KullaniciBolumu baslik="Öğrenciler" kullanicilar={kullanicilar} sekmeler={["ogrenci", "veli"]}
        ekleEtiketi="Öğrenci ekle"
        ekleFormu={(kapat) => <OgrenciEkleFormu schoolId={schoolId} dershane={dershane} onDone={(msg) => { setMesaj(msg); if (!msg.startsWith("Hata")) kapat(); }} />}
        aciklama="Öğrenci eklemek için önce Sınıflar bölümünden sınıfları oluşturun. Hatalı çalışma, soru veya deneme girişlerini öğrencinin adına tıklayıp Kayıtlar bölümünden düzeltin."
        schoolId={schoolId} kurumTuru={kurumTuru} kademe={kademe} yurtlu={yurtlu} onMesaj={setMesaj} />
    )}
    {bolum === "ogretmenler" && (
      <KullaniciBolumu baslik="Öğretmenler" kullanicilar={kullanicilar} sekmeler={["ogretmen"]}
        ekleEtiketi="Öğretmen ekle"
        ekleFormu={(kapat) => <OgretmenEkleFormu schoolId={schoolId} kurumTuru={kurumTuru} kademe={kademe} onDone={(msg) => { setMesaj(msg); if (!msg.startsWith("Hata")) kapat(); }} />}
        aciklama="Sınıf öğretmenliği Sınıflar bölümünden atanır. Bir öğretmeni çıkarmak için adına tıklayıp “Pasifleştir / Sil”i kullanın."
        schoolId={schoolId} kurumTuru={kurumTuru} kademe={kademe} yurtlu={yurtlu} onMesaj={setMesaj} />
    )}
    {bolum === "siniflar" && <SiniflarBolumu schoolId={schoolId} kademe={kademe} onMesaj={setMesaj} />}
    {bolum === "kurum" && (
      <>
        <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: TEXT }}>
            <Settings size={15} color={TEXT_MUTED} /> Kurum bilgileri
          </div>
          <p style={{ color: TEXT_MUTED }} className="mt-1 text-xs">Kurum kodu, öğrencilerin ve öğretmenlerin kayıt olurken girdiği koddur; değiştirirseniz yeni kodu duyurun.</p>
          <KurumBilgileriDuzenleyici schoolId={schoolId} onMesaj={setMesaj} />
        </div>
        {!schoolId && <SosyalEtkinlikler okumaOnayi={false} />}
      </>
    )}
  </div>;
}

// Öğrenciler / Öğretmenler bölümlerinin ortak gövdesi: üstte "ekle" düğmesi
// ve formu, altında süzgeçli, sayfalı kullanıcı listesi.
function KullaniciBolumu({ baslik, kullanicilar, sekmeler, ekleEtiketi, ekleFormu, aciklama, schoolId, kurumTuru, kademe, yurtlu, onMesaj }: {
  baslik: string;
  kullanicilar: ModeratorKullanici[];
  sekmeler: ModeratorKullanici["kategori"][];
  ekleEtiketi: string;
  ekleFormu: (kapat: () => void) => React.ReactNode;
  aciklama: string;
  schoolId?: string; kurumTuru?: KurumTuru; kademe?: KurumKademesi | null; yurtlu?: boolean;
  onMesaj: (m: string) => void;
}) {
  const SAYFA_BOYUTU = 50;
  const [sekme, setSekme] = useState<ModeratorKullanici["kategori"]>(sekmeler[0]);
  const [arama, setArama] = useState("");
  const [sinif, setSinif] = useState("tumu");
  const [durum, setDurum] = useState<"tumu" | "aktif" | "pasif">("tumu");
  const [sayfa, setSayfa] = useState(1);
  const [ekleAcik, setEkleAcik] = useState(false);
  const SEKME_ADI: Record<ModeratorKullanici["kategori"], string> = { ogrenci: "Öğrenciler", ogretmen: "Öğretmenler", veli: "Veliler" };

  const kapsam = useMemo(() => kullanicilar.filter((k) => sekmeler.includes(k.kategori)), [kullanicilar, sekmeler]);
  const siniflar = useMemo(() => [...new Set(kapsam.filter((k) => k.kategori === sekme).map((k) => k.sinif).filter((x): x is string => !!x))].sort(), [kapsam, sekme]);
  const gosterilenler = useMemo(() => {
    const terim = arama.trim().toLocaleLowerCase("tr-TR");
    return kapsam.filter((k) =>
      k.kategori === sekme
      && (sinif === "tumu" || k.sinif === sinif)
      && (durum === "tumu" || (durum === "aktif" ? k.aktif : !k.aktif))
      && (!terim || `${k.ad} ${k.detay} ${k.kullaniciKodu}`.toLocaleLowerCase("tr-TR").includes(terim))
    );
  }, [arama, kapsam, sekme, sinif, durum]);
  const toplamSayfa = Math.max(1, Math.ceil(gosterilenler.length / SAYFA_BOYUTU));
  const etkinSayfa = Math.min(sayfa, toplamSayfa);
  const sayfadakiler = useMemo(() => gosterilenler.slice((etkinSayfa - 1) * SAYFA_BOYUTU, etkinSayfa * SAYFA_BOYUTU), [etkinSayfa, gosterilenler]);
  const sinifSuzgeciVar = sekme !== "veli" && siniflar.length > 0;

  return <>
    <div className="rounded-3xl p-4 sm:p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{baslik}</h2>
          <p className="mt-0.5 text-xs" style={{ color: TEXT_MUTED }}>{aciklama}</p>
        </div>
        <button type="button" onClick={() => setEkleAcik((v) => !v)} aria-expanded={ekleAcik}
          className="sfec-btn flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold"
          style={{ background: ekleAcik ? BG1_ALT : MINT, color: ekleAcik ? TEXT : MINT_ON, border: `2px solid ${ekleAcik ? BORDER_STRONG : MINT}` }}>
          {ekleAcik ? <X size={15} /> : <UserPlus size={15} />} {ekleAcik ? "Vazgeç" : ekleEtiketi}
        </button>
      </div>
      {ekleAcik && ekleFormu(() => setEkleAcik(false))}

      {sekmeler.length > 1 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm">
          {sekmeler.map((id) => {
            const adet = kapsam.filter((k) => k.kategori === id).length;
            return <button key={id} type="button" onClick={() => { setSekme(id); setSayfa(1); setSinif("tumu"); }}
              className="sfec-btn rounded-xl px-2 py-2.5 text-xs font-bold"
              style={{ background: sekme === id ? MINT : BG1_ALT, color: sekme === id ? MINT_ON : TEXT, border: `2px solid ${sekme === id ? MINT : BORDER_STRONG}` }}>
              {SEKME_ADI[id]} ({adet})
            </button>;
          })}
        </div>
      )}
      <div className={`mt-3 grid grid-cols-1 gap-2 ${sinifSuzgeciVar ? "sm:grid-cols-[1fr_160px_140px]" : "sm:grid-cols-[1fr_140px]"}`}>
        <label className="relative"><span className="sr-only">Ara</span><Search size={14} color={TEXT_MUTED} className="absolute left-3 top-1/2 -translate-y-1/2"/><input value={arama} onChange={(e) => { setArama(e.target.value); setSayfa(1); }} placeholder={sekme === "ogretmen" ? "İsim veya branş ara" : "İsim veya numara ara"} className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}/></label>
        {sinifSuzgeciVar && <select aria-label="Sınıf süzgeci" value={sinif} onChange={(e) => { setSinif(e.target.value); setSayfa(1); }} className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><option value="tumu">Tüm sınıflar</option>{siniflar.map((s) => <option key={s} value={s}>{s}</option>)}</select>}
        <select aria-label="Durum süzgeci" value={durum} onChange={(e) => { setDurum(e.target.value as typeof durum); setSayfa(1); }} className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          <option value="tumu">Aktif + pasif</option>
          <option value="aktif">Sadece aktif</option>
          <option value="pasif">Sadece pasif</option>
        </select>
      </div>
      <p style={{ color: TEXT_MUTED }} className="mt-3 text-xs font-semibold">Listelenen kişi: <strong style={{ color: TEXT }}>{gosterilenler.length}</strong></p>
    </div>
    <div className="sfec-liste">
      {sayfadakiler.map(k => <KullaniciKarti key={k.id} kullanici={k} schoolId={schoolId} kurumTuru={kurumTuru} kademe={kademe} yurtlu={yurtlu} onMesaj={onMesaj} />)}
      {gosterilenler.length === 0 && <div className="col-span-full rounded-2xl p-6 text-center text-sm" style={{ color: TEXT_MUTED, background: BG1, border: `2px solid ${BORDER}` }}>Bu süzgeçlere uygun kişi bulunamadı.</div>}
    </div>
    {toplamSayfa > 1 && <nav aria-label="Liste sayfaları" className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" disabled={etkinSayfa === 1} onClick={() => setSayfa(Math.max(1, etkinSayfa - 1))} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40" style={{ color: TEXT, background: BG1, border: `2px solid ${BORDER_STRONG}` }}>Önceki</button>
      {Array.from({ length: toplamSayfa }, (_, i) => i + 1).map((no) => <button key={no} type="button" aria-current={etkinSayfa === no ? "page" : undefined} onClick={() => setSayfa(no)} className="sfec-btn min-w-9 rounded-xl px-3 py-2 text-xs font-bold" style={{ color: etkinSayfa === no ? MINT_ON : TEXT, background: etkinSayfa === no ? MINT : BG1, border: `2px solid ${etkinSayfa === no ? MINT : BORDER_STRONG}` }}>{no}</button>)}
      <button type="button" disabled={etkinSayfa === toplamSayfa} onClick={() => setSayfa(Math.min(toplamSayfa, etkinSayfa + 1))} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40" style={{ color: TEXT, background: BG1, border: `2px solid ${BORDER_STRONG}` }}>Sonraki</button>
    </nav>}
  </>;
}

// Sınıflar bölümü (kullanıcı isteği 03.10.2026): sınıf ekleme/silme ve her
// sınıfın sınıf öğretmenini tek tabloda tanımlama.
function SiniflarBolumu({ schoolId, kademe, onMesaj }: { schoolId?: string; kademe?: KurumKademesi | null; onMesaj: (m: string) => void }) {
  const [veri, setVeri] = useState<{ siniflar: ModeratorSinifOzeti[]; ogretmenler: ModeratorOgretmenSecenegi[] } | null>(null);
  const [ekleAcik, setEkleAcik] = useState(false);
  const [pending, startTransition] = useTransition();

  function yenile() {
    startTransition(async () => {
      const r = await moderatorSinifOgretmenleriGetir(schoolId);
      if (r.error) onMesaj(`Hata: ${r.error}`);
      setVeri({ siniflar: r.siniflar, ogretmenler: r.ogretmenler });
    });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { yenile(); }, [schoolId]);

  function ata(sinif: ModeratorSinifOzeti, teacherId: string) {
    startTransition(async () => {
      const r = await moderatorSinifOgretmeniAta(sinif.id, teacherId || null, schoolId);
      onMesaj(r.error ? `Hata: ${r.error}` : teacherId ? `${sinif.seviye}-${sinif.sube} sınıf öğretmeni kaydedildi.` : `${sinif.seviye}-${sinif.sube} sınıf öğretmenliği boşaltıldı.`);
      yenile();
    });
  }

  function sil(sinif: ModeratorSinifOzeti) {
    if (!window.confirm(`${sinif.seviye}-${sinif.sube} sınıfı silinsin mi?`)) return;
    startTransition(async () => {
      const r = await moderatorSinifSil(sinif.id, schoolId);
      onMesaj(r.error ? `Hata: ${r.error}` : `${sinif.seviye}-${sinif.sube} silindi.`);
      if (!r.error) yenile();
    });
  }

  return (
    <div className="rounded-3xl p-4 sm:p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Sınıflar ve sınıf öğretmenleri</h2>
          <p className="mt-0.5 text-xs" style={{ color: TEXT_MUTED }}>Her sınıfın bir sınıf öğretmeni olabilir. Başka sınıfın öğretmenini seçerseniz o sınıftan bu sınıfa geçer.</p>
        </div>
        <button type="button" onClick={() => setEkleAcik((v) => !v)} aria-expanded={ekleAcik}
          className="sfec-btn flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold"
          style={{ background: ekleAcik ? BG1_ALT : MINT, color: ekleAcik ? TEXT : MINT_ON, border: `2px solid ${ekleAcik ? BORDER_STRONG : MINT}` }}>
          {ekleAcik ? <X size={15} /> : <Plus size={15} />} {ekleAcik ? "Vazgeç" : "Sınıf ekle"}
        </button>
      </div>
      {ekleAcik && <SinifEkleFormuModerator schoolId={schoolId} kademe={kademe} onEklendi={() => yenile()} />}

      {veri === null ? (
        <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Yükleniyor...</p>
      ) : veri.siniflar.length === 0 ? (
        <p className="mt-4 text-xs font-semibold" style={{ color: BLUSH }}>Bu kurum için henüz sınıf eklenmedi. Öğrenci eklemeden önce sınıflarınızı oluşturun.</p>
      ) : (
        <ul className="sfec-liste mt-4">
          {veri.siniflar.map((s) => (
            <li key={s.id} className="sfec-liste-satiri flex flex-col gap-2 px-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="text-sm font-bold" style={{ color: TEXT }}>{s.seviye}-{s.sube}</span>
                <span className="ml-2 text-xs" style={{ color: TEXT_MUTED }}>{s.ogrenciSayisi} öğrenci</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT_MUTED }}>
                  <UserCheck size={14} />
                  <span className="sr-only">{s.seviye}-{s.sube} sınıf öğretmeni</span>
                  <select value={s.sinifOgretmeniId ?? ""} disabled={pending} onChange={(e) => ata(s, e.target.value)}
                    className="min-h-10 max-w-64 rounded-xl px-3 py-2 text-xs font-semibold outline-none disabled:opacity-60"
                    style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                    <option value="">Sınıf öğretmeni yok</option>
                    {veri.ogretmenler.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.ad} · {t.brans}{t.sinifId && t.sinifId !== s.id ? ` (şu an ${(() => { const c = veri.siniflar.find((x) => x.id === t.sinifId); return c ? `${c.seviye}-${c.sube}` : "başka sınıf"; })()})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => sil(s)} disabled={pending} title={s.ogrenciSayisi > 0 ? "Öğrencisi olan sınıf silinemez" : "Sınıfı sil"}
                  aria-label={`${s.seviye}-${s.sube} sınıfını sil`}
                  className="sfec-btn flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-50" style={{ border: `2px solid ${BORDER_STRONG}` }}>
                  <Trash2 size={14} color={BLUSH} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Kurum ayarları (isim, kurum kodu) — 2026-08-26 kullanıcı isteği: "Kurum
// ayarlarını (isim, kurum kodu gibi) düzenleyebilir". 03.10.2026'dan beri
// menüde kendi bölümü (Kurum bilgileri) olduğu için doğrudan açık geliyor.
function KurumBilgileriDuzenleyici({ schoolId, onMesaj }: { schoolId?: string; onMesaj: (m: string) => void }) {
  // ad===null → henüz yüklenmedi ("Yükleniyor..." bu şekilde türetiliyor,
  // ayrı bir yükleniyor state'i effect içinde senkron setState'e yol açardı).
  const [ad, setAd] = useState<string | null>(null);
  const [okulKodu, setOkulKodu] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (ad !== null) return;
    // Bkz. KullaniciArama.tsx'teki startTransition notu.
    startTransition(() => {
      moderatorKurumBilgisiGetir(schoolId).then((r) => {
        if (r.error) onMesaj(`Hata: ${r.error}`);
        setAd(r.ad);
        setOkulKodu(r.okulKodu);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad]);

  function kaydet() {
    startTransition(async () => {
      const r = await moderatorKurumGuncelle({ ad: ad ?? "", okulKodu }, schoolId);
      onMesaj(r.error ? `Hata: ${r.error}` : "Kurum bilgileri güncellendi.");
    });
  }

  return (
    <div className="mt-2">
      {(ad === null ? (
        <p style={{ color: TEXT_MUTED }} className="mt-3 text-xs">Yükleniyor...</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-48 flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Kurum adı</span>
            <input value={ad} onChange={(e) => setAd(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          </label>
          <label className="flex min-w-40 flex-col gap-1">
            <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Kurum kodu</span>
            <input value={okulKodu} onChange={(e) => setOkulKodu(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          </label>
          <button type="button" onClick={kaydet} disabled={pending} className="sfec-btn flex min-h-10 items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            <Save size={12} /> {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      ))}
    </div>
  );
}

// Admin panelindeki SinifEkleFormu (OgretmenPanel.tsx) ile aynı görsel
// dil/davranış — sadece moderatorSinifEkle çağırıyor ve eklenen sınıfı
// üst bileşenin listesine (id dahil) geri veriyor.
function SinifEkleFormuModerator({ schoolId, kademe, onEklendi }: { schoolId?: string; kademe?: KurumKademesi | null; onEklendi: () => void }) {
  const seviyeler = kurumSeviyeleri(kademe) as SinifSeviyesi[];
  const [seviye, setSeviye] = useState<SinifSeviyesi>(seviyeler.includes("9") ? "9" : seviyeler[0]);
  const [sube, setSube] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!sube.trim()) return setHata("Şube adı girin (örn. E).");
    startTransition(async () => {
      const res = await moderatorSinifEkle(seviye, sube, schoolId);
      if (res.error) return setHata(res.error);
      onEklendi();
      setSube("");
    });
  }

  return (
    <form onSubmit={ekle} className="mt-3 flex flex-wrap items-end gap-2.5 rounded-xl p-3" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <label className="flex flex-col gap-1">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Seviye</span>
        <select value={seviye} onChange={(e) => setSeviye(e.target.value as SinifSeviyesi)}
          className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
          {seviyeler.map((sv) => <option key={sv} value={sv}>{sv}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Şube</span>
        <input value={sube} onChange={(e) => setSube(e.target.value)} placeholder="örn. E" maxLength={2}
          className="text-sm px-2.5 py-1.5 rounded-xl outline-none w-20" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
      </label>
      <button type="submit" disabled={pending}
        className="sfec-btn flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-60"
        style={{ background: MINT, color: MINT_ON }}>
        <Plus size={13} /> {pending ? "Ekleniyor..." : "Sınıf ekle"}
      </button>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
    </form>
  );
}

function OgretmenEkleFormu({ schoolId, onDone, kurumTuru, kademe }: { schoolId?: string; onDone: (msg: string) => void; kurumTuru?: KurumTuru; kademe?: KurumKademesi | null }) {
  const branslar = panelBransListesi(kurumTuru ?? "okul", kademe);
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [brans, setBrans] = useState<string>(branslar[0]);
  const [pending, startTransition] = useTransition();

  function ekle() {
    startTransition(async () => {
      const r = await moderatorOgretmenEkle({ ad, email, telefon, brans }, schoolId);
      if (r.error) return onDone(`Hata: ${r.error}`);
      onDone(`Öğretmen eklendi. Geçici şifre: ${r.sifre}`);
    });
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl p-3 sm:grid-cols-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <Alan etiket="Ad soyad" value={ad} onChange={setAd} />
      <Alan etiket="E-posta" value={email} onChange={setEmail} type="email" />
      <Alan etiket="Telefon" value={telefon} onChange={setTelefon} />
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Branş</span>
        <select value={brans} onChange={(e) => setBrans(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          {branslar.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </label>
      <button type="button" onClick={ekle} disabled={pending} className="sfec-btn self-start rounded-full px-3 py-2 text-[11px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Ekleniyor..." : "Öğretmeni ekle"}
      </button>
    </div>
  );
}

function OgrenciEkleFormu({ schoolId, dershane, onDone }: { schoolId?: string; dershane: boolean; onDone: (msg: string) => void }) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [okulNo, setOkulNo] = useState("");
  const [telefon, setTelefon] = useState("");
  const [classId, setClassId] = useState("");
  const [aytAlan, setAytAlan] = useState<AytAlan>("SAY");
  const [hedefBolum, setHedefBolum] = useState("");
  const [siniflar, setSiniflar] = useState<{ id: string; seviye: string; sube: string }[] | null>(null);
  const [pending, startTransition] = useTransition();
  // Secilen SINIFIN seviyesinden: 5-8 ise YKS alani sorulmaz, hedef meslek olur.
  const seciliKademe = kademeBul((siniflar ?? []).find((x) => x.id === classId)?.seviye);

  useEffect(() => {
    startTransition(() => { moderatorOkulSiniflari(schoolId).then((r) => setSiniflar(r.siniflar)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ekle() {
    startTransition(async () => {
      const r = await moderatorOgrenciEkle({ ad, email, okulNo, telefon, classId, aytAlan, hedefBolum }, schoolId);
      if (r.error) return onDone(`Hata: ${r.error}`);
      onDone(`Öğrenci eklendi. Geçici şifre: ${r.sifre}`);
    });
  }

  // Kullanıcı isteği (27.08.2026): "manuel öğrenci kaydı yapan moderatör
  // veya müdür önce sınıfları oluştur uyarısı alsın" — sınıf listesi boşsa
  // formun tamamı yerine sadece bu uyarı gösteriliyor, öğrenci eklenemez.
  if (siniflar !== null && siniflar.length === 0) {
    return (
      <div className="mt-3 rounded-xl p-3 text-xs font-semibold" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}`, color: BLUSH }}>
        Bu kurum için henüz sınıf eklenmedi. Öğrenci eklemeden önce menüdeki Sınıflar bölümünden en az bir sınıf oluşturun.
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl p-3 sm:grid-cols-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <Alan etiket="Ad soyad" value={ad} onChange={setAd} />
      <Alan etiket="E-posta" value={email} onChange={setEmail} type="email" />
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>{dershane ? "Kullanıcı adı" : "Okul numarası"}</span>
        <input value={okulNo} inputMode={dershane ? "text" : "numeric"} autoComplete="off"
          onChange={(e) => setOkulNo(dershane ? kullaniciAdiSanitize(e.target.value) : okulNoSanitize(e.target.value))}
          className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
        <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{dershane ? `Öğrenci bununla giriş yapar. ${KULLANICI_ADI_IPUCU}` : "1-5 haneli okul numarası."}</span>
      </label>
      <Alan etiket="Telefon" value={telefon} onChange={setTelefon} />
      <Alan etiket={hedefEtiketi(seciliKademe)} value={hedefBolum} onChange={setHedefBolum} />
      {alanSorulurMu(seciliKademe) && (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>AYT alanı</span>
          <select value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            {(Object.keys(AYT_ALAN_ETIKET) as AytAlan[]).map((a) => <option key={a} value={a}>{AYT_ALAN_ETIKET[a]}</option>)}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Sınıf</span>
        {siniflar === null ? (
          <span className="text-xs" style={{ color: TEXT_MUTED }}>Yükleniyor...</span>
        ) : (
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <option value="">Sınıf seçin</option>
            {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
          </select>
        )}
      </label>
      <button type="button" onClick={ekle} disabled={pending || !classId} className="sfec-btn self-start rounded-full px-3 py-2 text-[11px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Ekleniyor..." : "Öğrenciyi ekle"}
      </button>
    </div>
  );
}

function Alan({ etiket, value, onChange, type = "text" }: { etiket: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>{etiket}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} /></label>;
}

function ModeratorOgrenciKayitlari({ studentId, schoolId }: { studentId: string; schoolId?: string }) {
  const [kayitlar, setKayitlar] = useState<OgrenciYonetimKaydi[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const yukle = useCallback(() => {
    moderatorOgrenciKayitlari(studentId, schoolId).then((r) => {
      setHata(r.error);
      setKayitlar(r.kayitlar);
    });
  }, [studentId, schoolId]);
  useEffect(() => { startTransition(yukle); }, [yukle]);
  function kaydet(k: OgrenciYonetimKaydi, degerler: { tarih: string; sureDakika?: number; ders: string; konu?: string; dogru?: number; yanlis?: number }) {
    startTransition(async () => {
      const r = await moderatorOgrenciKaydiGuncelle({ studentId, id: k.id, tur: k.tur, ...degerler }, schoolId);
      if (r.error) return setHata(r.error);
      yukle();
    });
  }
  function sil(k: OgrenciYonetimKaydi) {
    if (!window.confirm(`Bu ${k.tur} kaydı kalıcı olarak silinsin mi?`)) return;
    startTransition(async () => {
      const r = await moderatorOgrenciKaydiSil(studentId, k.id, k.tur, schoolId);
      if (r.error) return setHata(r.error);
      yukle();
    });
  }
  return <div className="mt-3 rounded-xl p-3" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
    <p className="mb-2 text-xs font-bold" style={{ color: TEXT }}>Öğrenci çalışma, soru ve deneme kayıtları</p>
    <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
      {!pending && kayitlar.length === 0 && !hata && <p className="text-xs" style={{ color: TEXT_MUTED }}>Kayıt bulunamadı.</p>}
      {kayitlar.map((k) => <ModeratorKayitSatiri key={`${k.tur}-${k.id}`} kayit={k} disabled={pending} onSave={(v) => kaydet(k, v)} onDelete={() => sil(k)} />)}
    </div>
    {hata && <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
  </div>;
}

function ModeratorKayitSatiri({ kayit, disabled, onSave, onDelete }: { kayit: OgrenciYonetimKaydi; disabled: boolean; onSave: (v: { tarih: string; sureDakika?: number; ders: string; konu?: string; dogru?: number; yanlis?: number }) => void; onDelete: () => void }) {
  const [tarih, setTarih] = useState(kayit.tarih);
  const [sure, setSure] = useState(String(kayit.sureDakika ?? ""));
  const [ders, setDers] = useState(kayit.ders);
  const [konu, setKonu] = useState(kayit.konu ?? "");
  const [dogru, setDogru] = useState(String(kayit.dogru ?? 0));
  const [yanlis, setYanlis] = useState(String(kayit.yanlis ?? 0));
  return <div className="grid grid-cols-1 items-center gap-2 rounded-lg p-2 sm:grid-cols-[1fr_auto_auto]" style={{ background: BG1, border: `2px solid ${BORDER_STRONG}` }}>
    <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: TEXT }}>
      <strong className="col-span-2">{kayit.tur.toLocaleUpperCase("tr-TR")}</strong>
      {kayit.tur === "deneme" ? <select value={ders} onChange={(e) => setDers(e.target.value)} style={{ border: `2px solid ${BORDER_STRONG}` }}><option>TYT</option><option>AYT</option></select> : <input value={ders} onChange={(e) => setDers(e.target.value)} placeholder="Ders" style={{ border: `2px solid ${BORDER_STRONG}` }} />}
      {kayit.tur === "konu" && <input value={konu} onChange={(e) => setKonu(e.target.value)} placeholder="Konu" style={{ border: `2px solid ${BORDER_STRONG}` }} />}
      {kayit.tur === "soru" && <><input type="number" min={0} value={dogru} onChange={(e) => setDogru(e.target.value)} placeholder="Doğru" style={{ border: `2px solid ${BORDER_STRONG}` }} /><input type="number" min={0} value={yanlis} onChange={(e) => setYanlis(e.target.value)} placeholder="Yanlış" style={{ border: `2px solid ${BORDER_STRONG}` }} /></>}
    </div>
    <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="rounded px-2 py-1 text-xs" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
    <div className="flex items-center gap-1">
      {kayit.tur !== "deneme" && <input type="number" min={1} max={480} value={sure} onChange={(e) => setSure(e.target.value)} className="w-20 rounded px-2 py-1 text-xs" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />}
      <button type="button" disabled={disabled} onClick={() => onSave({ tarih, sureDakika: kayit.tur === "deneme" ? undefined : Number(sure), ders, konu, dogru: Number(dogru), yanlis: Number(yanlis) })} title="Kaydet" style={{ color: MINT }}><Save size={14} /></button>
      <button type="button" disabled={disabled} onClick={onDelete} title="Sil" style={{ color: BLUSH }}><Trash2 size={14} /></button>
    </div>
  </div>;
}

function KullaniciKarti({ kullanici: k, schoolId, onMesaj, kurumTuru, kademe, yurtlu }: { kullanici: ModeratorKullanici; schoolId?: string; onMesaj: (m: string) => void; kurumTuru?: KurumTuru; kademe?: KurumKademesi | null; yurtlu?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [sifreAcik, setSifreAcik] = useState(false);
  const [kayitlarAcik, setKayitlarAcik] = useState(false);
  const [yeniSifre, setYeniSifre] = useState("");
  // Kullanıcı isteği (26.08.2026): Pasifleştir/Sil artık doğrudan görünmüyor
  // — "Diğer ayarlar" tıklanınca açılıyor.
  const [digerAcik, setDigerAcik] = useState(false);
  const [epostaKayitli, setEpostaKayitli] = useState(teslimEdilebilirEpostaMi(k.email));
  const [eposta, setEposta] = useState(teslimEdilebilirEpostaMi(k.email) ? k.email ?? "" : "");
  const [satirAcik, setSatirAcik] = useState(false);
  const sadeSatirMi = true;

  return (
    <div className={sadeSatirMi ? "sfec-liste-satiri px-2 py-1" : "rounded-2xl p-3.5"}
      style={sadeSatirMi ? undefined : { background: BG1, border: `2px solid ${BORDER}` }}>
      {sadeSatirMi ? <button type="button" onClick={() => setSatirAcik((v) => !v)} aria-expanded={satirAcik}
        className="group flex w-full items-center justify-between gap-3 py-2 text-left">
        <span style={{ color: TEXT }} className="min-w-0 truncate text-sm font-bold group-hover:font-extrabold">{k.ad}<span className="ml-1 text-[9px] font-semibold" style={{ color: TEXT_MUTED }}>{k.kullaniciKodu}</span>{k.moderatorMu && <span className="ml-1 text-[9px] font-bold" style={{ color: MINT }}>Moderatör</span>}</span>
        <span className="flex max-w-[48%] shrink-0 items-center gap-2 truncate text-xs" style={{ color: TEXT_MUTED }}>{k.sinif ?? k.detay}<ChevronDown size={15} className="shrink-0" style={{ transform: satirAcik ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}/></span>
      </button> : <><div style={{ color: TEXT }} className="text-sm font-bold flex items-center gap-1.5 flex-wrap">
        {k.ad}
        {k.moderatorMu && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: MINT, color: MINT_ON }}><ShieldCheck size={9}/> Moderatör</span>}
      </div>
      <div style={{ color: TEXT_MUTED }} className="text-xs">{k.detay}</div></>}
      {(!sadeSatirMi || satirAcik) && <>
      {sadeSatirMi && <div style={{ color: TEXT_MUTED }} className="pb-1 text-xs">{k.kullaniciKodu} · {k.detay}</div>}
      {!epostaKayitli && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg p-2 sm:flex-row sm:items-end" style={{ background: "rgba(225,29,72,0.08)", border: `1px solid ${BLUSH}` }}>
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <MailWarning size={14} className="mt-0.5 shrink-0" color={BLUSH} />
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[10px] font-semibold" style={{ color: BLUSH }}>Şifre işleminden önce e-posta adresini kaydedin.</span>
              <input type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="kullanici@ornek.com"
                className="rounded-lg px-2.5 py-1.5 text-xs outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
            </label>
          </div>
          <button type="button" disabled={pending || !eposta.trim()} onClick={() => startTransition(async () => {
            const r = await moderatorEpostaKaydet(k.id, eposta, schoolId);
            onMesaj(r.error ? `Hata: ${r.error}` : `${k.ad} için e-posta kaydedildi.`);
            if (!r.error) setEpostaKayitli(true);
          })} className="sfec-btn rounded-lg px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>E-postayı kaydet</button>
        </div>
      )}
      {/* Kullanıcı isteği (27.08.2026): "öğrenci hesabı yönetim butonları
          küçültülecek" — kart başına buton sayısı fazla olduğundan (özellikle
          öğrenci kartlarında) daha kompakt bir dolgu/yazı boyutuna geçildi. */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {k.kategori === "ogrenci" && <button type="button" onClick={() => setKayitlarAcik((v) => !v)} className="sfec-btn flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>Çalışma kayıtları</button>}
        <button disabled={pending || !epostaKayitli} title={epostaKayitli ? undefined : "Önce e-posta kaydedin"} onClick={() => startTransition(async () => { const r = await moderatorSifreSifirla(k.id, schoolId); onMesaj(r.error ? `Hata: ${r.error}` : `Geçici şifre (${k.ad}): ${r.sifre}`); })} className="sfec-btn flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold disabled:opacity-50" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><KeyRound className="mr-1 inline" size={11}/>Rastgele şifre</button>
        <button disabled={pending || !epostaKayitli} title={epostaKayitli ? undefined : "Önce e-posta kaydedin"} onClick={() => setSifreAcik((v) => !v)} className="sfec-btn flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold disabled:opacity-50" style={{ background: sifreAcik ? MINT : "transparent", color: sifreAcik ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}><KeyRound className="mr-1 inline" size={11}/>Şifre belirle</button>
        {(k.kategori === "ogrenci" || k.kategori === "ogretmen") && (
          <button disabled={pending} onClick={() => setDuzenleAcik((v) => !v)} title={k.kategori === "ogrenci" ? "Sınıf taşı" : "Branş değiştir"}
            className="sfec-btn rounded-lg px-2.5 py-1.5 text-[10px] font-bold" style={{ background: duzenleAcik ? MINT : "transparent", color: duzenleAcik ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <ArrowRightLeft className="mr-1 inline" size={11}/>{k.kategori === "ogrenci" ? "Sınıf taşı" : "Branş"}
          </button>
        )}
        <button disabled={pending} onClick={() => setDigerAcik((v) => !v)}
          className="sfec-btn rounded-lg px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1" style={{ background: digerAcik ? MINT : "transparent", color: digerAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
          Pasifleştir / Sil <ChevronDown size={11} style={{ transform: digerAcik ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}/>
        </button>
      </div>

      {digerAcik && (
        <div className="mt-2 flex flex-wrap gap-1.5 rounded-lg p-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <button disabled={pending} onClick={() => startTransition(async () => { const r = await moderatorAktiflikDegistir(k.id, !k.aktif, schoolId); onMesaj(r.error ? `Hata: ${r.error}` : "İşlem tamamlandı."); })} className="sfec-btn flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold" style={{ color: k.aktif ? BLUSH : MINT, border: `2px solid ${BORDER_STRONG}` }}>{k.aktif ? <UserX className="mr-1 inline" size={11}/> : <UserCheck className="mr-1 inline" size={11}/>} {k.aktif ? "Pasifleştir" : "Aktifleştir"}</button>
          <button disabled={pending} onClick={() => { if (!window.confirm(`${k.ad} hesabı kalıcı olarak silinsin mi?`)) return; startTransition(async () => { const r = await moderatorHesapSil(k.id, schoolId); onMesaj(r.error ? `Hata: ${r.error}` : "Hesap silindi."); }); }} className="sfec-btn rounded-lg px-2.5 py-1.5 text-[10px] font-bold" style={{ color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}><Trash2 className="mr-1 inline" size={11}/>Sil</button>
        </div>
      )}

      {sifreAcik && (
        <div className="mt-2 flex items-center gap-2 rounded-lg p-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <input type="text" value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)} placeholder="Yeni şifre (en az 8, harf+rakam+özel işaret)"
            className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          <button type="button" disabled={pending || !yeniSifre} onClick={() => startTransition(async () => {
            const r = await moderatorSifreBelirle(k.id, yeniSifre, schoolId);
            onMesaj(r.error ? `Hata: ${r.error}` : `${k.ad} için şifre güncellendi.`);
            if (!r.error) { setYeniSifre(""); setSifreAcik(false); }
          })} className="sfec-btn shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>Kaydet</button>
        </div>
      )}

      {kayitlarAcik && k.kategori === "ogrenci" && <ModeratorOgrenciKayitlari studentId={k.id} schoolId={schoolId} />}
      {duzenleAcik && k.kategori === "ogrenci" && (
        <ModeratorOgrenciSinifTasiFormu studentId={k.id} schoolId={schoolId} onDone={(msg) => { onMesaj(msg); setDuzenleAcik(false); }} />
      )}
      {duzenleAcik && k.kategori === "ogretmen" && (
        <ModeratorOgretmenBransFormu teacherId={k.id} schoolId={schoolId} kurumTuru={kurumTuru} kademe={kademe} onDone={(msg) => { onMesaj(msg); setDuzenleAcik(false); }} />
      )}

      {k.kategori === "ogrenci" && yurtlu && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button disabled={pending} title="Hafta içi telefonuna erişemeyen öğrenciler için hatırlatmalar hafta sonuna göre esnetilir"
            onClick={() => startTransition(async () => { const r = await moderatorYurtDurumuDegistir(k.id, !k.yurtOgrencisi, schoolId); onMesaj(r.error ? `Hata: ${r.error}` : "İşlem tamamlandı."); })}
            className="sfec-btn flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold"
            style={{ background: k.yurtOgrencisi ? MINT : "transparent", color: k.yurtOgrencisi ? MINT_ON : TEXT_MUTED, border: `2px solid ${k.yurtOgrencisi ? MINT : BORDER_STRONG}` }}>
            <BedDouble size={12}/> {k.yurtOgrencisi ? "Yurt öğrencisi ✓" : "Yurt öğrencisi işaretle"}
          </button>
        </div>
      )}
      </>}
    </div>
  );
}

function ModeratorOgrenciSinifTasiFormu({ studentId, schoolId, onDone }: { studentId: string; schoolId?: string; onDone: (msg: string) => void }) {
  const [siniflar, setSiniflar] = useState<{ id: string; seviye: string; sube: string }[] | null>(null);
  const [seciliSinifId, setSeciliSinifId] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => { moderatorOkulSiniflari(schoolId).then((r) => setSiniflar(r.siniflar)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tasi() {
    if (!seciliSinifId) return;
    startTransition(async () => {
      const r = await moderatorOgrenciSinifTasi(studentId, seciliSinifId, schoolId);
      onDone(r.error ? `Hata: ${r.error}` : "Öğrenci sınıfı güncellendi.");
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap rounded-lg p-2.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      {siniflar === null ? (
        <span style={{ color: TEXT_MUTED }} className="text-xs">Sınıflar yükleniyor...</span>
      ) : (
        <>
          <select value={seciliSinifId} onChange={(e) => setSeciliSinifId(e.target.value)}
            className="text-xs font-bold px-2.5 py-1.5 rounded-full outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <option value="">Sınıf seçin</option>
            {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
          </select>
          <button type="button" onClick={tasi} disabled={pending || !seciliSinifId}
            className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {pending ? "Taşınıyor..." : "Taşı"}
          </button>
        </>
      )}
    </div>
  );
}

function ModeratorOgretmenBransFormu({ teacherId, schoolId, onDone, kurumTuru, kademe }: { teacherId: string; schoolId?: string; onDone: (msg: string) => void; kurumTuru?: KurumTuru; kademe?: KurumKademesi | null }) {
  const branslar = panelBransListesi(kurumTuru ?? "okul", kademe);
  const [brans, setBrans] = useState<string>(branslar[0]);
  const [pending, startTransition] = useTransition();

  function kaydet() {
    startTransition(async () => {
      const r = await moderatorOgretmenBransDegistir(teacherId, brans, schoolId);
      onDone(r.error ? `Hata: ${r.error}` : "Branş güncellendi.");
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap rounded-lg p-2.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <select value={brans} onChange={(e) => setBrans(e.target.value)}
        className="text-xs font-bold px-2.5 py-1.5 rounded-full outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        {branslar.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <button type="button" onClick={kaydet} disabled={pending} className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </div>
  );
}
