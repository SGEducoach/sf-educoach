// Kurum dışı belletmen (kullanıcı isteği 18.10.2026, Faz 4, migration 0165).
// Öğretmen hesabıdır; branşı bu sabit. Paneli yalnız Yoklama ve Nöbetlerim.
export const KURUM_DISI_BELLETMEN_BRANSI = "Kurum Dışı Belletmen";

export const belletmenMi = (brans?: string | null) => brans === KURUM_DISI_BELLETMEN_BRANSI;
