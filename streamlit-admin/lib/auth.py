"""Single shared-password gate. Call require_auth() at the top of every page."""
import streamlit as st
from . import ui


def require_auth():
    if st.session_state.get("authed"):
        return  # nav is rendered at the bottom of each page via ui.nav()

    st.write("")
    ui.brand()
    st.markdown("<div style='text-align:center;color:#A79D8C;letter-spacing:.2em;"
                "font-size:11px;text-transform:uppercase;margin:6px 0 18px'>Admin dashboard</div>",
                unsafe_allow_html=True)
    st.text_input("Password", type="password", key="_pw",
                  on_change=_check, placeholder="Enter admin password")
    st.button("Enter", type="primary", on_click=_check)
    if st.session_state.get("_pw_err"):
        st.error("Wrong password.")
    st.stop()


def _check():
    expected = st.secrets.get("ADMIN_PASSWORD", "")
    if st.session_state.get("_pw") and st.session_state["_pw"] == expected:
        st.session_state.authed = True
        st.session_state["_pw_err"] = False
        st.session_state["_pw"] = ""
    else:
        st.session_state["_pw_err"] = True
