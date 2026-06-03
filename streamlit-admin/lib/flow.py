"""Order status flow, payment/delivery rules — mirrors the storefront."""

BOX_UNITS = 10

STATUSES = ["received", "awaiting_payment", "confirmed", "preparing",
            "shipped", "delivered", "cancelled", "refunded"]

STATUS_LABEL = {
    "received": "Received",
    "awaiting_payment": "Awaiting payment",
    "confirmed": "Confirmed",
    "preparing": "Preparing",
    "shipped": "Shipped",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
    "refunded": "Refunded",
}

# Color per status (hex) for badges.
STATUS_COLOR = {
    "received": "#A79D8C",
    "awaiting_payment": "#D99A2B",
    "confirmed": "#5B8Fb9",
    "preparing": "#C8922A",
    "shipped": "#7A6FB0",
    "delivered": "#78B957",
    "cancelled": "#C35656",
    "refunded": "#C35656",
}

PAY_LABEL = {"gcash": "GCash", "cash": "Cash", "bank": "Bank transfer"}
DELIVERY_LABEL = {"courier": "Courier delivery", "cod": "Cash on delivery"}

PREPAID = ("gcash", "bank")


def is_prepaid(pay_pref):
    return pay_pref in PREPAID


def is_box(fmt):
    return bool(fmt) and "box" in str(fmt).lower()


def units(qty, fmt):
    """Individual units represented by a line item (box = 10)."""
    return int(qty or 1) * (BOX_UNITS if is_box(fmt) else 1)


def fmt_display(fmt):
    return f"Box of {BOX_UNITS}" if is_box(fmt) else (fmt or "")


def track_steps(delivery, pay_pref):
    """Customer-facing tracking step labels (mirrors the storefront)."""
    prepaid = is_prepaid(pay_pref)
    steps = ["Received"]
    if prepaid:
        steps += ["Awaiting payment", "Payment received"]
    else:
        steps += ["Confirmed"]
    steps += ["Preparing"]
    if delivery == "cod":
        steps += ["Out for delivery", "Delivered" if prepaid else "Delivered & paid"]
    else:
        steps += ["Shipped", "Delivered"]
    return steps


def status_to_step(status, delivery, pay_pref):
    if is_prepaid(pay_pref):
        m = {"received": 0, "awaiting_payment": 1, "confirmed": 2, "preparing": 3, "shipped": 4, "delivered": 5}
    else:
        m = {"received": 0, "awaiting_payment": 1, "confirmed": 1, "preparing": 2, "shipped": 3, "delivered": 4}
    return m.get(status, 0)


# One-tap next actions per status: (button label, target status).
def next_actions(status):
    nxt = {
        "received": [("✅ Confirm", "confirmed")],
        "awaiting_payment": [("✅ Mark paid", "confirmed")],
        "confirmed": [("📦 Start preparing", "preparing")],
        "preparing": [("🚚 Mark shipped", "shipped")],
        "shipped": [("🏁 Mark delivered", "delivered")],
    }.get(status, [])
    return nxt

