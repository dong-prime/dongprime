"""Payments — awaiting-payment queue with receipts; confirm in one tap."""
import streamlit as st
from lib import ui, auth, db, flow
from lib.ui import peso, ph_date

ui.setup_page("Payments")
auth.require_auth()
ui.page_title("Payments", "Confirm prepaid (GCash / bank) orders")

orders = db.fetch_orders()
queue = [o for o in orders if o.get("status") == "awaiting_payment"]

with_proof = [o for o in queue if o.get("proof_url")]
no_proof = [o for o in queue if not o.get("proof_url")]
c1, c2 = st.columns(2)
c1.metric("Awaiting payment", len(queue))
c2.metric("Receipt uploaded", len(with_proof))

if not queue:
    st.success("No payments waiting. 🎉")
    st.stop()

st.caption("Receipt uploaded first, then the rest.")
for o in with_proof + no_proof:
    code = o["order_code"]
    cu = o.get("customer") or {}
    with st.expander(f"{code} · {cu.get('name','—')} · {peso(o.get('total'))} · "
                     f"{flow.PAY_LABEL.get(o.get('pay_pref'), o.get('pay_pref'))}"):
        st.caption(ph_date(o.get("created_at")))
        for it in (o.get("items") or []):
            st.markdown(f"- {it.get('qty')}× {it.get('name')} · {flow.fmt_display(it.get('format'))} · {peso(it.get('price'))}")
        st.markdown(f"**Total: {peso(o.get('total'))}**")

        if o.get("proof_url"):
            url = db.signed_proof_url(o["proof_url"])
            if url:
                if str(o["proof_url"]).lower().endswith(".pdf"):
                    st.markdown(f"[🧾 Open receipt (PDF)]({url})")
                else:
                    st.image(url, caption="Payment receipt", width=260)
        else:
            st.warning("No receipt uploaded yet.")

        b1, b2 = st.columns(2)
        if b1.button("✅ Confirm payment", key=f"ok_{code}", type="primary", use_container_width=True):
            db.set_status(code, o.get("status"), "confirmed", "payment confirmed")
            st.rerun()
        if b2.button("✕ Cancel order", key=f"cx_{code}", use_container_width=True):
            db.set_status(code, o.get("status"), "cancelled", "cancelled at payment stage")
            st.rerun()
