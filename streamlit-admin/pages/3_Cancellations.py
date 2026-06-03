"""Cancellations & refunds — customer requests queue."""
import streamlit as st
from lib import ui, auth, db, flow
from lib.ui import peso, ph_date, status_badge

ui.setup_page("Cancellations")
auth.require_auth()
ui.page_title("Cancellations & refunds", "Customer-requested cancels and refunds")

orders = db.fetch_orders()
queue = [o for o in orders if o.get("cancel_requested") and o.get("status") not in ("cancelled", "refunded")]

st.metric("Open requests", len(queue))
if not queue:
    st.success("No pending cancel/refund requests. 🎉")
    st.stop()

for o in queue:
    code = o["order_code"]
    cu = o.get("customer") or {}
    is_refund = o.get("status") == "delivered"
    kind = "REFUND" if is_refund else "CANCEL"
    with st.expander(f"{code} · {cu.get('name','—')} · {peso(o.get('total'))} · {kind}"):
        st.markdown(status_badge(o.get("status")) + "  " +
                    ui.badge(kind, "#C35656"), unsafe_allow_html=True)
        st.caption(ph_date(o.get("created_at")))
        for it in (o.get("items") or []):
            st.markdown(f"- {it.get('qty')}× {it.get('name')} · {flow.fmt_display(it.get('format'))}")
        st.markdown(f"**Total: {peso(o.get('total'))}** · "
                    f"{flow.PAY_LABEL.get(o.get('pay_pref'), o.get('pay_pref'))}")
        wl = "".join(ch for ch in (cu.get("phone") or "") if ch.isdigit())
        if wl:
            st.markdown(f"📞 {cu.get('phone')} · [WhatsApp](https://wa.me/{wl})")

        if is_refund:
            st.caption("Delivered order — refund the payment manually (GCash/bank), then mark refunded.")
            b1, b2 = st.columns(2)
            if b1.button("↩ Mark refunded", key=f"rf_{code}", type="primary", use_container_width=True):
                db.update_order(code, {"cancel_requested": False})
                db.set_status(code, o.get("status"), "refunded", "refunded via dashboard")
                st.rerun()
            if b2.button("Dismiss request", key=f"dz_{code}", use_container_width=True):
                db.update_order(code, {"cancel_requested": False}); st.rerun()
        else:
            b1, b2 = st.columns(2)
            if b1.button("✕ Cancel order", key=f"cx_{code}", type="primary", use_container_width=True):
                db.update_order(code, {"cancel_requested": False})
                db.set_status(code, o.get("status"), "cancelled", "cancelled via dashboard (stock restored)")
                st.rerun()
            if b2.button("Dismiss request", key=f"dz_{code}", use_container_width=True):
                db.update_order(code, {"cancel_requested": False}); st.rerun()
