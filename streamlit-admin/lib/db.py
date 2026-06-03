"""Supabase access (service_role) + query helpers for the admin dashboard."""
import streamlit as st
from supabase import create_client
from . import flow


@st.cache_resource
def client():
    return create_client(st.secrets["SUPABASE_URL"], st.secrets["SUPABASE_SERVICE_KEY"])


# ── Orders ────────────────────────────────────────────────────────────────
def fetch_orders(limit=500):
    res = client().table("orders").select("*").order("created_at", desc=True).limit(limit).execute()
    return res.data or []


def update_order(order_code, fields):
    client().table("orders").update(fields).eq("order_code", order_code).execute()


def log_status(order_code, from_status, to_status, note=""):
    client().table("order_status_history").insert({
        "order_code": order_code, "from_status": from_status,
        "to_status": to_status, "changed_by": "dashboard", "note": note,
    }).execute()


def set_status(order_code, prev_status, new_status, note=""):
    update_order(order_code, {"status": new_status})
    log_status(order_code, prev_status, new_status, note)


def order_history(order_code):
    res = (client().table("order_status_history").select("*")
           .eq("order_code", order_code).order("created_at", desc=True).execute())
    return res.data or []


# ── Products / inventory ────────────────────────────────────────────────────
def fetch_products():
    res = (client().table("products").select("*, inventory(qty, low_stock_threshold)")
           .order("sort_order").execute())
    return res.data or []


def update_product(pid, fields):
    client().table("products").update(fields).eq("id", pid).execute()


def insert_product(fields):
    client().table("products").insert(fields).execute()


def set_inventory(product_id, new_qty, prev_qty, reason="adjustment", note="dashboard"):
    client().table("inventory").upsert(
        {"product_id": product_id, "qty": int(new_qty)},
        on_conflict="product_id",
    ).execute()
    delta = int(new_qty) - int(prev_qty or 0)
    if delta != 0:
        client().table("stock_movements").insert({
            "product_id": product_id, "delta": delta, "reason": reason, "note": note,
        }).execute()


def fetch_movements(limit=500):
    res = (client().table("stock_movements").select("*")
           .order("created_at", desc=True).limit(limit).execute())
    return res.data or []


# ── Profiles ────────────────────────────────────────────────────────────────
def fetch_profiles():
    res = client().table("profiles").select("*").execute()
    return res.data or []


# ── Settings ────────────────────────────────────────────────────────────────
def fetch_settings():
    res = client().table("settings").select("*").execute()
    return {r["key"]: r["value"] for r in (res.data or [])}


def set_setting(key, value):
    client().table("settings").upsert({"key": key, "value": value}, on_conflict="key").execute()


# ── Storage ─────────────────────────────────────────────────────────────────
def signed_proof_url(path, expires=3600):
    if not path:
        return None
    try:
        r = client().storage.from_("payment-proofs").create_signed_url(path, expires)
        return r.get("signedURL") or r.get("signedUrl") or r.get("signed_url")
    except Exception:
        return None
