"use client";
import { useState } from "react";
import { BG0, BG1, BORDER, BLUSH, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { driveApi, driveDurumuOku } from "@/components/dashboard/whatsapp-drive-istemci";
import type { DriveDurumu } from "@/lib/whatsapp-drive";

let pickerHazir: Promise<void> | null = null;
function pickerYukle() {
  return pickerHazir ??= new Promise<void>((resolve, reject) => {
    const yuklendi = () => {
      const gapi = (window as unknown as { gapi: { load: (ad: string, ayar: { callback: () => void; onerror: () => void; timeout: number; ontimeout: () => void }) => void } }).gapi;
      gapi.load("picker", { callback: resolve, onerror: () => reject(new Error("Google klasör seçici yüklenemedi.")), timeout: 15000, ontimeout: () => reject(new Error("Google klasör seçici zaman aşımına uğradı.")) });
    };
    if ((window as unknown as { gapi?: unknown }).gapi) { yuklendi(); return; }
    const s = document.createElement("script"); s.src = "https://apis.google.com/js/api.js"; s.async = true;
    s.onload = yuklendi; s.onerror = () => reject(new Error("Google klasör seçici yüklenemedi.")); document.head.appendChild(s);
  }).catch((e) => { pickerHazir = null; throw e; });
}
export function WhatsappDriveAyarlari() {
  const [acik, setAcik] = useState(false), [durum, setDurum] = useState<DriveDurumu | null>(null);
  const [bekle, setBekle] = useState(false), [mesaj, setMesaj] = useState<string | null>(null);
  const buton = "sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50";
  async function guncelle() { setDurum(await driveDurumuOku<DriveDurumu>()); }
  async function calistir(is: () => Promise<void>) {
    setBekle(true); setMesaj(null);
    try { await is(); } catch (e) { setMesaj(e instanceof Error ? e.message : "İşlem tamamlanamadı."); } finally { setBekle(false); }
  }
  async function klasorSec() {
    const { token, key, appId } = await driveApi<{ token: string; key: string; appId: string }>("picker");
    await pickerYukle();
    const id = await new Promise<string | null>((resolve) => {
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true);
      const picker = new google.picker.PickerBuilder().setOAuthToken(token).setDeveloperKey(key).setAppId(appId).setOrigin(window.location.origin).setLocale("tr").addView(view)
        .setCallback((r: google.picker.ResponseObject) => {
          if (r.action === google.picker.Action.PICKED) { resolve(r.docs?.[0]?.id ?? null); picker.dispose(); }
          if (r.action === google.picker.Action.CANCEL) { resolve(null); picker.dispose(); }
        }).build(); picker.setVisible(true);
    });
    if (id) { await driveApi("klasor", { id }); await guncelle(); setMesaj("Hedef klasör kaydedildi. Duyurulara Drive dosyası eklenebilir."); }
  }
  return <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
    <h2 className="text-sm font-bold" style={{ color: TEXT }}>Duyuru ekleri · Google Drive</h2>
    <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Google hesabını admin bağlar. Duyuru yetkisi olan kullanıcılar dosyayı bu klasöre yükler; öğrenci dosya bağlantısından açar.</p>
    <button type="button" aria-expanded={acik} disabled={bekle} className={`${buton} mt-3`} style={{ background: BG0, color: TEXT }} onClick={() => { setAcik(!acik); if (!acik) void calistir(async () => {
      await guncelle();
      const sonuc = new URLSearchParams(window.location.search).get("drive");
      if (sonuc === "baglandi") setMesaj("Google hesabı bağlandı. Şimdi hedef klasörü seçin.");
      if (sonuc === "hata") setMesaj("Google bağlantısı tamamlanamadı. Aynı admin hesabıyla yeniden bağlanın.");
    }); }}>Drive bağlantısını {acik ? "gizle" : "yönet"}</button>
    {acik && <div className="mt-3 flex flex-col gap-3 text-xs" style={{ color: TEXT }}>
      {durum && <>
        <p>{durum.hazir ? `Hazır · ${durum.klasorAdi}` : durum.bagli ? "Google bağlı · Hedef klasör seçilmesi gerekiyor." : "Google hesabı henüz bağlanmadı."}</p>
        {!durum.tabloHazir && <p style={{ color: BLUSH }}>Veritabanı güncellemesi 0181 uygulanmalı.</p>}
        {!!durum.eksikler?.length && <p style={{ color: BLUSH }}>Sunucu ayarları eksik: {durum.eksikler.join(", ")}. Kurulum yönergesi: docs/WHATSAPP_DRIVE_KURULUM.md</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={bekle || !durum.kurulumHazir || !durum.tabloHazir} className={buton} style={{ background: MINT, color: MINT_ON }} onClick={() => void calistir(async () => {
            const r = await driveApi<{ adres: string }>("baglan"); window.location.assign(r.adres);
          })}>{durum.bagli ? "Google hesabını yeniden bağla" : "Google hesabını bağla"}</button>
          {durum.bagli && <>
            <button type="button" disabled={bekle} className={buton} style={{ background: BG0, color: TEXT }} onClick={() => void calistir(klasorSec)}>Hedef klasörü seç</button>
            <button type="button" disabled={bekle} className={buton} style={{ background: BG0, color: TEXT_MUTED }} onClick={() => { if (window.confirm("Siteye yeni yükleme bağlantısı kaldırılsın mı? Drive'daki dosyalar silinmez.")) void calistir(async () => { await driveApi("ayir"); await guncelle(); }); }}>Bağlantıyı kaldır</button>
          </>}
        </div>
        <p style={{ color: TEXT_MUTED }}>Paylaşımı “Bağlantıya sahip olan herkes / Görüntüleyen” olan bir klasör seçin. Klasör seçimi Google ekranında yapılır; yalnız seçilen dosyalar için Drive yetkisi istenir.</p>
      </>}
      {bekle && <p role="status">İşlem sürüyor…</p>}
      {mesaj && <p role="status" style={{ color: TEXT_MUTED }}>{mesaj}</p>}
    </div>}
  </section>;
}
