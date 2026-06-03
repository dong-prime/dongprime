-- ============================================================================
-- Dong Prime — extra tables for the Streamlit admin dashboard
-- Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- (A) Editable site settings (bank account, GCash, shipping, etc.).
--     Public READ so the storefront can use them; writes are owner-only.
create table if not exists public.settings (
  key   text primary key,
  value text
);
alter table public.settings enable row level security;
drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings for select using (true);

insert into public.settings (key, value) values
  ('bank_account', 'XXX-XXX-XXXX'),
  ('gcash_number', ''),
  ('gcash_name',   ''),
  ('shipping_fee', '0'),
  ('whatsapp',     '821099182479'),
  ('low_stock_default', '5'),
  ('announcement', '')
on conflict (key) do nothing;

-- (B) Audit log of order status changes (who/when/what).
create table if not exists public.order_status_history (
  id          bigint generated always as identity primary key,
  order_code  text not null,
  from_status text,
  to_status   text,
  changed_by  text,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.order_status_history enable row level security;
-- no public policies — only service_role (the dashboard) reads/writes this.

create index if not exists osh_order_code_idx on public.order_status_history(order_code);
