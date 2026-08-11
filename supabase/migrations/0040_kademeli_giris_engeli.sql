-- Moderatör planı madde 1.4 / 2 (11 Ağustos raporu): "İlk geçici engel 15
-- dakika; tekrarda kademeli artış." Mevcut giriş güvenliği (migration 0037)
-- her seferinde sabit 15 dakika engelliyordu — block_count, bu attempt_key
-- için art arda kaç kez engellendiğini tutuyor; süre her yeni engelde
-- ikiye katlanıyor (uygulama tarafında sınırlanıyor). Başarılı girişte
-- satır tamamen silindiği için sayaç doğal olarak sıfırlanıyor.
alter table public.login_attempt_limits
  add column if not exists block_count integer not null default 0 check (block_count >= 0);
