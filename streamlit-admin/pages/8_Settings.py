"""Settings — bank/GCash/shipping/business values stored in the DB."""
import streamlit as st
from lib import ui, auth, db

ui.setup_page("Settings")
auth.require_auth()
ui.page_title("Settings", "Store details (saved to the database)")

try:
    s = db.fetch_settings()
except Exception as e:
    st.error(f"Run supabase/dashboard.sql first (settings table missing).\n\n{e}")
    ui.nav()
    st.stop()

with st.form("settings"):
    st.markdown("**Payment**")
    bank = st.text_input("Bank account number", value=s.get("bank_account", ""))
    gnum = st.text_input("GCash number", value=s.get("gcash_number", ""))
    gname = st.text_input("GCash account name", value=s.get("gcash_name", ""))

    st.markdown("**Store**")
    wa = st.text_input("WhatsApp number (digits, e.g. 821099182479)", value=s.get("whatsapp", ""))
    ship = st.text_input("Shipping fee (₱, 0 = confirmed on chat)", value=s.get("shipping_fee", "0"))
    low = st.text_input("Low-stock threshold (default)", value=s.get("low_stock_default", "5"))
    ann = st.text_area("Announcement (optional)", value=s.get("announcement", ""))

    if st.form_submit_button("Save settings", type="primary", use_container_width=True):
        for k, v in {
            "bank_account": bank, "gcash_number": gnum, "gcash_name": gname,
            "whatsapp": wa, "shipping_fee": ship, "low_stock_default": low, "announcement": ann,
        }.items():
            db.set_setting(k, v)
        st.success("Saved.")

st.caption("Note: the storefront will read these in Phase 2. For now they're stored here "
           "and used by the dashboard. The bank number shown to customers is still set in "
           "the app's BANK_ACCOUNT until the storefront is wired to read settings.")

ui.nav()
