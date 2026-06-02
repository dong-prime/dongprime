-- ============================================================================
-- Dong Prime Peptides — Supabase schema
-- Run this in the Supabase dashboard → SQL Editor (once).
-- Safe to re-run: uses "if not exists" / "or replace" where possible.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PRODUCTS
--   Catalog. Read by everyone (public site). Managed via dashboard for now.
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id          text primary key,                 -- slug, e.g. 'tirzepatide-15mg'
  name        text not null,
  label_name  text,
  dose        text,
  focus       text,
  descr       text,                              -- short description (one line)
  detail      text,                              -- long description
  capacity    text,
  category    text,                              -- research focus label
  formats     text[] not null default '{}',      -- e.g. {'Single vial','Box option'}
  stock       text   not null default 'in',      -- 'in' | 'low' | 'out'
  price       integer not null default 0,        -- whole PHP pesos
  image_url   text,                              -- '/assets/xxx.png' or storage URL
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PROFILES
--   1:1 with auth.users. Holds the customer details + saved address.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  phone         text,
  email         text,
  saved_address jsonb,                            -- {region,city,barangay,street,zip}
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ORDERS
--   Supports guest checkout (user_id null) and logged-in users.
--   items/customer/address are snapshots taken at order time.
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  order_code  text unique not null,               -- 'DP-XXXX' shown to customer
  user_id     uuid references auth.users(id) on delete set null,  -- null = guest
  customer    jsonb not null,                      -- {name, phone, email}
  items       jsonb not null,                      -- [{id,name,labelName,dose,format,qty,price}]
  address     jsonb,                               -- null when delivery = meetup
  meet        jsonb,                               -- null unless delivery = meetup
  pay_pref    text,                                -- 'gcash' | 'card'
  delivery    text,                                -- 'courier' | 'cod' | 'meetup'
  status      text not null default 'received',    -- received|confirmed|preparing|shipped|delivered|cancelled
  notes       text,                                -- customer's special requests
  step        integer not null default 0,          -- legacy; step is now derived from status
  courier     text,
  tracking_no text,
  proof_url   text,                                -- uploaded GCash receipt (storage)
  total       integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_order_code_idx on public.orders(order_code);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders   enable row level security;

-- products: anyone (even logged-out) can read active products
drop policy if exists "products public read" on public.products;
create policy "products public read"
  on public.products for select
  using (active = true);

-- profiles: each user sees / edits only their own row
drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update"
  on public.profiles for update using (auth.uid() = id);

-- orders: anyone can create an order (guest checkout allowed)
drop policy if exists "orders anyone insert" on public.orders;
create policy "orders anyone insert"
  on public.orders for insert with check (true);

-- orders: a logged-in user can read their own orders
drop policy if exists "orders own read" on public.orders;
create policy "orders own read"
  on public.orders for select using (auth.uid() = user_id);

-- ============================================================================
-- TRACKING BY ORDER CODE (without exposing the whole table)
--   SECURITY DEFINER so a guest can look up exactly one order by its code.
-- ============================================================================
create or replace function public.get_order_by_code(p_code text)
returns setof public.orders
language sql
security definer
set search_path = public
as $$
  select * from public.orders
  where order_code = upper(trim(p_code))
  limit 1;
$$;

grant execute on function public.get_order_by_code(text) to anon, authenticated;

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, saved_address)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->'saved_address'   -- jsonb, NULL if not provided
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- INVENTORY
--   Real stock quantity per product. Managed by the owner (dashboard / admin).
--   NOT publicly readable: the storefront only needs products.stock ('in'/
--   'low'/'out'), which is kept in sync automatically by the trigger below.
-- ============================================================================
create table if not exists public.inventory (
  product_id          text primary key references public.products(id) on delete cascade,
  qty                 integer not null default 0,
  low_stock_threshold integer not null default 5,
  updated_at          timestamptz not null default now()
);

alter table public.inventory enable row level security;
-- (no anon/authenticated policies on purpose — only service_role / dashboard
--  may read or write inventory. Storefront reads the synced products.stock.)

-- Keep products.stock label in sync with the real quantity.
create or replace function public.sync_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  update public.products p
  set stock = case
    when new.qty <= 0                        then 'out'
    when new.qty <= new.low_stock_threshold  then 'low'
    else                                          'in'
  end
  where p.id = new.product_id;
  return new;
end;
$$;

drop trigger if exists inventory_sync_stock on public.inventory;
create trigger inventory_sync_stock
  before insert or update of qty, low_stock_threshold on public.inventory
  for each row execute function public.sync_product_stock();

-- Optional audit ledger: every stock change (restock, sale, manual adjustment).
-- Useful later for history; not required for the storefront to work.
create table if not exists public.stock_movements (
  id          bigint generated always as identity primary key,
  product_id  text not null references public.products(id) on delete cascade,
  delta       integer not null,          -- +N restock, -N sale
  reason      text not null,             -- 'restock' | 'sale' | 'adjustment'
  note        text,
  order_code  text,
  created_at  timestamptz not null default now()
);

alter table public.stock_movements enable row level security;
-- (no public policies — owner/dashboard only, same as inventory)

-- ============================================================================
-- PLACE ORDER (atomic: create order + decrement stock + log movements)
--   Runs server-side (security definer) so it can touch the locked-down
--   inventory table and generate a unique order code. Callable by guests too.
-- ============================================================================
create or replace function public.place_order(
  p_customer jsonb,
  p_items    jsonb,
  p_address  jsonb,
  p_meet     jsonb,
  p_pay_pref text,
  p_delivery text,
  p_total    integer,
  p_notes    text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code   text;
  v_order  public.orders;
  v_item   jsonb;
  v_status text;
begin
  -- generate a unique DP-XXXXX code
  loop
    v_code := 'DP-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));
    exit when not exists (select 1 from public.orders where order_code = v_code);
  end loop;

  -- Initial status by type: COD needs no upfront payment, so it skips straight
  -- to "confirmed"; prepaid (GCash/card) starts at "awaiting_payment" so the
  -- customer can pay and upload their receipt right away.
  v_status := case when p_delivery = 'cod' then 'confirmed' else 'awaiting_payment' end;

  insert into public.orders
    (order_code, user_id, customer, items, address, meet, pay_pref, delivery, status, notes, courier, total)
  values
    (v_code, auth.uid(), p_customer, p_items, p_address, p_meet, p_pay_pref, p_delivery, v_status, p_notes, 'J&T Express', coalesce(p_total, 0))
  returning * into v_order;

  -- decrement stock and log a 'sale' movement per line item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    update public.inventory
      set qty = greatest(0, qty - coalesce((v_item->>'qty')::int, 1))
      where product_id = v_item->>'id';
    if found then
      insert into public.stock_movements (product_id, delta, reason, order_code)
      values (v_item->>'id', -coalesce((v_item->>'qty')::int, 1), 'sale', v_code);
    end if;
  end loop;

  return v_order;
end;
$$;

grant execute on function public.place_order(jsonb,jsonb,jsonb,jsonb,text,text,integer,text) to anon, authenticated;

-- ============================================================================
-- ATTACH PAYMENT PROOF
--   Lets a customer attach an uploaded receipt path to their order by code,
--   without granting a broad UPDATE policy on the orders table.
-- ============================================================================
create or replace function public.attach_payment_proof(p_code text, p_path text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders set proof_url = p_path where order_code = upper(trim(p_code));
$$;

grant execute on function public.attach_payment_proof(text, text) to anon, authenticated;

-- ============================================================================
-- STORAGE: allow uploading receipts to the private 'payment-proofs' bucket.
--   (Create the bucket first in Dashboard → Storage. Reads stay restricted;
--    the owner views receipts from the dashboard.)
-- ============================================================================
drop policy if exists "payment proof upload" on storage.objects;
create policy "payment proof upload"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'payment-proofs');
