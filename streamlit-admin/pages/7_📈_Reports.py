"""Reports — revenue & order analytics with CSV export."""
from datetime import datetime, timedelta
import pandas as pd
import streamlit as st
from lib import ui, auth, db, flow
from lib.ui import PH_TZ, peso

ui.setup_page("Reports")
auth.require_auth()
ui.page_title("Reports", "Sales & order analytics")

orders = db.fetch_orders(limit=2000)
if not orders:
    st.info("No orders yet.")
    st.stop()


def day_of(iso):
    try:
        return datetime.fromisoformat(str(iso).replace("Z", "+00:00")).astimezone(PH_TZ).date()
    except Exception:
        return None


rows = []
for o in orders:
    d = day_of(o.get("created_at"))
    live = o.get("status") not in ("cancelled", "refunded")
    rows.append({
        "order_code": o.get("order_code"), "date": d, "status": o.get("status"),
        "delivery": o.get("delivery"), "payment": o.get("pay_pref"),
        "total": int(o.get("total") or 0), "revenue": int(o.get("total") or 0) if live else 0,
    })
df = pd.DataFrame(rows)

# range
days = st.slider("Range (days)", 7, 90, 30)
since = (datetime.now(PH_TZ).date() - timedelta(days=days - 1))
d = df[df["date"] >= since]

k1, k2, k3 = st.columns(3)
k1.metric("Orders", len(d))
k2.metric("Revenue", peso(d["revenue"].sum()))
k3.metric("Avg order", peso(d[d["revenue"] > 0]["revenue"].mean() if (d["revenue"] > 0).any() else 0))

st.markdown("### Revenue by day")
daily = d.groupby("date", as_index=False)["revenue"].sum()
st.bar_chart(daily, x="date", y="revenue", color="#C8922A", height=220)

st.markdown("### By payment / delivery")
c1, c2 = st.columns(2)
c1.dataframe(d.groupby("payment")["order_code"].count().rename("orders"), use_container_width=True)
c2.dataframe(d.groupby("delivery")["order_code"].count().rename("orders"), use_container_width=True)

st.markdown("### By status")
st.dataframe(d.groupby("status")["order_code"].count().rename("orders"), use_container_width=True)

# top products (explode items across all orders in range)
st.markdown("### Top products")
prod_rows = []
codes = set(d["order_code"])
for o in orders:
    if o.get("order_code") not in codes:
        continue
    for it in (o.get("items") or []):
        prod_rows.append({"product": it.get("name"),
                          "units": flow.units(it.get("qty"), it.get("format")),
                          "sales": int(it.get("price") or 0) * int(it.get("qty") or 0)})
if prod_rows:
    pdf = pd.DataFrame(prod_rows).groupby("product", as_index=False).sum().sort_values("sales", ascending=False)
    st.dataframe(pdf, use_container_width=True, hide_index=True)

st.download_button("⬇ Export orders (CSV)", d.to_csv(index=False).encode("utf-8"),
                   "dongprime_orders.csv", "text/csv", use_container_width=True)
