"""Orders — rich detail, quick actions, status flow, receipts, tracking, history."""
import streamlit as st
from lib import ui, auth, db, flow
from lib.ui import peso, ph_date, status_badge

ui.setup_page("Orders")
auth.require_auth()
ui.page_title("Orders", "Process payments, shipping, cancellations")

orders = db.fetch_orders()
history = db.all_status_history()


def is_request(o):
    return o.get("cancel_requested") and o.get("status") not in ("cancelled", "refunded")


# ── Status summary ───────────────────────────────────────────────────────────
def count(pred):
    return sum(1 for o in orders if pred(o))

m1, m2, m3, m4 = st.columns(4)
m1.metric("Awaiting pay", count(lambda o: o.get("status") == "awaiting_payment"))
m2.metric("To ship", count(lambda o: o.get("status") in ("confirmed", "preparing")))
m3.metric("In transit", count(lambda o: o.get("status") == "shipped"))
m4.metric("Requests", count(is_request))

# ── Quick filter + search ─────────────────────────────────────────────────────
TABS = ["Needs action", "Awaiting payment", "To ship", "In transit", "Delivered", "All"]
try:
    tab = st.segmented_control("View", TABS, default="Needs action")
except Exception:
    tab = st.radio("View", TABS, horizontal=True)
tab = tab or "Needs action"
search = st.text_input("Search", placeholder="Order code, name, email, or phone").strip().lower()


def in_tab(o):
    s = o.get("status")
    if tab == "Needs action":
        return s == "awaiting_payment" or is_request(o)
    if tab == "Awaiting payment":
        return s == "awaiting_payment"
    if tab == "To ship":
        return s in ("confirmed", "preparing")
    if tab == "In transit":
        return s == "shipped"
    if tab == "Delivered":
        return s == "delivered"
    return True


def matches(o):
    if not in_tab(o):
        return False
    if search:
        cu = o.get("customer") or {}
        blob = " ".join([o.get("order_code", ""), cu.get("name", ""), cu.get("email", ""), cu.get("phone", "")]).lower()
        if search not in blob:
            return False
    return True


shown = [o for o in orders if matches(o)]
st.caption(f"{len(shown)} of {len(orders)} orders")


def addr_str(a):
    if not a:
        return "—"
    return ", ".join(x for x in [a.get("street"), a.get("barangay"), a.get("city"), a.get("region")] if x)


def wa_link(phone):
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    return f"https://wa.me/{digits}" if digits else None


def render_timeline(o):
    if o.get("status") in ("cancelled", "refunded"):
        label = "Refunded" if o.get("status") == "refunded" else "Cancelled"
        st.markdown(ui.badge(f"✕ {label}", "#C35656"), unsafe_allow_html=True)
        return
    steps = flow.track_steps(o.get("delivery"), o.get("pay_pref"))
    cur = flow.status_to_step(o.get("status"), o.get("delivery"), o.get("pay_pref"))
    lines = []
    for i, s in enumerate(steps):
        if i < cur:
            lines.append(f"<span style='color:#78B957'>✓ {s}</span>")
        elif i == cur:
            lines.append(f"<span style='color:#E7BD59;font-weight:800'>● {s}</span>")
        else:
            lines.append(f"<span style='color:#756E65'>○ {s}</span>")
    st.markdown(" &nbsp;→&nbsp; ".join(lines), unsafe_allow_html=True)


for o in shown:
    code = o["order_code"]
    cu = o.get("customer") or {}
    head = f"{code} · {cu.get('name','—')} · {peso(o.get('total'))} · {flow.STATUS_LABEL.get(o.get('status'), o.get('status'))}"
    if is_request(o):
        head += " 🚩"
    with st.expander(head):
        st.markdown(status_badge(o.get("status")) +
                    ("  " + ui.badge("CANCEL/REFUND REQUEST", "#C35656") if is_request(o) else ""),
                    unsafe_allow_html=True)
        st.caption(ph_date(o.get("created_at")))
        render_timeline(o)
        st.divider()

        # items + subtotal
        subtotal = 0
        for it in (o.get("items") or []):
            line = int(it.get("price") or 0) * int(it.get("qty") or 0)
            subtotal += line
            st.markdown(f"- {it.get('qty')}× **{it.get('name')}** · {flow.fmt_display(it.get('format'))} "
                        f"· {peso(it.get('price'))} → **{peso(line)}**")
        st.markdown(f"**Subtotal: {peso(subtotal)}** &nbsp;·&nbsp; Total: **{peso(o.get('total'))}**")

        # customer + delivery
        wl = wa_link(cu.get("phone"))
        contact = f"📞 {cu.get('phone','')}" + (f" · [WhatsApp]({wl})" if wl else "")
        st.markdown(
            f"**{cu.get('name','')}**<br>{contact}<br>✉️ {cu.get('email','')}<br>"
            f"<span style='color:#A79D8C;font-size:12px'>"
            f"{flow.DELIVERY_LABEL.get(o.get('delivery'), o.get('delivery'))} · "
            f"{flow.PAY_LABEL.get(o.get('pay_pref'), o.get('pay_pref'))}<br>📍 {addr_str(o.get('address'))}</span>",
            unsafe_allow_html=True)
        if o.get("notes"):
            st.info(f"📝 {o['notes']}")

        # receipt
        if o.get("proof_url"):
            url = db.signed_proof_url(o["proof_url"])
            if url:
                if str(o["proof_url"]).lower().endswith(".pdf"):
                    st.markdown(f"[🧾 Open receipt (PDF)]({url})")
                else:
                    st.image(url, caption="Payment receipt", width=240)
        st.divider()

        # quick actions
        cols = st.columns(max(1, len(flow.next_actions(o.get("status"))) + 1))
        for i, (label, target) in enumerate(flow.next_actions(o.get("status"))):
            if cols[i].button(label, key=f"q_{code}_{target}", use_container_width=True):
                db.set_status(code, o.get("status"), target, "quick action")
                st.rerun()
        # cancel / refund quick
        last = cols[-1]
        if o.get("status") == "delivered":
            if last.button("↩ Refund", key=f"rf_{code}", use_container_width=True):
                db.set_status(code, o.get("status"), "refunded", "refunded via dashboard"); st.rerun()
        elif o.get("status") not in ("cancelled", "refunded"):
            if last.button("✕ Cancel", key=f"cx_{code}", use_container_width=True):
                db.set_status(code, o.get("status"), "cancelled", "cancelled via dashboard"); st.rerun()

        if is_request(o) and st.button("Clear request flag", key=f"clr_{code}"):
            db.update_order(code, {"cancel_requested": False}); st.rerun()

        # full edit form
        with st.form(f"f_{code}"):
            new_status = st.selectbox("Set status", flow.STATUSES,
                                      index=flow.STATUSES.index(o["status"]) if o.get("status") in flow.STATUSES else 0,
                                      format_func=lambda s: flow.STATUS_LABEL[s], key=f"s_{code}")
            tracking = st.text_input("Tracking number", value=o.get("tracking_no") or "", key=f"t_{code}")
            note = st.text_input("Note (optional)", key=f"n_{code}")
            if st.form_submit_button("Save changes", type="primary", use_container_width=True):
                if new_status != o.get("status"):
                    db.set_status(code, o.get("status"), new_status, note)
                db.update_order(code, {"tracking_no": tracking or None})
                st.success("Saved."); st.rerun()

        # history
        hist = history.get(code, [])
        if hist:
            with st.popover("🕓 Status history"):
                for h in hist:
                    st.caption(f"{ph_date(h.get('created_at'))} · "
                               f"{flow.STATUS_LABEL.get(h.get('from_status'), h.get('from_status') or '—')} → "
                               f"{flow.STATUS_LABEL.get(h.get('to_status'), h.get('to_status'))}"
                               + (f" · {h.get('note')}" if h.get("note") else ""))

if not shown:
    st.info("Nothing here. Try the **All** tab or clear the search.")
