// Öğretmene giden ders programı bildirimlerinin metni ve e-posta şablonu
// (kullanıcı isteği 12.09.2026). Bilerek hiçbir şey içe aktarmaz: uygulama
// (ogretmen-bildirim.ts) ve tek seferlik gönderim betikleri aynı metni
// kullanır. "yuklendi" metni migration 0104 tetikleyicisinde de birebir aynı.

export const SITE_ADRESI = "https://www.sefukoc.com";

export const PROGRAM_BILDIRIMI = {
  yuklendi: {
    baslik: "Ders programınız yüklenmiştir",
    mesaj: "Ders programınız SeFu Koç'a yüklendi. Programınızı panelinizden görebilirsiniz.",
  },
  degisti: {
    baslik: "Ders programınız değişti",
    mesaj: "Ders programınızda değişiklik yapıldı. Güncel programınızı panelinizden görebilirsiniz.",
  },
} as const;

export function guvenliMetin(value: string) {
  return value.replace(/[&<>"']/g, (karakter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
  })[karakter] ?? karakter);
}

// Görünüm şifre sıfırlama e-postasıyla aynı (bkz. api/sifre-sifirla).
export function ogretmenBildirimEpostasi(ad: string, baslik: string, mesaj: string, baglanti: string) {
  return {
    subject: `SeFu Koç: ${baslik}`,
    html: `<div style="font-family:Arial,sans-serif;color:#17343c;line-height:1.6;max-width:560px;margin:auto">
      <h2 style="color:#087f8c">SeFu Koç</h2>
      <p>Merhaba ${guvenliMetin(ad)},</p>
      <p style="font-size:18px;font-weight:700">${guvenliMetin(baslik)}</p>
      <p>${guvenliMetin(mesaj)}</p>
      <p><a href="${guvenliMetin(baglanti)}" style="display:inline-block;background:#087f8c;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">Programımı aç</a></p>
    </div>`,
  };
}
