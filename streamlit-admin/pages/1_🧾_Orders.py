"""Orders — list, filter, view detail, change status, tracking, cancel/refund."""
import streamlit as st
from lib import ui, auth, db, flow
from lib.ui import peso, ph_date, status_badge

ui.setup_page("Orders")
auth.require_auth()
ui.page_title("Orders", "Process payments, shipping, cancellations")

orders = db.fetch_orders()

# ── Filters ───────────────────────────────────────────────────────────────
f1, f2 = st.columns([1, 1])
status_filter = f1.multiselect("Status", flow.STATUSES, default=[],
                               format_func=lambda s: flow.STATUS_LABEL[s])
only_requests = f2.toggle("Cancel/refund requests only")
search = st.text_input("Search", placeholder="Order code, name, email, or phone").strip().lower()


def matches(o):
    if status_filter and o.get("status") not in status_filter:
        return False
    if only_requests and not (o.get("cancel_requested") and o.get("status") not in ("cancelled", "refunded")):
        return False
    if search:
        cu = o.get("customer") or {}
        blob = " ".join([o.get("order_code", ""), cu.get("name", ""), cu.get("email", ""),
                         cu.get("phone", "")]).lower()
        if search not in blob:
            return False
    return True


shown = [o for o in orders if matches(o)]
st.caption(f"{len(shown)} of {len(orders)} orders")


def addr_str(a):
    if not a:
        return "—"
    return ", ".join(x for x in [a.get("street"), a.get("barangay"), a.get("city"), a.get("region")] if x)


for o in shown:
    code = o["order_code"]
    cu = o.get("customer") or {}
    req = o.get("cancel_requested") and o.get("status") not in ("cancelled", "refunded")
    flag = " 🚩" if req else ""
    head = f"{code} · {peso(o.get('total'))} · {flow.STATUS_LABEL.get(o.get('status'), o.get('status'))}{flag}"
    with st.expander(head):
        st.markdown(status_badge(o.get("status")) + ("  " + ui.badge("REQUEST", "#C35656") if req else ""),
                    unsafe_allow_html=True)
        st.caption(ph_date(o.get("created_at")))

        # items
        for it in (o.get("items") or []):
            st.markdown(f"- {it.get('qty')}× **{it.get('name')}** · {flow.fmt_display(it.get('format'))} · {peso(it.get('price'))}")

        # customer + delivery
        st.markdown(
            f"**{cu.get('name','')}** · {cu.get('phone','')} · {cu.get('email','')}<br>"
            f"<span style='color:#A79D8C;font-size:12px'>"
            f"{flow.DELIVERY_LABEL.get(o.get('delivery'), o.get('delivery'))} · "
            f"{flow.PAY_LABEL.get(o.get('pay_pref'), o.get('pay_pref'))}<br>{addr_str(o.get('address'))}</span>",
            unsafe_allow_html=True,
        )
        if o.get("notes"):
            st.info(f"📝 {o['notes']}")

        # payment proof
        if o.get("proof_url"):
            url = db.signed_proof_url(o["proof_url"])
            if url:
                st.markdown(f"[🧾 View payment receipt]({url})")

        st.divider()
        # actions
        with st.form(f"f_{code}"):
            new_status = st.selectbox("Status", flow.STATUSES,
                                      index=flow.STATUSES.index(o.get("status")) if o.get("status") in flow.STATUSES else 0,
                                      format_func=lambda s: flow.STATUS_LABEL[s], key=f"s_{code}")
            tracking = st.text_input("Tracking number", value=o.get("tracking_no") or "", key=f"t_{code}")
            note = st.text_input("Note (optional)", key=f"n_{code}")
            saved = st.form_submit_button("Save", type="primary", use_container_width=True)
            if saved:
                if new_status != o.get("status"):
                    db.set_status(code, o.get("status"), new_status, note)
                fields = {"tracking_no": tracking or None}
                db.update_order(code, fields)
                st.success("Saved.")
                st.rerun()

        if req and st.button("Clear cancel/refund request", key=f"clr_{code}"):
            db.update_order(code, {"cancel_requested": False})
            st.rerun()

if not shown:
    st.info("No orders match the filters.")
