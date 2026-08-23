import { redirect } from "next/navigation";
import { School } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { DashboardYanMenu } from "@/components/dashboard/DashboardYanMenu";
import { RozetGoruntulemePaneli } from "@/components/dashboard/RozetGoruntulemePaneli";
import { kurumRozetGorunumuGetir } from "@/lib/rozet-gorunumu";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

export default async function YoneticiRozetlerPage({ searchParams }: {
  searchParams: Promise<{ okul?: string; sinif?: string; ogrenci?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("ad, role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "admin") redirect("/");

  const params = await searchParams;
  const { data: okullar } = await supabase.from("schools").select("id, ad").eq("aktif", true).order("ad");
  const okulListesi = (okullar ?? []) as { id: string; ad: string }[];
  const okulId = okulListesi.some((okul) => okul.id === params.okul) ? params.okul! : okulListesi[0]?.id;
  const gorunum = okulId ? await kurumRozetGorunumuGetir(okulId, params.ogrenci, params.sinif) : null;

  return (
    <div className="sfec-dashboard-shell min-h-dvh w-full flex-1 flex flex-col">
      <Header ad={profile.ad} role="admin" aktifBolum="rozetler" />
      <div className="mx-auto flex min-h-[calc(100dvh-6.75rem)] w-full max-w-[100rem] flex-1 items-stretch gap-6 px-4 py-6 sm:px-6 lg:py-7">
        <DashboardYanMenu role="admin" aktifBolum="rozetler" />
        <main id="ana-icerik" className="sfec-dashboard-main min-h-[calc(100dvh-10.25rem)] min-w-0 w-full flex-1 flex flex-col gap-5">
          <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <div className="mb-4 flex items-center gap-2">
              <School size={18} color={MINT} />
              <div><h1 className="font-bold" style={{ color: TEXT }}>Kurum seçimi</h1><p className="text-xs" style={{ color: TEXT_MUTED }}>Rozetler tek kurum ve seçilen sınıf sınırında gösterilir.</p></div>
            </div>
            <form action="/yonetici/rozetler" method="get" className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select name="okul" defaultValue={okulId} className="rounded-xl px-3 py-3 text-sm font-semibold outline-none" style={{ color: TEXT, background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
                {okulListesi.map((okul) => <option key={okul.id} value={okul.id}>{okul.ad}</option>)}
              </select>
              <button type="submit" className="sfec-btn rounded-xl px-5 py-3 text-sm font-bold" style={{ color: MINT_ON, background: MINT }}>Kurumu aç</button>
            </form>
          </section>
          {gorunum
            ? <RozetGoruntulemePaneli gorunum={gorunum} action="/yonetici/rozetler" kapsam={`${gorunum.kurumAdi} · Kurum ve sınıf sınırı`} gizliAlanlar={{ okul: okulId! }} />
            : <div className="rounded-3xl p-6 text-sm" style={{ color: TEXT_MUTED, background: BG1, border: `2px solid ${BORDER}` }}>Aktif kurum bulunamadı.</div>}
        </main>
      </div>
    </div>
  );
}
