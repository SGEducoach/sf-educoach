"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2, Save, Trash2, UserRoundCog } from "lucide-react";
import {
  kullaniciProfilGuncelle,
  yonetimOkullariGetir,
  kullaniciKurumDegistir,
  ogrenciVeliBaglantilari,
  ogrenciyeVeliBagla,
  ogrenciVeliBaglantisiSil,
  ogrenciYonetimKayitlari,
  ogrenciYonetimKaydiGuncelle,
  ogrenciYonetimKaydiSil,
  type KullaniciSonuc,
  type OgrenciYonetimKaydi,
  type VeliBaglantisi,
  type YonetimOkulu,
} from "@/app/yonetici/actions";
import { BG0, BG1, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

export function KullaniciDetayYonetimi({ kullanici }: { kullanici: KullaniciSonuc }) {
  const [ad, setAd] = useState(kullanici.ad);
  const [email, setEmail] = useState(kullanici.email ?? "");
  const [telefon, setTelefon] = useState(kullanici.telefon ?? "");
  const [okulNo, setOkulNo] = useState(kullanici.okulNo ?? "");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [okullar, setOkullar] = useState<YonetimOkulu[]>([]);
  const [schoolId, setSchoolId] = useState(kullanici.okulId ?? "");
  const [classId, setClassId] = useState(kullanici.sinifId ?? "");

  useEffect(() => {
    if (kullanici.role === "ogrenci" || kullanici.role === "ogretmen" || kullanici.role === "mudur") yonetimOkullariGetir().then((r) => setOkullar(r.okullar));
  }, [kullanici.role]);

  function profilKaydet() {
    setMesaj(null);
    startTransition(async () => {
      const res = await kullaniciProfilGuncelle({ userId: kullanici.id, ad, email, telefon, okulNo: kullanici.role === "ogrenci" ? okulNo : undefined });
      setMesaj(res.error ?? "Profil güncellendi.");
    });
  }

  function kurumKaydet() {
    setMesaj(null);
    startTransition(async () => {
      const res = await kullaniciKurumDegistir({ userId: kullanici.id, role: kullanici.role, schoolId, classId: kullanici.role === "ogrenci" ? classId : undefined });
      setMesaj(res.error ?? "Okul bilgisi güncellendi.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center gap-2 text-xs font-bold" style={{ color: TEXT }}><UserRoundCog size={14} /> Profil bilgileri</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Alan etiket="Ad soyad" value={ad} onChange={setAd} />
        <Alan etiket="E-posta" value={email} onChange={setEmail} type="email" />
        <Alan etiket="Telefon" value={telefon} onChange={setTelefon} />
        {kullanici.role === "ogrenci" && <Alan etiket="Okul numarası" value={okulNo} onChange={setOkulNo} />}
      </div>
      <button type="button" onClick={profilKaydet} disabled={pending} className="sgec-btn self-start rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: MINT, color: MINT_ON }}>
        <span className="flex items-center gap-1"><Save size={11} /> {pending ? "Kaydediliyor..." : "Profili kaydet"}</span>
      </button>
      {(kullanici.role === "ogrenci" || kullanici.role === "ogretmen" || kullanici.role === "mudur") && <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-48 flex-1 flex-col gap-1"><span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Okul</span><select value={schoolId} onChange={(e) => { setSchoolId(e.target.value); setClassId(""); }} className="rounded-lg px-2.5 py-2 text-xs" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>{okullar.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}</select></label>
        {kullanici.role === "ogrenci" && <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Sınıf</span><select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><option value="">Sınıf seçin</option>{okullar.find((o) => o.id === schoolId)?.siniflar.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}</select></label>}
        <button type="button" onClick={kurumKaydet} disabled={pending || !schoolId} className="rounded-full px-3 py-2 text-[11px] font-bold" style={{ background: MINT, color: MINT_ON }}>Okulu güncelle</button>
      </div>}
      {mesaj && <p className="text-xs font-semibold" style={{ color: mesaj.includes("güncellendi") ? MINT : BLUSH }}>{mesaj}</p>}
      {kullanici.role === "ogrenci" && <OgrenciEkYonetim studentId={kullanici.id} />}
    </div>
  );
}

function Alan({ etiket, value, onChange, type = "text" }: { etiket: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>{etiket}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} /></label>;
}

function OgrenciEkYonetim({ studentId }: { studentId: string }) {
  const [veliler, setVeliler] = useState<VeliBaglantisi[]>([]);
  const [kayitlar, setKayitlar] = useState<OgrenciYonetimKaydi[]>([]);
  const [veliSorgu, setVeliSorgu] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function yukle() {
    Promise.all([ogrenciVeliBaglantilari(studentId), ogrenciYonetimKayitlari(studentId)]).then(([v, k]) => {
      if (v.error || k.error) setHata(v.error ?? k.error);
      setVeliler(v.baglantilar);
      setKayitlar(k.kayitlar);
    });
  }
  useEffect(yukle, [studentId]);

  function veliBagla() {
    startTransition(async () => { const r = await ogrenciyeVeliBagla(studentId, veliSorgu); if (r.error) return setHata(r.error); setVeliSorgu(""); yukle(); });
  }
  function veliSil(parentId: string) {
    if (!window.confirm("Bu veli–öğrenci bağlantısı kaldırılsın mı?")) return;
    startTransition(async () => { const r = await ogrenciVeliBaglantisiSil(studentId, parentId); if (r.error) return setHata(r.error); yukle(); });
  }
  function kayitSil(k: OgrenciYonetimKaydi) {
    if (!window.confirm("Bu öğrenci kaydı kalıcı olarak silinsin mi?")) return;
    startTransition(async () => { const r = await ogrenciYonetimKaydiSil(k.id, k.tur); if (r.error) return setHata(r.error); yukle(); });
  }
  function kayitGuncelle(k: OgrenciYonetimKaydi, degerler: { tarih: string; sureDakika: number; ders: string; konu?: string; dogru?: number; yanlis?: number }) {
    startTransition(async () => { const r = await ogrenciYonetimKaydiGuncelle({ id: k.id, tur: k.tur, ...degerler }); if (r.error) return setHata(r.error); yukle(); });
  }

  return <>
    <div className="mt-1 flex items-center gap-2 text-xs font-bold" style={{ color: TEXT }}><Link2 size={13} /> Veli bağlantıları</div>
    <div className="flex gap-2"><input value={veliSorgu} onChange={(e) => setVeliSorgu(e.target.value)} placeholder="Veli adı veya tam e-posta" className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} /><button type="button" onClick={veliBagla} disabled={pending} className="rounded-lg px-3 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>Bağla</button></div>
    {veliler.map((v) => <div key={v.parentId} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs" style={{ background: BG1, color: TEXT }}><span>{v.parentAd}{v.parentEmail ? ` · ${v.parentEmail}` : ""}</span><button type="button" onClick={() => veliSil(v.parentId)} style={{ color: BLUSH }}><Trash2 size={13} /></button></div>)}
    <div className="mt-1 text-xs font-bold" style={{ color: TEXT }}>Öğrenci çalışma, soru ve deneme kayıtları</div>
    <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {kayitlar.length === 0 && <p className="text-xs" style={{ color: TEXT_MUTED }}>Kayıt bulunamadı.</p>}
      {kayitlar.map((k) => <KayitSatiri key={`${k.tur}-${k.id}`} kayit={k} disabled={pending} onSave={kayitGuncelle} onDelete={() => kayitSil(k)} />)}
    </div>
    {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
  </>;
}

function KayitSatiri({ kayit, disabled, onSave, onDelete }: { kayit: OgrenciYonetimKaydi; disabled: boolean; onSave: (k: OgrenciYonetimKaydi, degerler: { tarih: string; sureDakika: number; ders: string; konu?: string; dogru?: number; yanlis?: number }) => void; onDelete: () => void }) {
  const [tarih, setTarih] = useState(kayit.tarih);
  const [sure, setSure] = useState(String(kayit.sureDakika));
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
    <div className="flex items-center gap-1"><input type="number" min={1} max={480} value={sure} onChange={(e) => setSure(e.target.value)} className="w-20 rounded px-2 py-1 text-xs" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }} /><button type="button" disabled={disabled} onClick={() => onSave(kayit, { tarih, sureDakika: Number(sure), ders, konu, dogru: Number(dogru), yanlis: Number(yanlis) })} title="Kaydet" style={{ color: MINT }}><Save size={14} /></button><button type="button" disabled={disabled} onClick={onDelete} title="Sil" style={{ color: BLUSH }}><Trash2 size={14} /></button></div>
  </div>;
}
