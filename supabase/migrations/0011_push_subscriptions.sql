-- SG EduCoach — Web Push abonelikleri (PWA bildirimleri)

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (profile_id = auth.uid());
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (profile_id = auth.uid());
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (profile_id = auth.uid());
