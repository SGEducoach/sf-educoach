import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { googleAnalyticsGetir } from "@/lib/google-analytics";
import { GoogleAnalyticsGrafigi } from "@/components/yonetici/GoogleAnalyticsGrafigi";
import { Header } from "@/components/dashboard/Header";
import { DashboardYanMenu } from "@/components/dashboard/DashboardYanMenu";
import { BG1, BORDER, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

export default async function GoogleAnalyticsPage({ searchParams }: { searchParams: Promise<{ gun?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profil } = await supabase.from("profiles").select("ad, role").eq("id", user.id).single();
  if (profil?.role !== "admin") redirect("/");
  const params = await searchParams;
  const gun = [7, 28, 90].includes(Number(params.gun)) ? Number(params.gun) : 28;
  const veri = await googleAnalyticsGetir(gun);
  const kart = { background: BG1, border: `1px solid ${BORDER}`, color: TEXT };
  return <div className="sfec-dashboard-shell min-h-dvh w-full flex-1 flex flex-col">
    <Header ad={profil.ad} role="admin" aktifBolum="google-analytics" />
    <div className="mx-auto flex w-full max-w-[100rem] gap-6 px-4 py-6 sm:px-6">
      <DashboardYanMenu role="admin" aktifBolum="google-analytics" />
      <main id="ana-icerik" className="sfec-dashboard-main flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-xl font-bold" style={{ color: TEXT }}>Google Analytics</h1>
            <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Sitenin ziyaretçi verileri · Dün biten son {gun} gün · GA4 mülkünün saat dilimi</p></div>
          <nav aria-label="Analiz dönemi" className="flex gap-2">{[7,28,90].map(n => <Link key={n} href={`/yonetici/google-analytics?gun=${n}`}
            aria-current={gun === n ? "page" : undefined} className="rounded-full px-3 py-2 text-xs font-semibold"
            style={{ ...kart, color: gun === n ? MINT : TEXT_MUTED }}>{n} gün</Link>)}</nav>
        </div>
        {veri.durum !== "hazir" ? <section className="rounded-2xl p-6" style={kart}>
          <h2 className="font-bold">{veri.durum === "kurulum" ? "Bağlantı bekleniyor" : "Veriler yüklenemedi"}</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{veri.mesaj}</p>
          <p className="mt-3 text-xs" style={{ color: TEXT_MUTED }}>Bağlantı kurulana kadar tahmini veya örnek ziyaretçi sayısı gösterilmez.</p>
        </section> : <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{["Aktif kullanıcı", "Oturum", "Sayfa görüntüleme", "Etkileşim oranı"].map((etiket,i) =>
            <div key={etiket} className="rounded-2xl p-5" style={kart}><p className="text-xs" style={{ color: TEXT_MUTED }}>{etiket}</p>
              <p className="mt-2 text-2xl font-bold">{i === 3 ? `%${(veri.ozet[i]*100).toLocaleString("tr-TR",{maximumFractionDigits:1})}` : veri.ozet[i].toLocaleString("tr-TR")}</p></div>)}</section>
          <section className="rounded-2xl p-5" style={kart}><h2 className="font-semibold">Günlük oturumlar</h2>
            <GoogleAnalyticsGrafigi gunler={veri.gunler} />
            {veri.gunler.length > 0 && <details className="mt-4 text-xs"><summary className="cursor-pointer" style={{color:TEXT_MUTED}}>Tarih ve oturum sayılarını göster</summary>
              <table className="mt-2 w-full text-left"><thead><tr><th>Tarih</th><th className="text-right">Oturum</th></tr></thead>
                <tbody>{veri.gunler.map(r=><tr key={r.etiket}><td className="py-1">{r.etiket.slice(6,8)}.{r.etiket.slice(4,6)}.{r.etiket.slice(0,4)}</td><td className="text-right">{r.deger.toLocaleString("tr-TR")}</td></tr>)}</tbody>
              </table></details>}
          </section>
          <div className="grid gap-4 lg:grid-cols-2"><Liste baslik="Trafik kaynakları" birim="Oturum" satirlar={veri.kaynaklar} /><Liste baslik="En çok görüntülenen sayfalar" birim="Görüntüleme" satirlar={veri.sayfalar} /></div>
          <p className="text-xs" style={{color:TEXT_MUTED}}>GA4 verileri gecikmeli işlenebilir. Bu rapor öğrenci başarı analizinden bağımsızdır.</p>
        </>}
      </main>
    </div>
  </div>;
}

function Liste({ baslik, birim, satirlar }: { baslik:string; birim:string; satirlar:{etiket:string;deger:number}[] }) {
  return <section className="min-w-0 rounded-2xl p-5" style={{background:BG1,border:`1px solid ${BORDER}`,color:TEXT}}>
    <h2 className="mb-3 font-semibold">{baslik}</h2><table className="w-full text-left text-xs"><thead><tr style={{color:TEXT_MUTED}}><th className="pb-2">{baslik}</th><th className="pb-2 text-right">{birim}</th></tr></thead>
      <tbody>{satirlar.map(r=><tr key={r.etiket}><td className="break-all py-2 pr-3">{r.etiket}</td><td className="text-right tabular-nums">{r.deger.toLocaleString("tr-TR")}</td></tr>)}</tbody></table>
    {!satirlar.length && <p className="text-xs" style={{color:TEXT_MUTED}}>Bu dönemde kayıtlı veri yok.</p>}
  </section>;
}
