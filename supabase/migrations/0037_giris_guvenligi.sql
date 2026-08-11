create table if not exists public.login_attempt_limits (
  attempt_key text primary key,
  failed_count integer not null default 0 check (failed_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.login_attempt_limits enable row level security;
revoke all on table public.login_attempt_limits from anon, authenticated;

create index if not exists login_attempt_limits_cleanup_idx
  on public.login_attempt_limits (updated_at);

comment on table public.login_attempt_limits is
  'Stores hashed application login attempt keys for server-side brute-force protection.';
