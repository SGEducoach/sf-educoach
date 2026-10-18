"use client";

// WhatsApp duyuru sisteminin admin yönetimi (kullanıcı isteği 18.10.2026):
// şablon adı, karttaki başlık, gizleme, fotoğraf ekleme/silme; kurum adına
// logo yükleme/kaldırma ve yurt listesi için cinsiyet bilgisi (müdürün
// yaptığı işlerin tamamı).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, ImagePlus, MessageSquareShare, Trash2 } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { FOTO_KOKU, type SablonAyari, type SablonGrubu, type SablonTanimi } from "@/lib/whatsapp-sablon-ayarlari";
import {
  adminKurumLogosuKaldir, adminKurumLogosuYukle, adminKurumWhatsappVerisi, sablonAyariKaydet, sablonFotografiSil, sablonFotografiYukle, yerlesikFotoGizle,
} from "@/app/yonetici/whatsapp-actions";
import { CinsiyetBilgileri, type YurtVerisi } from "@/components/dashboard/YurtListeStudyosu";

const girdi = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };
const kucuk = "text-[10px] font-semibold uppercase tracking-wide";
const GRUPLAR: SablonGrubu[] = ["Duyurular", "Veli Bildirimi", "Yurt"];

export function WhatsappYonetimi({ sablonlar, ayarlar, okullar, hazir }: {
  sablonlar: SablonTanimi[]; ayarlar: SablonAyari[]; okullar: { id: string; ad: string; yurtlu: boolean }[]; hazir: boolean;
}) {
  const ayarHaritasi = new Map(ayarlar.map((a) => [a.anahtar, a]));
  return (
    <div className="flex flex-col gap-6">
      <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <MessageSquareShare size={16} color={MINT} aria-hidden="true" />
          <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>WhatsApp Duyuruları</h2>
        </div>
        <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
          Şablonların adını, karttaki başlığını ve fotoğraflarını buradan yönetin; değişiklik bütün kurumlarda hemen görünür. Bir şablonda birden çok fotoğraf varsa kartı hazırlayan aralarından seçer.
        </p>
        {!hazir && <p className="mt-2 text-xs font-semibold" style={{ color: BLUSH }}>Şablon ayarları için veritabanı güncellemesi (migration 0162) henüz uygulanmamış.</p>}
      </section>

      <KurumIslemleri okullar={okullar} />

      {GRUPLAR.map((g) => (
        <section key={g} className="flex flex-col gap-3">
          <h3 className={kucuk} style={{ color: TEXT_MUTED }}>{g}</h3>
          <div className="grid gap-3 xl:grid-cols-2">
            {sablonlar.filter((s) => s.grup === g).map((s) => (
              <SablonKarti key={s.anahtar} tanim={s} ayar={ayarHaritasi.get(s.anahtar)} hazir={hazir} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SablonKarti({ tanim, ayar, hazir }: { tanim: SablonTanimi; ayar: SablonAyari | undefined; hazir: boolean }) {
  const router = useRouter();
  const [ad, setAd] = useState(ayar?.ad ?? "");
  const [baslik, setBaslik] = useState(ayar?.baslik ?? "");
  const [gizli, setGizli] = useState(ayar?.gizli ?? false);
  const [mesaj, setMesaj] = useState<{ hata: boolean; metin: string } | null>(null);
  const [pending, start] = useTransition();

  const calistir = (is: () => Promise<{ error: string | null }>, basari: string) => start(async () => {
    const r = await is();
    setMesaj(r.error ? { hata: true, metin: r.error } : { hata: false, metin: basari });
    if (!r.error) router.refresh();
  });

  const yerlesikGizli = ayar?.yerlesikFotoGizli ?? false;
  const fotograflar = ayar?.fotograflar ?? [];
  const degisti = ad !== (ayar?.ad ?? "") || baslik !== (ayar?.baslik ?? "") || gizli !== (ayar?.gizli ?? false);

  return (
    <div className="flex flex-col gap-3 rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}`, opacity: gizli ? 0.75 : 1 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold" style={{ color: TEXT }}>{ad || tanim.ad}</div>
          <div className="text-[11px]" style={{ color: TEXT_MUTED }}>{tanim.anahtar}{gizli ? " · gizli" : ""}</div>
        </div>
        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>
          <input type="checkbox" checked={gizli} onChange={(e) => setGizli(e.target.checked)} disabled={!hazir} /> Şablonu gizle
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={kucuk} style={{ color: TEXT_MUTED }}>Ad (menüde ve kartın etiketinde)</span>
          <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder={tanim.ad} maxLength={60} disabled={!hazir}
            className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdi} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={kucuk} style={{ color: TEXT_MUTED }}>Karttaki başlık</span>
          {tanim.baslik === null
            ? <span className="rounded-xl px-3 py-2 text-[11px]" style={{ background: BG1_ALT, color: TEXT_MUTED }}>Başlığı kartı hazırlayan yazar.</span>
            : <input value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder={tanim.baslik} maxLength={80} disabled={!hazir}
                className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdi} />}
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={kucuk} style={{ color: TEXT_MUTED }}>Fotoğraflar ({(yerlesikGizli ? 0 : 1) + fotograflar.length})</span>
        <div className="flex flex-wrap gap-2">
          <div className="relative h-20 w-28 overflow-hidden rounded-xl bg-cover bg-center"
            style={{ backgroundImage: `url(${FOTO_KOKU}${tanim.yerlesikFoto})`, border: `1px solid ${BORDER_STRONG}`, opacity: yerlesikGizli ? 0.35 : 1 }}>
            <span className="absolute left-1 top-1 rounded-full px-1.5 text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.9)", color: "#14213d" }}>Yerleşik</span>
            <button type="button" disabled={pending || !hazir} onClick={() => calistir(() => yerlesikFotoGizle(tanim.anahtar, !yerlesikGizli), yerlesikGizli ? "Yerleşik fotoğraf geri getirildi." : "Yerleşik fotoğraf gizlendi.")}
              aria-label={yerlesikGizli ? "Yerleşik fotoğrafı geri getir" : "Yerleşik fotoğrafı gizle"}
              className="absolute bottom-1 right-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.92)", color: "#14213d" }}>
              {yerlesikGizli ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>
          {fotograflar.map((f) => (
            <div key={f.id} className="relative h-20 w-28 overflow-hidden rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${f.adres})`, border: `1px solid ${BORDER_STRONG}` }}>
              <button type="button" disabled={pending} onClick={() => { if (window.confirm("Bu fotoğraf silinsin mi?")) calistir(() => sablonFotografiSil(f.id), "Fotoğraf silindi."); }}
                aria-label="Fotoğrafı sil" className="absolute bottom-1 right-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.92)", color: "#b8323a" }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold"
            style={{ background: BG1_ALT, color: TEXT_MUTED, border: `2px dashed ${BORDER_STRONG}`, opacity: hazir ? 1 : 0.5 }}>
            <ImagePlus size={16} aria-hidden="true" /> {pending ? "Yükleniyor…" : "Fotoğraf ekle"}
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" disabled={pending || !hazir}
              onChange={(e) => {
                const dosyalar = [...(e.target.files ?? [])];
                e.target.value = "";
                if (!dosyalar.length) return;
                const fd = new FormData();
                fd.set("anahtar", tanim.anahtar);
                for (const d of dosyalar) fd.append("foto", d);
                calistir(async () => { const r = await sablonFotografiYukle(fd); return { error: r.error }; }, `${dosyalar.length} fotoğraf eklendi.`);
              }} />
          </label>
        </div>
        <span className="text-[10px]" style={{ color: TEXT_MUTED }}>PNG, JPG ya da WEBP · en fazla 3 MB · yatay fotoğraf karta en iyi oturur.</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || !hazir || !degisti} onClick={() => calistir(() => sablonAyariKaydet(tanim.anahtar, { ad, baslik, gizli }), "Kaydedildi.")}
          className="sfec-btn rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>Kaydet</button>
        <button type="button" disabled={pending || !hazir} onClick={() => { setAd(""); setBaslik(""); setGizli(false); calistir(() => sablonAyariKaydet(tanim.anahtar, { ad: "", baslik: "", gizli: false }), "Varsayılana döndü."); }}
          className="rounded-xl px-3 py-2 text-xs font-bold" style={{ color: TEXT_MUTED }}>Varsayılana dön</button>
        {mesaj && <span className="text-xs font-semibold" style={{ color: mesaj.hata ? BLUSH : MINT }}>{mesaj.metin}</span>}
      </div>
    </div>
  );
}

function KurumIslemleri({ okullar }: { okullar: { id: string; ad: string; yurtlu: boolean }[] }) {
  const [okul, setOkul] = useState("");
  const [veri, setVeri] = useState<{ logoAdresi: string | null; yurtlu: boolean; yurt: YurtVerisi | null } | null>(null);
  const [mesaj, setMesaj] = useState<{ hata: boolean; metin: string } | null>(null);
  const [pending, start] = useTransition();

  function sec(id: string) {
    setOkul(id);
    setVeri(null);
    setMesaj(null);
    if (!id) return;
    start(async () => {
      const r = await adminKurumWhatsappVerisi(id);
      if (r.error) setMesaj({ hata: true, metin: r.error });
      else setVeri({ logoAdresi: r.logoAdresi, yurtlu: r.yurtlu, yurt: r.yurt });
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h3 className="text-sm font-bold" style={{ color: TEXT }}>Kurum İşlemleri</h3>
      <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Kurum adına logo yükleyin ya da kaldırın; yurtlu kurumda yurt listesi için cinsiyet bilgilerini girin.</p>
      <select value={okul} onChange={(e) => sec(e.target.value)} aria-label="Kurum" className="max-w-md rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdi}>
        <option value="">Kurum seçin…</option>
        {okullar.map((o) => <option key={o.id} value={o.id}>{o.ad}{o.yurtlu ? " · yurtlu" : ""}</option>)}
      </select>
      {pending && !veri && <p className="text-xs" style={{ color: TEXT_MUTED }}>Yükleniyor…</p>}
      {mesaj && <p className="text-xs font-semibold" style={{ color: mesaj.hata ? BLUSH : MINT }}>{mesaj.metin}</p>}
      {veri && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl p-3" style={{ background: BG1_ALT }}>
          <div className="flex h-16 w-40 items-center justify-center overflow-hidden rounded-xl" style={{ background: "#fff", border: `1px solid ${BORDER_STRONG}` }}>
            {veri.logoAdresi
              // eslint-disable-next-line @next/next/no-img-element -- kurum logosu, kendi API yolumuzdan
              ? <img src={veri.logoAdresi} alt="Kurum logosu" className="h-full w-full object-contain p-1" />
              : <span className="text-[11px]" style={{ color: TEXT_MUTED }}>Logo yok</span>}
          </div>
          <label className="sfec-btn inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: MINT_BG, color: TEXT }}>
            <ImagePlus size={13} aria-hidden="true" /> {veri.logoAdresi ? "Logoyu değiştir" : "Logo yükle"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={pending}
              onChange={(e) => {
                const d = e.target.files?.[0];
                e.target.value = "";
                if (!d) return;
                const fd = new FormData();
                fd.set("okul", okul);
                fd.set("logo", d);
                start(async () => {
                  const r = await adminKurumLogosuYukle(fd);
                  if (r.error) setMesaj({ hata: true, metin: r.error });
                  else { setVeri((v) => (v ? { ...v, logoAdresi: r.logoAdresi } : v)); setMesaj({ hata: false, metin: "Logo güncellendi." }); }
                });
              }} />
          </label>
          {veri.logoAdresi && (
            <button type="button" disabled={pending} onClick={() => {
              if (!window.confirm("Kurum logosu kaldırılsın mı?")) return;
              start(async () => {
                const r = await adminKurumLogosuKaldir(okul);
                if (r.error) setMesaj({ hata: true, metin: r.error });
                else { setVeri((v) => (v ? { ...v, logoAdresi: null } : v)); setMesaj({ hata: false, metin: "Logo kaldırıldı." }); }
              });
            }} className="rounded-xl px-3 py-2 text-xs font-bold" style={{ color: BLUSH }}>Logoyu kaldır</button>
          )}
          <span className="text-[10px]" style={{ color: TEXT_MUTED }}>PNG/JPG/WEBP, en fazla 1 MB. Yatay logo kartta çerçevesiz, kare logo yuvarlak görünür.</span>
        </div>
      )}
      {veri?.yurtlu && veri.yurt && <CinsiyetBilgileri key={okul} yurt={veri.yurt} />}
      {veri && !veri.yurtlu && <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Bu kurum yurtlu değil; yurt listesi ve cinsiyet bilgisi kullanılmaz.</p>}
    </section>
  );
}
