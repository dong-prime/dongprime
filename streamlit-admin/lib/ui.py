"""Theme, formatting and small UI helpers — mobile-first navy/gold luxury."""
from datetime import datetime, timezone, timedelta
import streamlit as st
from . import flow

PH_TZ = timezone(timedelta(hours=8))  # Asia/Manila (UTC+8, no DST)

# Real logo served by the live storefront (single source of truth).
LOGO_URL = "https://dongprime.vercel.app/assets/dongprime-logo-transparent.png"


def peso(n):
    try:
        return "₱" + format(int(round(float(n or 0))), ",d")
    except (TypeError, ValueError):
        return "₱0"


def ph_date(iso, with_time=True):
    """Format an ISO timestamp into Manila local time."""
    if not iso:
        return ""
    try:
        s = str(iso).replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(PH_TZ)
        return dt.strftime("%b %d, %Y · %I:%M %p" if with_time else "%b %d, %Y")
    except Exception:
        return str(iso)


def badge(text, color="#C8922A"):
    return (f"<span style='background:{color}22;color:{color};border:1px solid {color}66;"
            f"border-radius:999px;padding:2px 10px;font-size:11px;font-weight:800;"
            f"letter-spacing:.04em;white-space:nowrap'>{text}</span>")


def status_badge(status):
    return badge(flow.STATUS_LABEL.get(status, status or "—"),
                 flow.STATUS_COLOR.get(status, "#A79D8C"))


def setup_page(title, icon="✦"):
    st.set_page_config(page_title=f"Dong Prime · {title}", page_icon="✦", layout="centered")
    inject_theme()
    try:
        st.logo(LOGO_URL, link="https://dongprime.vercel.app")
    except Exception:
        pass


def brand(width=190):
    """Centered logo image (login + overview headers)."""
    c = st.columns([1, 2, 1])[1]
    c.image(LOGO_URL, use_container_width=True)


def inject_theme():
    st.markdown("""
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;600;800&display=swap');
      html, body, [class*="css"] { font-family: Inter, system-ui, sans-serif; }
      .block-container { padding: 1.1rem 0.9rem 3rem; max-width: 760px; }
      #MainMenu, footer, header [data-testid="stToolbar"] { visibility: hidden; }

      h1, h2, h3 { font-family: Cinzel, serif !important; color: #E7BD59 !important; letter-spacing:.01em; }
      h1 { font-size: 1.6rem !important; }

      /* gold gradient primary buttons */
      .stButton > button[kind="primary"], .stFormSubmitButton > button {
        background: linear-gradient(135deg,#7A5010,#E7BD59 50%,#8A6018);
        color:#070B12; border:0; font-weight:800; letter-spacing:.04em;
      }
      .stButton > button { border:1px solid rgba(200,146,42,.45); border-radius:12px; }

      /* metric cards */
      [data-testid="stMetric"] {
        background: linear-gradient(180deg,rgba(10,25,48,.8),rgba(5,14,28,.7));
        border:1px solid rgba(200,146,42,.28); border-radius:16px; padding:14px 16px;
      }
      [data-testid="stMetricValue"] { color:#E7BD59; font-weight:800; }

      /* expanders as cards */
      [data-testid="stExpander"] {
        border:1px solid rgba(200,146,42,.22); border-radius:16px;
        background: linear-gradient(180deg,rgba(10,25,48,.55),rgba(5,14,28,.55)); margin-bottom:10px;
      }
      div[data-testid="stExpander"] summary { font-weight:700; }

      /* inputs */
      input, textarea, .stSelectbox div[data-baseweb="select"] > div { border-radius:10px !important; }
      hr { border-color: rgba(200,146,42,.18); }
      a { color:#E7BD59; }
    </style>
    """, unsafe_allow_html=True)


def page_title(text, sub=None):
    st.markdown(f"<h1 style='margin-bottom:2px'>{text}</h1>", unsafe_allow_html=True)
    if sub:
        st.markdown(f"<div style='color:#A79D8C;font-size:13px;margin-bottom:14px'>{sub}</div>",
                    unsafe_allow_html=True)
