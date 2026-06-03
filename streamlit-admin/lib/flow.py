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
