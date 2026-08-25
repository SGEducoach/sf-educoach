import { moderatorKullanicilariGetir } from "@/app/moderator/actions";
import { ogretmenDuyuruGonder, gonderilenDuyurularGetir } from "@/app/dashboard/actions";
import { DuyuruFormu } from "@/components/dashboard/DuyuruFormu";
import { KonuHaritasiRaporu } from "@/components/dashboard/KonuHaritasiRaporu";
import { konuHaritasiGetir } from "@/lib/konu-raporu";
import { dershaneAnaSayfaVerisiGetir } from "@/lib/dershane-ana-sayfa";
import { DershaneAnaSayfa } from "@/components/dashboard/DershaneAnaSayfa";
import { createClient } from "@/lib/supabase/server";
import { DershaneRosterEkleFormu } from "@/components/dashboard/DershaneRosterEkleFormu";
import { DershaneRosterTopluEkleFormu } from "@/components/dashboard/DershaneRosterTopluEkleFormu";
import { DershaneOgretmenEkleFormu } from "@/components/dashboard/DershaneOgretmenEkleFormu";
import { DershaneKullaniciListesi } from "@/components/dashboard/DershaneKullaniciListesi";
import { DershaneSinifEkleFormu } from "@/components/dashboard/DershaneSinifEkleFormu";
import { DershaneDenemePdfFormu } from "@/components/dashboard/DershaneDenemePdfFormu";
import type { DersProgramiSatiri } from "@/lib/ders-programi";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { BG1, BORDER, TEXT_MUTED } from "@/lib/theme";

// DERSHANE MODU (Faz D3) — dershane müdürünün tam paneli. Menü sırası
// DERSHANE_MUDUR_MENUSU ile birebir (bkz. dashboard-navigation.ts): ozet
// (Ana Sayfa — kademe bazlı performans, varsayılan sekme), öğretmenler,
// öğrenciler, denemeler, tg-denemeleri (page.tsx üst seviyede, buraya hiç
// düşmez), yapay-zeka, duyurular.
export async function DershaneMudurPaneli({ siniflar, aktifBolum, schoolId }: {
  siniflar: { id: string; seviye: string; sube: string }[];
  aktifBolum: DashboardBolumu;
  schoolId: string;
}) {
  if (aktifBolum === "ozet") {
    const supabase = await createClient();
    const veri = await dershaneAnaSayfaVerisiGetir(supabase, schoolId);
    return <section className="sfec-section"><DershaneAnaSayfa veri={veri} /></section>;
  }

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
    const supabase = await createClient();
    const { satirlar, error } = await konuHaritasiGetir(supabase, { schoolId });
    return <section className="min-h-full"><KonuHaritasiRaporu mod="rapor" satirlar={satirlar} kapsamEtiketi="Dershaneniz" hata={error} /></section>;
  }

  if (aktifBolum === "denemeler") {
    return <section className="sfec-section"><DershaneDenemePdfFormu /></section>;
  }

  // ogretmenler / ogrenciler — moderatör altyapısı yeniden kullanılıyor
  // ("müdür bölümü moderatör mantığı ile çalışsın").
  const kategori: "ogretmen" | "ogrenci" = aktifBolum === "ogretmenler" ? "ogretmen" : "ogrenci";
  const { kullanicilar } = await moderatorKullanicilariGetir();
  const filtrelenmis = kullanicilar.filter((k) => k.kategori === kategori);

  // Ders Programı (2026-08-25 kullanıcı isteği: "admin ve dershane müdürü
  // programa elle ders ekleyebilsin") — öğretmenler sekmesinde her
  // öğretmenin altına açılabilir bir düzenleyici eklenecek, o yüzden
  // buradaki öğretmenlerin TÜM programı tek sorguda çekilip teacher_id'ye
  // göre gruplanıyor (N+1 sorgudan kaçınmak için).
  const dersProgramlari: Record<string, DersProgramiSatiri[]> = {};
  if (kategori === "ogretmen" && filtrelenmis.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ogretmen_ders_programi")
      .select("id, teacher_id, gun, ders_saati_sira, ders, classes(seviye, sube)")
      .in("teacher_id", filtrelenmis.map((k) => k.id));
    type Row = { id: string; teacher_id: string; gun: DersProgramiSatiri["gun"]; ders_saati_sira: number; ders: string; classes: { seviye: string; sube: string } | null };
    for (const r of (data as unknown as Row[]) ?? []) {
      const liste = dersProgramlari[r.teacher_id] ?? [];
      liste.push({ id: r.id, gun: r.gun, dersSaatiSira: r.ders_saati_sira, ders: r.ders, sinifAdi: r.classes ? `${r.classes.seviye}-${r.classes.sube}` : "—" });
      dersProgramlari[r.teacher_id] = liste;
    }
  }

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
        : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <DershaneRosterEkleFormu siniflar={siniflar} />
            <DershaneRosterTopluEkleFormu />
          </div>
        )}
      <DershaneKullaniciListesi kullanicilar={filtrelenmis} kategori={kategori} siniflar={siniflar} dersProgramlari={dersProgramlari} />
    </div>
  );
}
