import { FileSpreadsheet } from "lucide-react";
import { moderatorKullanicilariGetir } from "@/app/moderator/actions";
import { ogretmenDuyuruGonder, gonderilenDuyurularGetir } from "@/app/dashboard/actions";
import { DuyuruFormu } from "@/components/dashboard/DuyuruFormu";
import { YapayZekaAnaliziPromosu } from "@/components/dashboard/YapayZekaAnaliziPromosu";
import { DershaneRosterEkleFormu } from "@/components/dashboard/DershaneRosterEkleFormu";
import { DershaneOgretmenEkleFormu } from "@/components/dashboard/DershaneOgretmenEkleFormu";
import { DershaneKullaniciListesi } from "@/components/dashboard/DershaneKullaniciListesi";
import { DershaneSinifEkleFormu } from "@/components/dashboard/DershaneSinifEkleFormu";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { BG1, BORDER, MINT_BG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

// DERSHANE MODU (Faz D3) — dershane müdürünün tam paneli. Menü sırası
// DERSHANE_MUDUR_MENUSU ile birebir (bkz. dashboard-navigation.ts):
// öğretmenler, öğrenciler, denemeler, tg-denemeleri (page.tsx üst
// seviyede, buraya hiç düşmez), yapay-zeka, duyurular.
export async function DershaneMudurPaneli({ siniflar, aktifBolum }: {
  siniflar: { id: string; seviye: string; sube: string }[];
  aktifBolum: DashboardBolumu;
}) {
  if (aktifBolum === "duyurular") {
    const kapsamSecenekleri = [
      { deger: "okul", etiket: "Tüm dershane" },
      { deger: "9", etiket: "9. Sınıflar" },
      { deger: "10", etiket: "10. Sınıflar" },
      { deger: "11", etiket: "11. Sınıflar" },
      { deger: "12", etiket: "12. Sınıflar" },
      ...siniflar.map((s) => ({ deger: s.id, etiket: `Sadece ${s.seviye}-${s.sube}` })),
    ];
    return (
      <section id="duyurular" className="sfec-section">
        <DuyuruFormu
          baslik="Dershaneye duyuru gönder"
          aciklama="Dershane veya sınıf kapsamını ve duyurunun öğrenciye, veliye ya da ikisine birden gideceğini seçebilirsiniz."
          gonder={ogretmenDuyuruGonder}
          kapsamSecenekleri={kapsamSecenekleri}
          aliciTuruSecilebilir
          gecmisGetir={gonderilenDuyurularGetir}
        />
      </section>
    );
  }

  if (aktifBolum === "yapay-zeka") {
    return <section className="min-h-full"><YapayZekaAnaliziPromosu sayfa /></section>;
  }

  if (aktifBolum === "denemeler") {
    return (
      <div className="sfec-fade rounded-3xl p-8 text-center flex flex-col items-center gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
          <FileSpreadsheet size={22} color={MINT} />
        </div>
        <p style={{ color: TEXT }} className="text-sm font-bold">Toplu PDF deneme aktarımı yakında</p>
        <p style={{ color: TEXT_MUTED }} className="text-xs max-w-md">
          Deneme sonuç PDF&apos;ini yükleyip öğrencilerle otomatik eşleştirme (ad-soyad ile, belirsiz eşleşmeler site yöneticisi tarafından revize edilir) — bu bölüm bir sonraki fazda açılacak.
        </p>
      </div>
    );
  }

  // ogretmenler / ogrenciler — moderatör altyapısı yeniden kullanılıyor
  // ("müdür bölümü moderatör mantığı ile çalışsın").
  const kategori: "ogretmen" | "ogrenci" = aktifBolum === "ogretmenler" ? "ogretmen" : "ogrenci";
  const { kullanicilar } = await moderatorKullanicilariGetir();
  const filtrelenmis = kullanicilar.filter((k) => k.kategori === kategori);

  return (
    <div className="flex flex-col gap-5">
      {kategori === "ogrenci" && (
        <div className="rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div style={{ color: TEXT_MUTED }} className="mb-2 text-[10px] font-bold uppercase tracking-wide">Şubeler</div>
          <DershaneSinifEkleFormu />
        </div>
      )}
      {kategori === "ogretmen"
        ? <DershaneOgretmenEkleFormu siniflar={siniflar} />
        : <DershaneRosterEkleFormu siniflar={siniflar} />}
      <DershaneKullaniciListesi kullanicilar={filtrelenmis} kategori={kategori} />
    </div>
  );
}
