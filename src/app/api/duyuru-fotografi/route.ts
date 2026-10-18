import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Admin'in WhatsApp şablonlarına eklediği fotoğraflar (migration 0162).
// Kart tarayıcıda canvas'a çizildiği için görsel aynı siteden sunulur
// (başka alan adından gelen görsel canvas'ın dışa aktarılmasını engeller).
// Fotoğraf kimliği değişmez; aynı adres uzun süre önbelleklenir.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Geçersiz fotoğraf.", { status: 400 });
  const admin = createAdminClient();
  const { data: satir } = await admin.from("whatsapp_sablon_fotograflari").select("dosya_yolu").eq("id", id).maybeSingle();
  if (!satir) return new Response("Fotoğraf yok.", { status: 404 });
  const { data, error } = await admin.storage.from("duyuru-fotograflari").download(satir.dosya_yolu);
  if (error || !data) return new Response("Fotoğraf yok.", { status: 404 });
  return new Response(data, {
    headers: { "Content-Type": data.type || "image/jpeg", "Cache-Control": "public, max-age=604800, immutable" },
  });
}
