"""Products — edit catalog fields and active state (no hard delete)."""
import streamlit as st
from lib import ui, auth, db
from lib.ui import peso
from lib import flow

ui.setup_page("Products")
auth.require_auth()
ui.page_title("Products", "Edit price, details and visibility")

products = db.fetch_products()

for p in products:
    tag = "" if p.get("active") else " · (hidden)"
    with st.expander(f"{p['name']} · {peso(p.get('price'))}{tag}"):
        img = p.get("image_url") or ""
        if img:
            st.image(img if img.startswith("http") else f"https://dongprime.vercel.app{img}", width=120)
        with st.form(f"prod_{p['id']}"):
            name = st.text_input("Name", value=p.get("name") or "")
            price = st.number_input("Price (₱, single vial)", min_value=0, value=int(p.get("price") or 0), step=100)
            descr = st.text_input("Short description", value=p.get("descr") or "")
            detail = st.text_area("Detail", value=p.get("detail") or "", height=120)
            focus = st.text_input("Focus tag", value=p.get("focus") or "")
            category = st.text_input("Research focus / category", value=p.get("category") or "")
            has_box = st.checkbox("Offer Box of 10", value=flow.is_box(" ".join(p.get("formats") or [])))
            active = st.checkbox("Visible in shop", value=bool(p.get("active")))
            if st.form_submit_button("Save product", type="primary", use_container_width=True):
                formats = ["Single vial"] + (["Box option"] if has_box else [])
                db.update_product(p["id"], {
                    "name": name, "price": int(price), "descr": descr, "detail": detail,
                    "focus": focus, "category": category, "formats": formats, "active": active,
                })
                st.success("Saved.")
                st.rerun()
        if has_box := flow.is_box(" ".join(p.get("formats") or [])):
            st.caption(f"Box of {flow.BOX_UNITS} sells at {peso((p.get('price') or 0) * flow.BOX_UNITS)}.")

st.divider()
st.caption("To add a brand-new product or change its image, do it in Supabase for now "
           "(image upload comes in Phase 2).")

ui.nav()
