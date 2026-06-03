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


# Top navigation (works on mobile, where the sidebar is hidden by default).
PAGES = [
    ("app.py", "Overview", "📊"),
    ("pages/1_🧾_Orders.py", "Orders", "🧾"),
    ("pages/2_💳_Payments.py", "Payments", "💳"),
    ("pages/3_↩️_Cancellations.py", "Cancellations", "↩️"),
    ("pages/4_🏷️_Inventory.py", "Inventory", "🏷️"),
    ("pages/5_📦_Products.py", "Products", "📦"),
    ("pages/6_👤_Customers.py", "Customers", "👤"),
    ("pages/7_📈_Reports.py", "Reports", "📈"),
    ("pages/8_⚙️_Settings.py", "Settings", "⚙️"),
]


def nav():
    """Top 'Menu' button → page links. Mobile-friendly (no sidebar needed)."""
    with st.popover("☰  Menu", use_container_width=True):
        for path, label, icon in PAGES:
            try:
                st.page_link(path, label=label, icon=icon)
            except Exception:
                pass
        st.divider()
        if st.button("Log out", use_container_width=True, key="_logout"):
            st.session_state.authed = False
            st.rerun()


def inject_theme():
    st.markdown("""
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;800&display=swap');
      html, body, [class*="css"] { font-family: Inter, system-ui, sans-serif; }

      /* luxury navy bg with soft gold glows (matches the storefront) */
      .stApp {
        background:
          radial-gradient(circle at 12% 0%, rgba(200,146,42,.14), transparent 32%),
          radial-gradient(circle at 88% 6%, rgba(231,189,89,.09), transparent 30%),
          radial-gradient(circle at 50% 120%, rgba(200,146,42,.07), transparent 40%),
          linear-gradient(180deg,#01040B,#07101C 60%,#020712) fixed;
      }
      [data-testid="stHeader"] { background: transparent; }
      .block-container { padding: 0.6rem 0.9rem 4rem; max-width: 760px; }
      #MainMenu, footer, [data-testid="stToolbar"] { visibility: hidden; }

      h1,h2,h3 { font-family: Cinzel, serif !important; color:#E7BD59 !important; letter-spacing:.02em; }
      h3 { font-size: 1.05rem !important; margin-top: 1.2rem !important;
           border-left: 3px solid #C8922A; padding-left: 10px; }
      [data-testid="stMarkdownContainer"] p { line-height: 1.55; }

      /* buttons */
      .stButton > button, .stFormSubmitButton > button, [data-testid="stDownloadButton"] > button {
        border:1px solid rgba(200,146,42,.5); border-radius:12px; font-weight:700; letter-spacing:.03em;
        background: rgba(10,25,48,.5); color:#E7BD59; transition:.15s;
      }
      .stButton > button:hover { border-color:#E7BD59; box-shadow:0 0 14px rgba(200,146,42,.25); }
      .stButton > button[kind="primary"], .stFormSubmitButton > button {
        background: linear-gradient(135deg,#7A5010,#E7BD59 50%,#F4D985 60%,#8A6018) !important;
        color:#070B12 !important; border:0 !important; font-weight:800 !important;
        box-shadow:0 8px 22px rgba(200,146,42,.22);
      }

      /* metric cards — gold top accent + glow */
      [data-testid="stMetric"] {
        position:relative; overflow:hidden;
        background: linear-gradient(180deg,rgba(11,26,48,.92),rgba(4,11,24,.85));
        border:1px solid rgba(200,146,42,.3); border-radius:18px; padding:16px 16px 14px;
        box-shadow:0 10px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(231,189,89,.12);
      }
      [data-testid="stMetric"]::before { content:""; position:absolute; top:0; left:0; right:0; height:2px;
        background:linear-gradient(90deg,#7A5010,#E7BD59,#7A5010); }
      [data-testid="stMetricValue"] { color:#E7BD59; font-weight:800; font-size:1.9rem; }
      [data-testid="stMetricLabel"] p { color:#A79D8C; text-transform:uppercase; letter-spacing:.12em; font-size:.7rem; }

      /* expanders as luxury cards */
      [data-testid="stExpander"] {
        border:1px solid rgba(200,146,42,.24); border-radius:16px; margin-bottom:11px;
        background:linear-gradient(180deg,rgba(11,26,48,.6),rgba(4,11,24,.55));
        box-shadow:0 6px 20px rgba(0,0,0,.35);
      }
      [data-testid="stExpander"] summary { font-weight:700; padding:6px 4px; }
      [data-testid="stExpander"] summary:hover { color:#E7BD59; }

      /* segmented control / tabs — gold active */
      [data-testid="stSegmentedControl"] button { border-radius:10px !important; }
      [data-testid="stSegmentedControl"] button[aria-checked="true"],
      [data-testid="stSegmentedControl"] button[aria-selected="true"] {
        background:linear-gradient(135deg,#7A5010,#E7BD59) !important; color:#070B12 !important; font-weight:800;
      }

      /* inputs */
      input, textarea, [data-baseweb="select"] > div { border-radius:10px !important; }
      [data-testid="stTextInput"] input, [data-testid="stNumberInput"] input {
        background:rgba(2,7,18,.6) !important; border:1px solid rgba(200,146,42,.28) !important; }
      hr { border-color: rgba(200,146,42,.16); }
      a { color:#E7BD59; }

      /* sidebar */
      [data-testid="stSidebar"] { background:rgba(3,10,22,.96); border-right:1px solid rgba(200,146,42,.18); }
    </style>
    """, unsafe_allow_html=True)


def page_title(text, sub=None, logo=True):
    img = (f"<img src='{LOGO_URL}' alt='Dong Prime' style='height:40px;width:auto;"
           f"filter:drop-shadow(0 0 7px rgba(231,189,89,.3))'/>") if logo else ""
    st.markdown(f"""
      <div style='display:flex;align-items:center;gap:13px;margin:4px 0 2px'>
        {img}
        <div>
          <div style='font-family:Cinzel,serif;font-weight:700;font-size:1.55rem;color:#E7BD59;
               letter-spacing:.03em;line-height:1.05'>{text}</div>
          {f"<div style='color:#A79D8C;font-size:12px;margin-top:3px'>{sub}</div>" if sub else ""}
        </div>
      </div>
      <div style='height:2px;border-radius:2px;margin:12px 0 18px;
        background:linear-gradient(90deg,rgba(231,189,89,.85),rgba(200,146,42,.25) 55%,transparent)'></div>
    """, unsafe_allow_html=True)
