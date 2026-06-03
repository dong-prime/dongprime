"""Inventory — adjust stock (in individual units); logs to stock_movements."""
import streamlit as st
from lib import ui, auth, db
from lib import flow

ui.setup_page("Inventory")
auth.require_auth()
ui.page_title("Inventory", "Stock is counted in individual units (1 box = 10)")

products = db.fetch_products()


def qty_of(p):
    inv = p.get("inventory")
    if isinstance(inv, list):
        return inv[0]["qty"] if inv else 0
    if isinstance(inv, dict):
        return inv.get("qty", 0)
    return 0


for p in products:
    qty = qty_of(p)
    label = "🟢 In stock" if qty > 5 else ("🟠 Low" if qty > 0 else "🔴 Out")
    with st.expander(f"{p['name']} · {qty} units · {label}"):
        with st.form(f"inv_{p['id']}"):
            new_qty = st.number_input("Quantity (units)", min_value=0, value=int(qty), step=1, key=f"q_{p['id']}")
            reason = st.selectbox("Reason", ["restock", "adjustment"], key=f"r_{p['id']}")
            if st.form_submit_button("Save stock", type="primary", use_container_width=True):
                db.set_inventory(p["id"], int(new_qty), int(qty), reason=reason)
                st.success(f"Updated to {int(new_qty)} units.")
                st.rerun()
        st.caption(f"≈ {qty // flow.BOX_UNITS} box(es) of {flow.BOX_UNITS}, or {qty} single vials available.")

if not products:
    st.info("No products yet.")

ui.nav()
