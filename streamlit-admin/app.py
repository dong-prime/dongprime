"""Dong Prime — Admin dashboard (Overview)."""
from datetime import datetime, timedelta
import pandas as pd
import streamlit as st

from lib import ui, auth, db
from lib.ui import PH_TZ, peso, ph_date, status_badge

ui.setup_page("Overview")
auth.require_auth()

ui.page_title("Overview", "Dong Prime Peptides — admin")

try:
    orders = db.fetch_orders()
    products = db.fetch_products()
    profiles = db.fetch_profiles()
except Exception as e:
    st.error(f"Could not reach the database. Check your secrets.\n\n{e}")
    ui.nav()
    st.stop()

now = datetime.now(PH_TZ)
today = now.date()
week_ago = today - timedelta(days=6)


def parse_day(iso):
    try:
        return datetime.fromisoformat(str(iso).replace("Z", "+00:00")).astimezone(PH_TZ).date()
    except Exception:
        return None


live = [o for o in orders if o.get("status") not in ("cancelled", "refunded")]
revenue = sum(int(o.get("total") or 0) for o in live)
today_orders = [o for o in orders if parse_day(o.get("created_at")) == today]
week_orders = [o for o in orders if (d := parse_day(o.get("created_at"))) and d >= week_ago]

# ── KPIs ────────────────────────────────────────────────────────────────────
c1, c2 = st.columns(2)
c1.metric("Orders (total)", len(orders))
c2.metric("Revenue (active)", peso(revenue))
c3, c4 = st.columns(2)
c3.metric("Orders today", len(today_orders))
c4.metric("Members", len(profiles))

# ── Action needed ────────────────────────────────────────────────────────────
awaiting = [o for o in orders if o.get("status") == "awaiting_payment"]
requests = [o for o in orders if o.get("cancel_requested") and o.get("status") not in ("cancelled", "refunded")]
low = []
for p in products:
    inv = p.get("inventory")
    qty = (inv[0]["qty"] if isinstance(inv, list) and inv else (inv or {}).get("qty")) if inv else None
    if qty is not None and qty <= 5:
        low.append((p["name"], qty))

st.markdown("### Needs attention")
a1, a2, a3 = st.columns(3)
a1.metric("Awaiting payment", len(awaiting))
a2.metric("Cancel/refund", len(requests))
a3.metric("Low / out of stock", len(low))
if low:
    st.caption("Low stock: " + ", ".join(f"{n} ({q})" for n, q in low))
st.caption("Open the **Orders** page to process payments, requests and shipping.")

# ── 14-day trend ──────────────────────────────────────────────────────────────
st.markdown("### Last 14 days")
days = [(today - timedelta(days=i)) for i in range(13, -1, -1)]
counts = {d: 0 for d in days}
sales = {d: 0 for d in days}
for o in orders:
    d = parse_day(o.get("created_at"))
    if d in counts:
        counts[d] += 1
        if o.get("status") not in ("cancelled", "refunded"):
            sales[d] += int(o.get("total") or 0)
df = pd.DataFrame({
    "day": [d.strftime("%b %d") for d in days],
    "orders": [counts[d] for d in days],
    "revenue": [sales[d] for d in days],
})
st.bar_chart(df, x="day", y="orders", color="#C8922A", height=200)

# ── Recent orders ─────────────────────────────────────────────────────────────
st.markdown("### Recent orders")
for o in orders[:6]:
    cu = o.get("customer") or {}
    st.markdown(
        f"**{o['order_code']}** &nbsp; {status_badge(o.get('status'))}<br>"
        f"<span style='color:#A79D8C;font-size:12px'>{cu.get('name','')} · "
        f"{peso(o.get('total'))} · {ph_date(o.get('created_at'), with_time=False)}</span>",
        unsafe_allow_html=True,
    )
if not orders:
    st.info("No orders yet.")

ui.nav()
