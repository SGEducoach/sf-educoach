import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SADECE server action / route handler içinde kullanın. service_role anahtarı
// RLS'i tamamen bypass eder — asla client tarafına (bileşenlere, "use client"
// dosyalarına) import etmeyin veya NEXT_PUBLIC_ önekiyle tanımlamayın.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY tanımlı değil (sunucu ortam değişkeni).");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
