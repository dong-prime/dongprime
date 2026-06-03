# Dong Prime — Admin Dashboard (Streamlit)

Mobile-first, navy/gold admin console for the shop. Server-side, so it uses the
Supabase **service_role** key safely. See `PLAN.md` for the full spec.

**Phase 1 (this MVP):** Overview · Orders · Inventory · Products, behind a password.

## 1. One-time database setup
In Supabase → SQL Editor, run **`../supabase/dashboard.sql`** (creates `settings`
and `order_status_history`).

## 2. Run locally
```bash
cd streamlit-admin
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .streamlit/secrets.toml.example .streamlit/secrets.toml   # then edit it
streamlit run app.py
```
Fill `.streamlit/secrets.toml`:
- `SUPABASE_URL` — https://ovxhiclfsboqhmyfgfip.supabase.co
- `SUPABASE_SERVICE_KEY` — Supabase → Project Settings → API → **service_role** (secret!)
- `ADMIN_PASSWORD` — the shared password to open the dashboard

> The real `secrets.toml` is gitignored — never commit it.

## 3. Deploy (Streamlit Community Cloud)
1. Push this repo to GitHub (already done).
2. https://share.streamlit.io → **New app** → pick repo/branch, main file
   `streamlit-admin/app.py`.
3. **Advanced → Secrets**: paste the same three values as above.
4. Deploy → open on your phone. (Optional: set the app to private and invite
   only your Google email for an extra layer.)

## Pages
- **app.py** — Overview: KPIs, "needs attention" (awaiting payment, cancel/refund
  requests, low stock), 14-day chart, recent orders.
- **Orders** — filter/search, order detail, change status (logged), tracking
  number, view receipt, clear cancel/refund request.
- **Inventory** — adjust stock in units (box = 10); logs to `stock_movements`.
- **Products** — edit price/details/visibility; toggle Box of 10.

## Notes
- Times shown in Asia/Manila. Money in ₱. Stock counted in individual units.
- Use this as the single admin tool; turn off the Google Sheet edit triggers to
  avoid both editing the same order.
- Phase 2: product image upload, payments/cancellations dedicated queues,
  Settings (bank/GCash/shipping read by the storefront), Customers, Reports.
