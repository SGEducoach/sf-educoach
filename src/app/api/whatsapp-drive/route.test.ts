import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ kullanici: vi.fn(), baglanti: vi.fn(), baslat: vi.fn(), tamamla: vi.fn(), eksikler: vi.fn(), koptu: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/whatsapp-drive-sunucu", () => ({
  DriveHatasi: class extends Error { constructor(message: string, public status = 400) { super(message); } },
  driveKullanicisi: m.kullanici, driveBaglantisiOku: m.baglanti, driveYuklemeBaslat: m.baslat, driveYuklemeTamamla: m.tamamla,
  driveEksikAyarlar: m.eksikler, driveBaglantiKoptuMu: m.koptu, driveErisimAnahtari: vi.fn(), driveKayit: vi.fn(), driveKlasoruDogrula: vi.fn(), driveOAuth: vi.fn(), driveSiteAdresi: vi.fn(), driveTokenOnbelleginiSil: vi.fn(),
}));
import { GET, POST } from "./route";
import { DriveHatasi } from "@/lib/whatsapp-drive-sunucu";
const req = (islem: string, veri = {}, origin = "https://www.sefukoc.com") => new NextRequest("https://www.sefukoc.com/api/whatsapp-drive", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ islem, ...veri }) });
beforeEach(() => { vi.clearAllMocks(); m.kullanici.mockResolvedValue({ id: "u1", adminMi: false, okulId: "s1" }); m.baglanti.mockResolvedValue({ refresh_token_sifreli: "never-expose", klasor_id: "12345678901234", klasor_adi: "Duyurular" }); m.eksikler.mockReturnValue([]); m.koptu.mockResolvedValue(false); });
describe("WhatsApp Drive HTTP güvenliği", () => {
  it("durum yanıtında sır veya admin kurulum bilgisi döndürmez", async () => {
    const r = await GET(); const v = await r.json(); expect(v).toEqual({ hazir: true, bagli: true, klasorAdi: "Duyurular" });
    expect(r.headers.get("Cache-Control")).toContain("no-store"); expect(JSON.stringify(v)).not.toContain("never-expose");
  });
  it("öğrenci/oturumsuz kullanıcıya başlatma yapmaz", async () => {
    m.kullanici.mockRejectedValue(new DriveHatasi("Yetki yok", 403)); const r = await POST(req("baslat")); expect(r.status).toBe(403); expect(m.baslat).not.toHaveBeenCalled();
  });
  it("başka kaynaktan POST'u kimlik doğrulamadan reddeder", async () => {
    const r = await POST(req("baslat", {}, "https://evil.example")); expect(r.status).toBe(403); expect(m.kullanici).not.toHaveBeenCalled();
  });
  it("picker token işlemi için admin şartı uygular", async () => {
    m.kullanici.mockRejectedValue(new DriveHatasi("Admin gerekli", 403)); expect((await POST(req("picker"))).status).toBe(403); expect(m.kullanici).toHaveBeenCalledWith(true);
  });
  it("başlatmada okul veya klasörü istemciden almaz", async () => {
    m.baslat.mockResolvedValue({ adres: "safe", bilet: "t" }); const r = await POST(req("baslat", { ad: "föy.pdf", boyut: 42, okulId: "other", klasor: "evil" }));
    expect(r.status).toBe(200); expect(m.baslat).toHaveBeenCalledWith(expect.objectContaining({ okulId: "s1" }), expect.objectContaining({ klasor_id: "12345678901234" }), { ad: "föy.pdf", boyut: 42 });
  });
  it("hazır olmayan veritabanında eski duyuru akışını kırmadan durum döndürür", async () => {
    m.baglanti.mockRejectedValue(new DriveHatasi("Kurulum eksik", 503)); expect((await (await GET()).json()).hazir).toBe(false);
  });
  it("8 KB üstü metadata gövdesini okumayı keser", async () => { expect((await POST(req("baslat", { ad: "x".repeat(9000) }))).status).toBe(413); expect(m.kullanici).not.toHaveBeenCalled(); });
});
describe("WhatsApp Drive bağlantı kopması", () => {
  it("admin durumunda kopmayı bildirir ve hazır saymaz", async () => {
    m.kullanici.mockResolvedValue({ id: "a1", adminMi: true, okulId: null }); m.koptu.mockResolvedValue(true);
    const v = await (await GET()).json(); expect(v.koptu).toBe(true); expect(v.hazir).toBe(false);
  });
  it("admin olmayana kopma kontrolü yapmaz", async () => {
    await GET(); expect(m.koptu).not.toHaveBeenCalled();
  });
});
