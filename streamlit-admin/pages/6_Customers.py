"""Customers — members and their orders, plus guest buyers."""
import streamlit as st
from lib import ui, auth, db
from lib.ui import peso, ph_date

ui.setup_page("Customers")
auth.require_auth()
ui.page_title("Customers", "Members and order history")

orders = db.fetch_orders()
profiles = db.fetch_profiles()


def spend(os):
    return sum(int(o.get("total") or 0) for o in os if o.get("status") not in ("cancelled", "refunded"))


by_user = {}
guests = {}
for o in orders:
    uid = o.get("user_id")
    if uid:
        by_user.setdefault(uid, []).append(o)
    else:
        email = (o.get("customer") or {}).get("email") or "—"
        guests.setdefault(email, []).append(o)

c1, c2 = st.columns(2)
c1.metric("Members", len(profiles))
c2.metric("Guest emails", len(guests))

st.markdown("### Members")
if not profiles:
    st.caption("No registered members yet.")
for p in profiles:
    os = by_user.get(p["id"], [])
    with st.expander(f"{p.get('name') or '—'} · {len(os)} order(s) · {peso(spend(os))}"):
        st.caption(f"📞 {p.get('phone') or '—'} · ✉️ {p.get('email') or '—'}")
        for o in os:
            st.markdown(f"- **{o['order_code']}** · {peso(o.get('total'))} · "
                        f"{o.get('status')} · {ph_date(o.get('created_at'), with_time=False)}")
        if not os:
            st.caption("No orders yet.")

st.markdown("### Guest buyers")
for email, os in sorted(guests.items(), key=lambda kv: -spend(kv[1])):
    with st.expander(f"{email} · {len(os)} order(s) · {peso(spend(os))}"):
        for o in os:
            cu = o.get("customer") or {}
            st.markdown(f"- **{o['order_code']}** · {cu.get('name','')} · {peso(o.get('total'))} · "
                        f"{o.get('status')} · {ph_date(o.get('created_at'), with_time=False)}")

ui.nav()
