import { useEffect, useMemo, useState } from "react";
import {
  Home, LayoutGrid, ClipboardList, MessageCircle, User,
  ArrowLeft, Plus, Minus, Check, ChevronRight, ChevronDown,
  MapPin, Phone, Mail, Lock, LogOut, Package, Shield,
  ShieldCheck, Truck, FlaskConical, Search, Clock, Users, Upload,
  Box, Award, WalletCards, CreditCard, Handshake, Headphones
} from "lucide-react";
import {
  supabase, fetchProducts,
  signUpUser, signInUser, signOutUser, getProfile, toAppUser,
  placeOrder, lookupOrder, fetchMyOrders, uploadPaymentProof, requestCancellation,
} from "./lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Dong Prime Peptides demo app
// Navy & gold luxury mobile catalog/order flow
// Replace WHATSAPP with the real WhatsApp Business number.
// ─────────────────────────────────────────────────────────────────────────────

const WHATSAPP = "821099182479";
const wa = (text) => `https://api.whatsapp.com/send?phone=${WHATSAPP}&text=${encodeURIComponent(text)}`;
const SHIPPING = 0;

const PRODUCTS = [
  {
    id: "tirzepatide-15mg",
    image: "/assets/tirzepatide-15mg.png",
    focus: "Weight",
    name: "Tirzepatide 15 mg",
    labelName: "TIRZEPATIDE",
    dose: "15mg",
    desc: "GLP-1/GIP dual agonist, 15 mg/mL",
    detail:
      "Premium research-grade Tirzepatide supplied in a sealed vial for laboratory research use only. Commonly referenced in metabolic-pathway research involving GLP-1 and GIP receptor activity. Each vial is packaged for clean handling, discreet delivery, and catalog-based ordering.",
    capacity: "15 mg/mL · per vial",
    category: "Weight / metabolic research",
    formats: ["Single vial", "Box option"],
    stock: "in",
    price: 3000,
  },
  {
    id: "retatrutide-20mg",
    image: "/assets/retatrutide-20mg.png",
    focus: "Weight",
    name: "Retatrutide 20 mg",
    labelName: "RETATRUTIDE",
    dose: "20mg",
    desc: "Triple agonist (GLP-1/GIP/GCG), 20 mg",
    detail:
      "Premium research-grade Retatrutide supplied in a sealed 20 mg vial for laboratory research use only. Designed for advanced metabolic-research discussions involving triple-hormone pathway interest: GLP-1, GIP, and glucagon receptor activity. Packaged with a luxury black-and-gold Dong Prime presentation.",
    capacity: "20 mg · per vial",
    category: "Weight / triple-pathway research",
    formats: ["Single vial", "Box option"],
    stock: "in",
    price: 4000,
  },
  {
    id: "klow-80mg",
    image: "/assets/klow-80mg.png",
    focus: "Recovery",
    name: "Klow 80 mg",
    labelName: "KLOW",
    dose: "80mg",
    desc: "Research compound",
    detail:
      "Klow 80 mg is positioned as a premium research compound for catalog demonstration and research-use-only presentation. It is supplied in sealed packaging with a clean luxury vial identity, suitable for product-listing, order-flow, and educational demo use.",
    capacity: "80 mg · per vial",
    category: "Recovery research",
    formats: ["Single vial"],
    stock: "in",
    price: 3500,
  },
  {
    id: "ghk-cu-50mg",
    image: "/assets/ghk-cu-50mg.png",
    focus: "Skin",
    name: "GHK-Cu 50 mg",
    labelName: "GHK-CU",
    dose: "50mg",
    desc: "Copper peptide, skin & repair research",
    detail:
      "Premium research-grade GHK-Cu supplied in a sealed 50 mg vial for laboratory research use only. Commonly referenced in cosmetic-science and repair-pathway research contexts. This catalog copy avoids medical claims and is intended for demo and educational product presentation only.",
    capacity: "50 mg · per vial",
    category: "Skin / repair research",
    formats: ["Single vial"],
    stock: "in",
    price: 2500,
  },
  {
    id: "nad-glutathione",
    image: "/assets/nad-glutathione.png",
    focus: "Cellular",
    name: "NAD+ 250 mg / Glutathione 200 mg",
    labelName: "NAD+ / GLUTATHIONE",
    dose: "250mg / 200mg",
    desc: "Cellular energy & antioxidant research blend",
    detail:
      "Premium research-use-only blend containing NAD+ 250 mg and Glutathione 200 mg. Presented for cellular-energy and antioxidant-pathway research discussions in a sealed vial format. No wellness, treatment, or performance claims are implied.",
    capacity: "NAD+ 250 mg / Glutathione 200 mg · per vial",
    category: "Cellular / antioxidant research",
    formats: ["Single vial"],
    stock: "in",
    price: 4000,
  },
  {
    id: "cjc-ipa-5mg-5mg",
    image: "/assets/cjc-ipamorelin.png",
    focus: "Performance",
    name: "CJC-1295 5 mg + Ipamorelin 5 mg",
    labelName: "CJC-1295 + IPAMORELIN",
    dose: "5mg + 5mg",
    desc: "GHRH + GH secretagogue research blend",
    detail:
      "Premium research-grade peptide blend containing CJC-1295 5 mg and Ipamorelin 5 mg. Presented for laboratory research discussions around GHRH and GH-secretagogue pathways. Supplied as a sealed research-use-only vial with discreet ordering support.",
    capacity: "CJC-1295 5 mg + Ipamorelin 5 mg · per vial",
    category: "Performance / recovery research",
    formats: ["Single vial", "Box option"],
    stock: "in",
    price: 3500,
  },
];

const STOCK_MAP = {
  in: { t: "In stock", c: "#78B957" },
  low: { t: "Low stock", c: "#D99A2B" },
  out: { t: "Out of stock", c: "#C35656" },
};

const PH_ADDR = {
  "Metro Manila (NCR)": {
    "Quezon City": ["Diliman", "Loyola Heights", "Commonwealth", "Holy Spirit", "Batasan Hills", "Bagong Pag-asa"],
    Makati: ["Poblacion", "Bel-Air", "San Lorenzo", "Bangkal", "Guadalupe Nuevo", "Forbes Park"],
    Manila: ["Malate", "Ermita", "Tondo", "Sampaloc", "Binondo", "Sta. Cruz"],
    Pasig: ["Kapitolyo", "San Antonio", "Ugong", "Ortigas Center"],
    Taguig: ["Fort Bonifacio", "Western Bicutan", "Ususan", "Bagumbayan"],
  },
  "Central Visayas (Region VII)": {
    "Cebu City": ["Lahug", "Mabolo", "Guadalupe", "Banilad", "Capitol Site"],
    "Mandaue City": ["Centro", "Tipolo", "Subangdaku", "Banilad"],
  },
  "Calabarzon (Region IV-A)": {
    Antipolo: ["San Roque", "Dela Paz", "Mayamot", "Cupang"],
    Bacoor: ["Molino", "Talaba", "Zapote", "Mambog"],
  },
};

const blankAddr = { region: "", city: "", barangay: "", street: "", zip: "" };
const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH");
const fmtAddr = (a) => [a.street, a.barangay && "Brgy. " + a.barangay, a.city, a.region].filter(Boolean).join(", ");

// Bank transfer details shown to customers (placeholder for now).
const BANK_ACCOUNT = "XXX-XXX-XXXX";
// Prepaid methods require a payment receipt before fulfilment; cash does not.
const PREPAID = ["gcash", "bank"];
const isPrepaid = (payPref) => PREPAID.includes(payPref);
// Payment methods available per delivery method.
const paymentsFor = (delivery) => (delivery === "cod" ? ["cash", "bank"] : ["gcash", "bank"]);
const PAY_LABELS = {
  gcash: { t: "GCash", d: "Send to our GCash, then upload the receipt" },
  cash: { t: "Cash", d: "Pay the rider in cash on arrival" },
  bank: { t: "Bank transfer", d: "Transfer to our account, then upload proof" },
};

// A "Box option" is a 10-pack priced at the single-unit price × 10.
const BOX_UNITS = 10;
const isBox = (fmt) => /box/i.test(fmt || "");
const formatPrice = (product, fmt) => (Number(product?.price) || 0) * (isBox(fmt) ? BOX_UNITS : 1);
const fmtDisplay = (fmt) => (isBox(fmt) ? `Box of ${BOX_UNITS}` : fmt);
const unitsPerItem = (fmt) => (isBox(fmt) ? BOX_UNITS : 1);
// Max orderable quantity for a product/format, given individual-unit stock.
// Infinity when stock is unknown (e.g. Supabase not configured) — no cap.
const maxQty = (product, fmt) => {
  const sq = product?.stockQty;
  if (sq == null) return Infinity;
  return Math.max(0, Math.floor(sq / unitsPerItem(fmt)));
};

function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="dpLogoGold" x1="8" y1="6" x2="56" y2="58">
          <stop stopColor="#FFE199" />
          <stop offset=".45" stopColor="#C8922A" />
          <stop offset="1" stopColor="#7A5010" />
        </linearGradient>
      </defs>
      <path d="M32 5C32 5 12 23.5 12 39.5C12 50.5 21 59 32 59C43 59 52 50.5 52 39.5C52 23.5 32 5 32 5Z" stroke="url(#dpLogoGold)" strokeWidth="3" />
      <path d="M32 18C32 18 22 29 22 39.5C22 46 26.5 51.5 32 51.5C37.5 51.5 42 46 42 39.5C42 29 32 18 32 18Z" stroke="url(#dpLogoGold)" strokeWidth="1.8" opacity=".95" />
      <path d="M24 35C29 31 35 31 40 35M24 41C29 37 35 37 40 41M24 47C29 43 35 43 40 47" stroke="url(#dpLogoGold)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M29 31V49M35 31V49" stroke="url(#dpLogoGold)" strokeWidth="1.2" opacity=".75" />
    </svg>
  );
}

function DongPrimeLogo({ compact = false }) {
  return (
    <img
      src="/assets/dongprime-logo-transparent.png"
      alt="Dong Prime Peptides"
      className={compact ? "logo-img compact" : "logo-img"}
    />
  );
}

function ProductVial({ product = PRODUCTS[1], size = 78, hero = false }) {
  const style = hero
    ? { maxWidth: "100%", maxHeight: "100%" }
    : { width: size, height: Math.round(size * 1.1) };

  return (
    <img
      src={product.image}
      alt={product.name}
      className={hero ? "product-img hero-product-img" : "product-img"}
      style={style}
      loading="lazy"
    />
  );
}

function HeroLineup() {
  return (
    <img
      src="/assets/lineup.png"
      alt="Dong Prime Peptides product lineup"
      className="lineup-img"
      loading="lazy"
    />
  );
}

function AddressFields({ addr, setAddr }) {
  const regions = Object.keys(PH_ADDR);
  const cities = addr.region ? Object.keys(PH_ADDR[addr.region]) : [];
  const brgys = addr.region && addr.city ? PH_ADDR[addr.region][addr.city] : [];

  const set = (k, v) => {
    if (k === "region") setAddr({ ...addr, region: v, city: "", barangay: "" });
    else if (k === "city") setAddr({ ...addr, city: v, barangay: "" });
    else setAddr({ ...addr, [k]: v });
  };

  const SelectField = ({ label, k, value, options, disabled, placeholder }) => (
    <div className="field">
      <label><MapPin size={12}/>{label}</label>
      <div className="select-wrap">
        <select value={value} disabled={disabled} onChange={(e) => set(k, e.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={15} className="select-icon" />
      </div>
    </div>
  );

  return (
    <>
      <SelectField label="Region" k="region" value={addr.region} options={regions} placeholder="Select region" />
      <SelectField label="City / Municipality" k="city" value={addr.city} options={cities} disabled={!addr.region} placeholder={addr.region ? "Select city" : "Choose region first"} />
      <SelectField label="Barangay" k="barangay" value={addr.barangay} options={brgys} disabled={!addr.city} placeholder={addr.city ? "Select barangay" : "Choose city first"} />
      <div className="field">
        <label><MapPin size={12}/>Street / unit</label>
        <input value={addr.street} placeholder="House no., street, building" onChange={(e) => set("street", e.target.value)} />
      </div>
      <div className="field">
        <label>ZIP code <span>(optional)</span></label>
        <input value={addr.zip} placeholder="1101" onChange={(e) => set("zip", e.target.value)} />
      </div>
    </>
  );
}

// Tracking steps by payment + delivery.
//  - Prepaid (GCash/bank): Received → Awaiting payment (upload proof) →
//    Payment received → Preparing → Shipped/Out for delivery → Delivered.
//  - Cash (COD only): Received → Confirmed → Preparing → Out for delivery →
//    Delivered & paid.  (no upfront payment, no upload)
function trackStepsFor(delivery, payPref) {
  const prepaid = isPrepaid(payPref);
  const steps = [{ t: "Received", d: "We got your order request." }];
  if (prepaid) {
    const how = payPref === "bank"
      ? `Transfer to ${BANK_ACCOUNT}, then upload your deposit slip.`
      : "We will send GCash details, then upload your receipt.";
    steps.push({ t: "Awaiting payment", d: how, upload: true });
    steps.push({ t: "Payment received", d: "Payment confirmed — thank you." });
  } else {
    steps.push({ t: "Confirmed", d: "Price and stock confirmed. Pay cash on delivery." });
  }
  steps.push({ t: "Preparing", d: "Packing your items." });
  if (delivery === "cod") {
    steps.push({ t: "Out for delivery", d: "Your order is on the way.", ship: true });
    steps.push({ t: prepaid ? "Delivered" : "Delivered & paid", d: "All done — thank you." });
  } else {
    steps.push({ t: "Shipped", d: "Handed to the courier.", ship: true });
    steps.push({ t: "Delivered", d: "All done — enjoy." });
  }
  return steps;
}

const ORDER_STATUSES = ["received", "awaiting_payment", "confirmed", "preparing", "shipped", "delivered", "cancelled", "refunded"];

// Owner status → current step index. Index lists differ for prepaid (6 steps)
// vs cash (5 steps), so the mapping depends on the payment method.
function statusToStep(status, delivery, payPref) {
  const map = isPrepaid(payPref)
    ? { received: 0, awaiting_payment: 1, confirmed: 2, preparing: 3, shipped: 4, delivered: 5 }
    : { received: 0, awaiting_payment: 1, confirmed: 1, preparing: 2, shipped: 3, delivered: 4 };
  return map[status] != null ? map[status] : 0;
}

function ProductThumb({ product, size = 42 }) {
  return (
    <img
      src={product.image}
      alt={product.name}
      className="thumb-img"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

function ShopCard({ product, onAdd, onOpen }) {
  const [fmtIdx, setFmtIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const fmt = product.formats[fmtIdx];
  const price = formatPrice(product, fmt);
  const cap = maxQty(product, fmt);
  const out = product.stock === "out" || cap < 1;

  const pickFmt = (i) => {
    setFmtIdx(i);
    const c = maxQty(product, product.formats[i]);
    setQty((q) => Math.min(Math.max(1, q), Math.max(1, c)));
  };

  const add = () => {
    onAdd(product, fmtIdx, Math.min(qty, cap));
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="product-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
      <button onClick={() => onOpen(product)} style={{ display: "flex", gap: 12, alignItems: "center", background: "transparent", border: 0, padding: 0, textAlign: "left", color: "inherit", width: "100%" }}>
        <div className="thumb"><ProductThumb product={product} size={43} /></div>
        <div style={{ flex: 1 }}>
          <div className="pname">{product.name}</div>
          <div className="pdesc">{product.desc}</div>
          <div className="stock" style={{ color: STOCK_MAP[product.stock].c }}>
            <span className="stock-dot" style={{ background: STOCK_MAP[product.stock].c }} />{STOCK_MAP[product.stock].t}
          </div>
        </div>
        <ChevronRight size={16} color="var(--gold2)" />
      </button>

      {product.formats.length > 1 && (
        <div className="chips" style={{ margin: 0 }}>
          {product.formats.map((f, i) => (
            <button key={f} className={i === fmtIdx ? "chip active" : "chip"} onClick={() => pickFmt(i)}>{fmtDisplay(f)}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div className="price">
          {peso(price)}{isBox(fmt) && <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600 }}> · {BOX_UNITS} pcs</span>}
        </div>
        <div className="stepper">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={14} /></button>
          <span>{qty}</span>
          <button disabled={qty >= cap} onClick={() => setQty((q) => Math.min(q + 1, cap))}><Plus size={14} /></button>
        </div>
      </div>

      {Number.isFinite(cap) && !out && (
        <div className="footer-note" style={{ textAlign: "left", margin: 0 }}>
          {cap} {isBox(fmt) ? "box(es)" : "vial(s)"} available
        </div>
      )}

      <button className="btn primary" disabled={out} style={{ padding: 11 }} onClick={add}>
        {out ? (product.stock === "out" ? "Out of stock" : "Not enough stock") : added ? "Added ✓" : "Add to order"}
      </button>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [products, setProducts] = useState(PRODUCTS); // PRODUCTS = built-in fallback
  const [sel, setSel] = useState([]);
  const [active, setActive] = useState(PRODUCTS[1]);

  // Load the live catalog from Supabase; keep the built-in list if it fails.
  useEffect(() => {
    fetchProducts().then((rows) => {
      if (rows.length) setProducts(rows);
    });
  }, []);
  const [fmtIdx, setFmtIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [user, setUser] = useState(null);
  const [authTab, setAuthTab] = useState("login");
  const [afterAuth, setAfterAuth] = useState("account");
  const [authMsg, setAuthMsg] = useState(null);   // { type: "error" | "info", text }
  const [authBusy, setAuthBusy] = useState(false);
  const [af, setAf] = useState({ name: "", phone: "", email: "", password: "" });
  const [signupAddr, setSignupAddr] = useState(blankAddr);
  const [cust, setCust] = useState({ name: "", phone: "", email: "" });
  const [addr, setAddr] = useState(blankAddr);
  const [meet, setMeet] = useState({ place: "", when: "" });
  const [useSaved, setUseSaved] = useState(false);
  const [payPref, setPayPref] = useState("gcash");
  const [delivery, setDelivery] = useState("courier");
  const [notes, setNotes] = useState("");
  const [agree, setAgree] = useState(false);
  const [proof, setProof] = useState("");
  const [orders, setOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [trackInput, setTrackInput] = useState("");
  const [trackMsg, setTrackMsg] = useState("");
  const [proofBusy, setProofBusy] = useState(false);

  const count = sel.reduce((s, i) => s + i.qty, 0);
  const subtotal = sel.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
  const total = subtotal + SHIPPING;
  const effAddr = user?.savedAddress && useSaved ? user.savedAddress : addr;
  const addrOk = Boolean(effAddr.region && effAddr.city && effAddr.barangay && effAddr.street);
  const validOrder = Boolean(cust.name && cust.phone && cust.email && addrOk && agree && sel.length > 0);

  // Keep the chosen payment valid for the chosen delivery method.
  const payOptions = paymentsFor(delivery);
  const pickDelivery = (d) => {
    setDelivery(d);
    const opts = paymentsFor(d);
    if (!opts.includes(payPref)) setPayPref(opts[0]);
  };
  const navActive = { home: "home", shop: "shop", detail: "shop", order: "orders", review: "orders", done: "orders", track: "orders", account: "account", auth: "account", policy: "home" }[view] || "home";

  const go = (v) => setView(v);
  const openProduct = (p) => { setActive(p); setFmtIdx(0); setQty(1); go("detail"); };

  const addItem = (product, fIdx, q) => {
    const fmt = product.formats[fIdx];
    const key = product.id + "::" + fIdx;
    const price = formatPrice(product, fmt);
    setSel((cur) => {
      const existing = cur.find((i) => i.key === key);
      if (existing) return cur.map((i) => i.key === key ? { ...i, qty: i.qty + q } : i);
      return [...cur, { key, id: product.id, name: product.name, labelName: product.labelName, dose: product.dose, format: fmt, qty: q, price }];
    });
  };

  const addToOrder = () => { addItem(active, fmtIdx, Math.min(qty, maxQty(active, active.formats[fmtIdx]))); go("order"); };

  const bump = (key, d) => {
    setSel((cur) => cur.map((i) => {
      if (i.key !== key) return i;
      const cap = maxQty(itemProduct(i), i.format);
      return { ...i, qty: Math.min(i.qty + d, cap) };
    }).filter((i) => i.qty > 0));
  };

  // Set user + autofill order details. No navigation (used on session restore).
  const hydrateUser = (u) => {
    setUser(u);
    setCust({ name: u.name || "", phone: u.phone || "", email: u.email || "" });
    if (u.savedAddress) {
      setAddr(u.savedAddress);
      setUseSaved(true);
    }
  };

  // After an explicit login/signup: hydrate, clear the form, and navigate.
  const applyUser = (u) => {
    hydrateUser(u);
    setAf({ name: "", phone: "", email: "", password: "" });
    setSignupAddr(blankAddr);
    setAuthMsg(null);
    go(afterAuth);
  };

  // Restore an existing session on load and keep it in sync.
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const hydrateFromSession = async (session) => {
      if (!session?.user || !active) return;
      const profile = await getProfile(session.user.id);
      if (active) hydrateUser(toAppUser(session.user, profile));
    };
    supabase.auth.getSession().then(({ data }) => hydrateFromSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setTimeout(() => hydrateFromSession(session), 0); // avoid deadlock
      else if (active) setUser(null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const doLogin = async () => {
    setAuthMsg(null);
    if (!af.email || !af.password) {
      setAuthMsg({ type: "error", text: "Enter your email and password." });
      return;
    }
    setAuthBusy(true);
    const { data, error } = await signInUser({ email: af.email.trim(), password: af.password });
    setAuthBusy(false);
    if (error) {
      const text = /confirm|not confirmed/i.test(error.message)
        ? "Please confirm your email first — check your inbox for the link."
        : "Wrong email or password.";
      setAuthMsg({ type: "error", text });
      return;
    }
    const profile = await getProfile(data.user.id);
    applyUser(toAppUser(data.user, profile));
  };

  const doSignup = async () => {
    setAuthMsg(null);
    if (!af.email || !af.password) {
      setAuthMsg({ type: "error", text: "Enter your email and password." });
      return;
    }
    if (af.password.length < 6) {
      setAuthMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setAuthBusy(true);
    const { data, error } = await signUpUser({
      email: af.email.trim(),
      password: af.password,
      name: af.name,
      phone: af.phone,
      savedAddress: signupAddr.region ? signupAddr : null,
    });
    setAuthBusy(false);
    if (error) {
      setAuthMsg({ type: "error", text: error.message });
      return;
    }
    // Email confirmation ON → no session yet; user must click the email link.
    if (!data.session) {
      setAuthTab("login");
      setAf({ ...af, password: "" });
      setAuthMsg({
        type: "info",
        text: `We sent a confirmation link to ${af.email.trim()}. Click it to verify — you'll be logged in automatically.`,
      });
      return;
    }
    // Email confirmation OFF → already logged in.
    applyUser(toAppUser(data.user, null));
  };

  const logout = async () => {
    await signOutUser();
    setUser(null);
    setCust({ name: "", phone: "", email: "" });
    setAddr(blankAddr);
    setUseSaved(false);
    go("home");
  };

  // Map an orders-table row (snake_case) into the shape the UI uses. Tracking
  // steps are derived (not stored), and placedAt is formatted from created_at.
  const dbRowToOrder = (r) => ({
    id: r.order_code,
    items: r.items || [],
    address: r.address,
    meet: r.meet,
    customer: r.customer || {},
    payPref: r.pay_pref,
    delivery: r.delivery,
    status: r.status || "received",
    cancelled: r.status === "cancelled" || r.status === "refunded",
    refunded: r.status === "refunded",
    cancelRequested: !!r.cancel_requested,
    cancellable: ["received", "awaiting_payment", "confirmed", "preparing"].includes(r.status || "received"),
    refundable: (r.status || "received") === "delivered",
    notes: r.notes || "",
    steps: trackStepsFor(r.delivery, r.pay_pref),
    step: statusToStep(r.status || "received", r.delivery, r.pay_pref),
    courier: r.courier || "J&T Express",
    trackingNo: r.tracking_no || "",
    proofUrl: r.proof_url || "",
    placedAt: r.created_at
      ? new Date(r.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
      : "",
    total: r.total || 0,
  });

  const confirmOrder = async () => {
    const itemsPayload = sel.map((i) => ({
      id: i.id, name: i.name, labelName: i.labelName, dose: i.dose,
      format: i.format, qty: i.qty, price: i.price,
    }));

    const { data, error } = await placeOrder({
      p_customer: cust,
      p_items: itemsPayload,
      p_address: effAddr,
      p_meet: null,
      p_pay_pref: payPref,
      p_delivery: delivery,
      p_total: total,
      p_notes: notes || null,
    });

    // Build the local order: from the saved DB row, or a local fallback if the
    // DB write failed (so the customer still gets a confirmation + WhatsApp).
    const order = (!error && data)
      ? dbRowToOrder(data)
      : {
          id: "DP-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
          items: itemsPayload,
          address: effAddr,
          meet: null,
          customer: cust,
          payPref, delivery,
          status: "received",
          cancelled: false,
          notes: notes || "",
          steps: trackStepsFor(delivery, payPref),
          step: 0,
          courier: "J&T Express",
          trackingNo: "",
          placedAt: new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
          total,
        };
    if (error) console.error("place_order failed, used local fallback:", error.message);

    setOrders((o) => [order, ...o]);
    setActiveOrder(order);
    setSel([]);
    setNotes("");
    setAgree(false);
    setProof("");
    fetchProducts().then((rows) => { if (rows.length) setProducts(rows); }); // refresh stock
    go("done");
  };

  // Load the logged-in user's orders from the DB.
  useEffect(() => {
    if (!user?.id) { setMyOrders([]); return; }
    let active = true;
    fetchMyOrders(user.id).then((rows) => {
      if (active) setMyOrders(rows.map(dbRowToOrder));
    });
    return () => { active = false; };
  }, [user]);

  // Deep link: opening ?track=DP-XXXX (e.g. from a confirmation email) jumps
  // straight to that order's tracking page.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("track");
    if (!code) return;
    lookupOrder(code).then((row) => {
      if (row) { setActiveOrder(dbRowToOrder(row)); go("track"); }
    });
  }, []);

  // Orders to show in lists: this session's + the user's saved ones, deduped.
  const recentOrders = useMemo(() => {
    const seen = new Set();
    return [...orders, ...myOrders].filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
  }, [orders, myOrders]);

  const openTrack = (o) => { setActiveOrder(o); setProof(o.proofUrl || ""); setTrackMsg(""); go("track"); };

  const lookup = async () => {
    const code = trackInput.trim().toUpperCase();
    if (!code) return;
    setTrackMsg("");
    const local = recentOrders.find((o) => o.id === code);
    if (local) { setActiveOrder(local); setTrackInput(""); go("track"); return; }
    const row = await lookupOrder(code);
    if (row) { setActiveOrder(dbRowToOrder(row)); setTrackInput(""); go("track"); return; }
    setTrackMsg(`No order found for "${code}". Check the code from your confirmation.`);
  };

  const handleProofUpload = async (file) => {
    if (!file || !activeOrder) return;
    setProofBusy(true);
    const res = await uploadPaymentProof(activeOrder.id, file);
    setProofBusy(false);
    if (res.error) { setTrackMsg("Upload failed: " + res.error.message); return; }
    setProof(file.name);
  };

  const handleCancelRequest = async () => {
    if (!activeOrder) return;
    setTrackMsg("");
    const { error } = await requestCancellation(activeOrder.id);
    if (error) { setTrackMsg("Could not send the request: " + error.message); return; }
    setActiveOrder({ ...activeOrder, cancelRequested: true });
  };

  // Refund requests are handled manually over WhatsApp. We also flag the order
  // (fire-and-forget) so it shows up for the owner in the sheet.
  const handleRefundRequest = () => {
    if (!activeOrder) return;
    requestCancellation(activeOrder.id);
    setActiveOrder({ ...activeOrder, cancelRequested: true });
  };

  const itemProduct = (item) => products.find((p) => p.id === item.id) || products.find((p) => p.name === item.name) || products[0] || PRODUCTS[1];

  const NavItem = ({ id, label, Icon, href }) => {
    const active = navActive === id;
    const targetView = id === "orders" ? "track" : id;
    if (href) {
      return (
        <a href={href} target="_blank" rel="noreferrer" className="nav-item">
          <Icon size={20} /><span>{label}</span>
        </a>
      );
    }
    return (
      <button className={active ? "nav-item active" : "nav-item"} onClick={() => go(targetView)}>
        <Icon size={20} /><span>{label}</span>
      </button>
    );
  };

  return (
    <div className="dp-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        button, input, select, textarea { font: inherit; }
        button { cursor: pointer; }

        .dp-page {
          --bg:#020712;
          --bg2:#06101E;
          --panel:#071426;
          --panel2:#0A1930;
          --line:rgba(200,146,42,.32);
          --line2:rgba(200,146,42,.18);
          --gold:#C8922A;
          --gold2:#E7BD59;
          --gold3:#8A6018;
          --ink:#F3EBD7;
          --muted:#A79D8C;
          --soft:#756E65;
          --green:#78B957;
          min-height:100vh;
          display:flex;
          justify-content:center;
          align-items:flex-start;
          padding:22px 12px;
          background:
            radial-gradient(circle at 15% 20%, rgba(200,146,42,.13), transparent 24%),
            radial-gradient(circle at 82% 10%, rgba(231,189,89,.08), transparent 22%),
            radial-gradient(circle at 50% 100%, rgba(200,146,42,.08), transparent 34%),
            linear-gradient(180deg,#01040B,#07101C 58%,#020712);
          color:var(--ink);
          font-family:Inter, system-ui, -apple-system, Segoe UI, sans-serif;
        }

        .app {
          width:100%;
          max-width:430px;
          height:850px;
          display:flex;
          flex-direction:column;
          border-radius:38px;
          overflow:hidden;
          background:
            linear-gradient(180deg,rgba(8,20,38,.98),rgba(2,7,18,.99)),
            var(--bg);
          border:1px solid rgba(231,189,89,.42);
          box-shadow:0 38px 120px rgba(0,0,0,.8), 0 0 50px rgba(200,146,42,.09);
          position:relative;
        }

        .app::before {
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          background:
            radial-gradient(circle at 70% 15%, rgba(200,146,42,.13), transparent 18%),
            linear-gradient(90deg, transparent 49%, rgba(200,146,42,.04) 50%, transparent 51%);
          opacity:.8;
        }

        .top {
          position:relative;
          z-index:2;
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:15px 19px 12px;
          border-bottom:1px solid var(--line2);
          background:rgba(2,7,18,.72);
          backdrop-filter:blur(10px);
        }

        .dp-logo { display:flex; align-items:center; gap:9px; color:var(--gold2); }
        .dp-logo-main { font-weight:800; letter-spacing:.18em; font-size:14px; line-height:1; color:var(--gold2); }
        .dp-logo-sub { font-weight:600; letter-spacing:.42em; font-size:8px; margin-top:4px; color:var(--gold); }
        .brand-btn { background:none; border:0; display:flex; align-items:center; }

        .top-actions { display:flex; gap:8px; align-items:center; }
        .icon-btn {
          position:relative;
          width:34px;
          height:34px;
          display:grid;
          place-items:center;
          color:var(--gold2);
          border:1px solid var(--line2);
          background:rgba(8,20,38,.65);
          border-radius:12px;
        }
        .cart-badge {
          position:absolute;
          right:-5px;
          top:-5px;
          min-width:18px;
          height:18px;
          padding:0 5px;
          border-radius:12px;
          background:var(--gold2);
          color:var(--bg);
          display:grid;
          place-items:center;
          font-size:10px;
          font-weight:800;
        }
        .avatar {
          width:34px;
          height:34px;
          border-radius:50%;
          background:linear-gradient(135deg,#7A5010,#E7BD59);
          color:#020712;
          border:0;
          font-weight:900;
        }

        .content {
          position:relative;
          z-index:1;
          flex:1;
          overflow-y:auto;
          scroll-behavior:smooth;
        }
        .content::-webkit-scrollbar { width:0; }

        .screen {
          padding:22px 20px 28px;
          animation:fadeUp .25s ease both;
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } }

        .nav {
          position:relative;
          z-index:3;
          display:flex;
          padding:9px 0 17px;
          background:rgba(2,7,18,.95);
          border-top:1px solid var(--line2);
        }
        .nav-item {
          flex:1;
          display:flex;
          flex-direction:column;
          gap:3px;
          align-items:center;
          justify-content:center;
          color:var(--muted);
          background:transparent;
          border:0;
          text-decoration:none;
        }
        .nav-item span { font-size:10px; font-weight:600; }
        .nav-item.active { color:var(--gold2); }

        .back {
          display:inline-flex;
          gap:7px;
          align-items:center;
          color:var(--gold2);
          background:transparent;
          border:0;
          font-size:13px;
          margin-bottom:18px;
        }

        .eyebrow {
          color:var(--gold);
          text-transform:uppercase;
          letter-spacing:.22em;
          font-size:10px;
          font-weight:800;
          margin-bottom:8px;
        }
        .title {
          font-family:Cinzel, serif;
          font-weight:600;
          letter-spacing:.02em;
          color:var(--ink);
          font-size:30px;
          line-height:1.15;
        }
        .title .gold { color:var(--gold2); }
        .subtitle {
          color:var(--muted);
          font-size:13px;
          line-height:1.6;
          margin-top:10px;
        }
        .section-label {
          margin:22px 0 10px;
          color:var(--gold);
          font-size:10px;
          text-transform:uppercase;
          letter-spacing:.22em;
          font-weight:900;
        }

        .btn {
          width:100%;
          border:0;
          border-radius:13px;
          padding:14px 16px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          text-decoration:none;
          font-weight:800;
          letter-spacing:.06em;
          font-size:13px;
          text-transform:uppercase;
        }
        .btn.primary {
          color:#070B12;
          background:linear-gradient(135deg,#7A5010,#E7BD59 46%,#F4D985 55%,#8A6018);
          box-shadow:0 10px 28px rgba(200,146,42,.18);
        }
        .btn.ghost {
          color:var(--gold2);
          border:1px solid var(--line);
          background:rgba(7,20,38,.42);
        }
        .btn:disabled {
          opacity:.42;
          cursor:not-allowed;
        }

        .hero-card {
          margin:20px 0 18px;
          border:1px solid var(--line2);
          border-radius:18px;
          padding:10px 10px 14px;
          background:
            radial-gradient(circle at center bottom, rgba(200,146,42,.24), transparent 48%),
            linear-gradient(180deg,rgba(10,25,48,.86),rgba(3,9,18,.92));
          overflow:hidden;
        }
        .lineup {
          display:flex;
          justify-content:center;
          align-items:flex-end;
          gap:-2px;
          min-height:160px;
        }
        .lineup-item { filter:drop-shadow(0 10px 20px rgba(0,0,0,.55)); margin:0 -2px; }

        .badge-grid {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:10px;
          margin:17px 0;
        }
        .mini-card {
          border:1px solid var(--line2);
          border-radius:14px;
          background:rgba(7,20,38,.62);
          padding:13px;
        }
        .mini-card svg { color:var(--gold2); }
        .mini-card h4 { margin-top:8px; color:var(--ink); font-size:12px; }
        .mini-card p { color:var(--muted); font-size:10.5px; line-height:1.4; margin-top:3px; }

        .notice {
          padding:12px 13px;
          border:1px solid var(--line2);
          border-radius:13px;
          color:var(--muted);
          background:rgba(200,146,42,.06);
          font-size:12px;
          line-height:1.55;
          margin-bottom:14px;
        }

        .product-card {
          display:flex;
          align-items:center;
          gap:12px;
          margin-bottom:10px;
          padding:10px 11px;
          border:1px solid var(--line2);
          border-radius:15px;
          background:linear-gradient(180deg,rgba(10,25,48,.74),rgba(5,14,28,.72));
          color:inherit;
          width:100%;
          text-align:left;
        }
        .thumb {
          width:70px;
          min-width:70px;
          height:76px;
          display:grid;
          place-items:center;
          border-radius:12px;
          background:rgba(2,7,18,.62);
          border:1px solid rgba(231,189,89,.14);
          overflow:hidden;
        }
        .pname { color:var(--ink); font-weight:800; font-size:14px; line-height:1.25; }
        .pdesc { color:var(--muted); font-size:11.5px; line-height:1.4; margin-top:3px; }
        .price { color:var(--gold2); font-weight:900; white-space:nowrap; font-size:14px; }
        .stock { font-size:11px; font-weight:800; margin-top:5px; display:flex; gap:5px; align-items:center; }
        .stock-dot { width:6px; height:6px; border-radius:50%; display:block; }

        .detail-art {
          min-height:260px;
          display:grid;
          place-items:center;
          border-radius:20px;
          border:1px solid var(--line2);
          background:
            radial-gradient(circle at center, rgba(200,146,42,.24), transparent 46%),
            linear-gradient(180deg,rgba(10,25,48,.72),rgba(2,7,18,.88));
          margin-bottom:18px;
          overflow:hidden;
        }
        .hero-vial { filter:drop-shadow(0 30px 35px rgba(0,0,0,.55)); }

        .price-row { display:flex; align-items:center; justify-content:space-between; margin:13px 0 16px; }
        .big-price { color:var(--gold2); font-family:Cinzel, serif; font-size:28px; font-weight:700; }
        .info-row {
          display:flex;
          gap:10px;
          align-items:center;
          padding:10px 0;
          border-bottom:1px solid rgba(231,189,89,.12);
          color:var(--muted);
          font-size:13px;
        }
        .info-row b { margin-left:auto; color:var(--ink); text-align:right; }

        .chips { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }
        .chip {
          padding:8px 12px;
          border-radius:11px;
          background:rgba(7,20,38,.62);
          border:1px solid var(--line2);
          color:var(--muted);
          font-size:12px;
          font-weight:700;
        }
        .chip.active { color:var(--gold2); border-color:var(--gold); background:rgba(200,146,42,.08); }

        .stepper {
          display:flex;
          align-items:center;
          border:1px solid var(--line2);
          background:rgba(2,7,18,.58);
          border-radius:12px;
          overflow:hidden;
        }
        .stepper button {
          width:36px;
          height:36px;
          border:0;
          background:transparent;
          color:var(--gold2);
          display:grid;
          place-items:center;
        }
        .stepper span {
          min-width:34px;
          color:var(--ink);
          text-align:center;
          font-weight:900;
        }

        .field { margin-bottom:11px; }
        .field label {
          display:flex;
          gap:5px;
          align-items:center;
          color:var(--gold);
          font-size:10px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.13em;
          margin-bottom:6px;
        }
        .field label span { color:var(--muted); letter-spacing:0; text-transform:none; font-weight:500; }
        input, textarea, select {
          width:100%;
          border:1px solid var(--line2);
          background:rgba(2,7,18,.58);
          color:var(--ink);
          border-radius:11px;
          padding:12px 13px;
          outline:none;
        }
        textarea { min-height:74px; resize:vertical; }
        input::placeholder, textarea::placeholder { color:#71695F; }
        .select-wrap { position:relative; }
        .select-wrap select { appearance:none; padding-right:38px; }
        .select-icon { position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--gold2); pointer-events:none; }

        .banner {
          border:1px solid var(--line2);
          background:rgba(200,146,42,.06);
          border-radius:13px;
          padding:12px 13px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          color:var(--muted);
          font-size:12px;
          margin-bottom:14px;
        }
        .link {
          border:0;
          background:transparent;
          color:var(--gold2);
          text-decoration:underline;
          text-underline-offset:3px;
        }

        .opt {
          display:flex;
          align-items:center;
          gap:12px;
          border:1px solid var(--line2);
          border-radius:14px;
          padding:12px;
          margin-bottom:9px;
          background:rgba(7,20,38,.56);
        }
        .opt.active { border-color:var(--gold); background:rgba(200,146,42,.08); }
        .opt-ic {
          width:38px;
          height:38px;
          display:grid;
          place-items:center;
          color:var(--gold2);
          border-radius:11px;
          background:rgba(2,7,18,.5);
          border:1px solid rgba(231,189,89,.12);
        }
        .radio {
          width:18px;
          height:18px;
          border:1px solid var(--line);
          border-radius:50%;
          display:grid;
          place-items:center;
          margin-left:auto;
        }
        .opt.active .radio {
          background:var(--gold2);
          color:#020712;
        }

        .order-item, .review-item, .order-card {
          display:flex;
          gap:12px;
          align-items:center;
          padding:10px 0;
          border-bottom:1px solid rgba(231,189,89,.12);
        }

        .check-line {
          display:flex;
          gap:10px;
          color:var(--muted);
          font-size:12px;
          line-height:1.5;
          margin:13px 0;
        }
        .check-box {
          width:19px;
          height:19px;
          min-width:19px;
          display:grid;
          place-items:center;
          border:1px solid var(--line);
          border-radius:5px;
          margin-top:1px;
        }
        .check-box.on { background:var(--gold2); color:#020712; }

        .review-row {
          display:flex;
          justify-content:space-between;
          gap:16px;
          color:var(--muted);
          font-size:12.5px;
          padding:8px 0;
          border-bottom:1px solid rgba(231,189,89,.1);
        }
        .review-row b { color:var(--ink); text-align:right; max-width:62%; }

        .tabs {
          display:flex;
          padding:4px;
          border:1px solid var(--line2);
          border-radius:13px;
          background:rgba(2,7,18,.5);
          margin:15px 0;
        }
        .tab {
          flex:1;
          border:0;
          background:transparent;
          color:var(--muted);
          border-radius:10px;
          padding:10px;
          font-weight:800;
        }
        .tab.active { color:#020712; background:linear-gradient(135deg,#7A5010,#E7BD59); }

        .success {
          text-align:center;
          padding:20px 0 8px;
        }
        .success-icon {
          width:74px;
          height:74px;
          border-radius:50%;
          display:grid;
          place-items:center;
          margin:0 auto 18px;
          color:#020712;
          background:linear-gradient(135deg,#7A5010,#E7BD59);
          box-shadow:0 0 38px rgba(200,146,42,.28);
        }
        .pill {
          display:inline-flex;
          color:var(--gold2);
          border:1px solid var(--line);
          background:rgba(200,146,42,.08);
          border-radius:999px;
          padding:5px 12px;
          font-size:10px;
          text-transform:uppercase;
          letter-spacing:.17em;
          font-weight:900;
          margin-top:8px;
        }

        .track-step {
          display:flex;
          gap:13px;
        }
        .track-left { display:flex; flex-direction:column; align-items:center; }
        .track-dot {
          width:26px;
          height:26px;
          border-radius:50%;
          border:1px solid var(--line);
          display:grid;
          place-items:center;
          color:var(--muted);
          background:#020712;
          font-size:12px;
          font-weight:900;
        }
        .track-dot.done { background:linear-gradient(135deg,#7A5010,#E7BD59); color:#020712; }
        .track-dot.current { border-color:var(--gold2); color:var(--gold2); }
        .track-bar { width:2px; flex:1; background:var(--line2); min-height:22px; }
        .track-bar.done { background:var(--gold); }
        .track-body { padding-bottom:16px; flex:1; }
        .track-body h4 { color:var(--ink); font-size:14px; }
        .track-body.current h4 { color:var(--gold2); }
        .track-body p { color:var(--muted); font-size:11.5px; line-height:1.4; margin-top:2px; }
        .track-box {
          margin-top:9px;
          border:1px solid var(--line2);
          border-radius:12px;
          padding:11px 12px;
          color:var(--muted);
          background:rgba(200,146,42,.06);
          font-size:12px;
          line-height:1.6;
        }
        .upload {
          margin-top:9px;
          border:1px dashed var(--line);
          border-radius:12px;
          padding:14px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:6px;
          color:var(--gold2);
          background:rgba(200,146,42,.04);
          font-size:12px;
        }

        .policy-list {
          display:flex;
          flex-direction:column;
          gap:10px;
          margin-top:14px;
        }
        .policy-item {
          display:flex;
          gap:12px;
          align-items:flex-start;
          padding:14px;
          border:1px solid var(--line2);
          border-radius:14px;
          background:rgba(7,20,38,.56);
        }
        .policy-item svg { color:var(--gold2); min-width:22px; }
        .policy-item h4 { color:var(--gold2); font-size:14px; margin-bottom:4px; }
        .policy-item p { color:var(--muted); font-size:12px; line-height:1.5; }

        .footer-note {
          color:var(--muted);
          font-size:10.5px;
          line-height:1.6;
          text-align:center;
          margin-top:16px;
        }

        .logo-img {
          display:block;
          height:44px;
          width:auto;
          object-fit:contain;
          filter:drop-shadow(0 0 8px rgba(200,146,42,.18));
        }
        .logo-img.compact {
          height:38px;
        }

        .lineup-img {
          width:100%;
          height:160px;
          object-fit:contain;
          object-position:center bottom;
          display:block;
          filter:drop-shadow(0 18px 28px rgba(0,0,0,.68));
        }

        .product-img {
          object-fit:contain;
          object-position:center;
          display:block;
          border-radius:10px;
          filter:drop-shadow(0 10px 20px rgba(0,0,0,.58));
        }

        .hero-product-img {
          width:100%;
          height:100%;
          max-height:245px;
          object-fit:contain;
          object-position:center;
          border-radius:14px;
          filter:drop-shadow(0 28px 34px rgba(0,0,0,.72));
        }

        .thumb-img {
          object-fit:cover;
          object-position:center;
          border-radius:9px;
          transform:scale(1.15);
          filter:drop-shadow(0 8px 14px rgba(0,0,0,.55));
        }


        /* refined real-image layout */
        .top {
          background:
            radial-gradient(circle at 10% 0%, rgba(200,146,42,.10), transparent 36%),
            linear-gradient(180deg, rgba(3,10,22,.96), rgba(2,7,18,.86));
        }

        .brand-btn {
          padding:4px 7px 4px 0;
          border-radius:16px;
        }

        .logo-img {
          height:40px;
          width:auto;
          max-width:185px;
          object-fit:contain;
          border-radius:0;
          mix-blend-mode:screen;
          filter:drop-shadow(0 0 5px rgba(231,189,89,.20));
        }
        .logo-img.compact {
          height:36px;
        }

        .hero-card {
          padding:0 !important;
          min-height:178px;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
          background:
            radial-gradient(circle at center, rgba(200,146,42,.16), transparent 50%),
            linear-gradient(180deg, #020712 0%, #071426 100%);
        }

        .lineup {
          width:100%;
          min-height:178px !important;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .lineup-img {
          width:100%;
          height:178px;
          object-fit:cover;
          object-position:center center;
          display:block;
          transform:scale(1.02);
          filter:
            contrast(1.05)
            saturate(1.05)
            drop-shadow(0 18px 28px rgba(0,0,0,.70));
        }

        .thumb {
          width:74px !important;
          min-width:74px !important;
          height:86px !important;
          padding:0;
          background:
            radial-gradient(circle at center, rgba(200,146,42,.13), transparent 56%),
            #020712;
          border:1px solid rgba(231,189,89,.22);
        }

        .thumb-img {
          width:100% !important;
          height:100% !important;
          object-fit:cover;
          object-position:center center;
          border-radius:11px;
          transform:scale(1.03);
          filter:contrast(1.04) saturate(1.05);
        }

        .detail-art {
          padding:0;
          overflow:hidden;
          min-height:280px !important;
          background:
            radial-gradient(circle at center, rgba(200,146,42,.20), transparent 46%),
            linear-gradient(180deg, #020712, #071426);
        }

        .hero-product-img {
          width:100% !important;
          height:280px !important;
          object-fit:cover;
          object-position:center center;
          border-radius:0;
          transform:scale(1.02);
          filter:contrast(1.06) saturate(1.06) drop-shadow(0 28px 34px rgba(0,0,0,.72));
        }

        .focus-pill {
          display:inline-flex;
          align-items:center;
          border:1px solid rgba(231,189,89,.28);
          background:rgba(200,146,42,.08);
          color:var(--gold2);
          border-radius:999px;
          padding:2px 8px;
          font-size:10px;
          font-weight:900;
          letter-spacing:.04em;
        }

      `}</style>

      <div className="app">
        <div className="top">
          <button className="brand-btn" onClick={() => go("home")} aria-label="Home">
            <DongPrimeLogo compact />
          </button>
          <div className="top-actions">
            {user ? (
              <button className="avatar" onClick={() => go("account")}>{user.name?.[0]?.toUpperCase() || "U"}</button>
            ) : (
              <button className="icon-btn" onClick={() => { setAfterAuth("account"); setAuthTab("login"); go("auth"); }}><User size={18}/></button>
            )}
            <button className="icon-btn" onClick={() => go("order")}>
              <ClipboardList size={18}/>
              {count > 0 && <span className="cart-badge">{count}</span>}
            </button>
          </div>
        </div>

        <main className="content">
          {view === "home" && (
            <section className="screen">
              <div className="eyebrow">Premium research peptides & solutions</div>
              <h1 className="title">Premium research<br/><span className="gold">peptides</span> & solutions.</h1>
              <p className="subtitle">Curated research compounds, sealed presentation, and discreet support via WhatsApp.</p>

              <div style={{display:"grid",gap:10,marginTop:18}}>
                <button className="btn primary" onClick={() => go("shop")}>Shop now <ChevronRight size={16}/></button>
                <a className="btn ghost" href="https://docs.google.com/spreadsheets/d/1VKYSG2PxnMOE1hCkUoD4DsLUP2MW6v4g6Ny75hozhWo/edit?gid=0#gid=0" target="_blank" rel="noreferrer">
                  <LayoutGrid size={16}/>View catalog
                </a>
              </div>

              <div className="hero-card"><HeroLineup /></div>

              <div className="badge-grid">
                <div className="mini-card"><Award size={20}/><h4>Premium Quality</h4><p>Sealed and verified presentation.</p></div>
                <div className="mini-card"><FlaskConical size={20}/><h4>Research Use Only</h4><p>For laboratory research only.</p></div>
                <div className="mini-card"><Truck size={20}/><h4>Discreet Shipping</h4><p>Secure and confidential support.</p></div>
                <div className="mini-card"><ShieldCheck size={20}/><h4>Trusted Service</h4><p>Simple ordering with clear updates.</p></div>
              </div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18,marginBottom:10}}>
                <div className="section-label" style={{margin:0}}>Catalog preview</div>
                <button className="link" onClick={() => go("shop")}>View all</button>
              </div>

              {products.slice(0, 2).map((p) => (
                <button className="product-card" key={p.id} onClick={() => openProduct(p)}>
                  <div className="thumb"><ProductThumb product={p} size={42}/></div>
                  <div style={{flex:1}}>
                    <div className="pname">{p.name}</div>
                    <div className="pdesc">{p.desc}</div>
                  </div>
                  <div className="price">{peso(p.price)}</div>
                  <ChevronRight size={16} color="var(--gold2)"/>
                </button>
              ))}

              <div className="notice" style={{marginTop:16}}>
                <b style={{color:"var(--gold2)"}}>Research Use Only.</b><br/>
                Categories describe research focus areas only. No medical advice, diagnosis, treatment, performance, or consumption claims.
              </div>

              <div className="footer-note">DONG PRIME PEPTIDES · QUALITY · PRIVACY · INTEGRITY</div>
            </section>
          )}

          {view === "shop" && (
            <section className="screen">
              <button className="back" onClick={() => go("home")}><ArrowLeft size={15}/>Home</button>
              <h2 className="title" style={{fontSize:25}}>Catalog</h2>
              <p className="subtitle">Tap a product for details. Prices shown in PHP. Message us on WhatsApp anytime.</p>
              <div className="notice">All products are for research use only. Pricing, stock, and delivery details are confirmed before payment.</div>

              {products.map((p) => (
                <ShopCard key={p.id} product={p} onAdd={addItem} onOpen={openProduct} />
              ))}

              <button className="btn primary" style={{marginTop:14}} onClick={() => go("order")}>
                Checkout{count > 0 ? ` · ${count} item${count > 1 ? "s" : ""}` : ""} <ChevronRight size={16}/>
              </button>
            </section>
          )}

          {view === "detail" && active && (
            <section className="screen">
              <button className="back" onClick={() => go("shop")}><ArrowLeft size={15}/>Catalog</button>
              <div className="detail-art"><ProductVial product={active} size={128} hero /></div>

              <h2 className="title" style={{fontSize:24}}>{active.name}</h2>
              <p className="subtitle" style={{marginTop:6}}>{active.desc}</p>

              <div className="price-row">
                <div className="big-price">{peso(formatPrice(active, active.formats[fmtIdx]))}</div>
                <div className="stock" style={{color:STOCK_MAP[active.stock].c}}>
                  <span className="stock-dot" style={{background:STOCK_MAP[active.stock].c}} />{STOCK_MAP[active.stock].t}
                </div>
              </div>
              {isBox(active.formats[fmtIdx]) && (
                <div className="footer-note" style={{textAlign:"left",marginTop:-8,marginBottom:6}}>
                  Box of {BOX_UNITS} vials — {peso(active.price)} each
                </div>
              )}

              <p className="subtitle" style={{marginTop:0}}>{active.detail}</p>

              <div className="info-row"><FlaskConical size={16} color="var(--gold2)"/>Format <b>{fmtDisplay(active.formats[fmtIdx])}</b></div>
              <div className="info-row"><Box size={16} color="var(--gold2)"/>Research Focus <b>{active.category}</b></div>
              <div className="info-row"><Shield size={16} color="var(--gold2)"/>Use <b>Research use only</b></div>

              {active.formats.length > 1 && (
                <>
                  <div className="section-label">Format</div>
                  <div className="chips">
                    {active.formats.map((f, i) => (
                      <button key={f} className={i === fmtIdx ? "chip active" : "chip"} onClick={() => { setFmtIdx(i); setQty((q) => Math.min(Math.max(1, q), Math.max(1, maxQty(active, active.formats[i])))); }}>{fmtDisplay(f)}</button>
                    ))}
                  </div>
                </>
              )}

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"18px 0 20px"}}>
                <div className="section-label" style={{margin:0}}>Quantity</div>
                <div className="stepper">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={14}/></button>
                  <span>{qty}</span>
                  <button disabled={qty >= maxQty(active, active.formats[fmtIdx])} onClick={() => setQty((q) => Math.min(q + 1, maxQty(active, active.formats[fmtIdx])))}><Plus size={14}/></button>
                </div>
              </div>

              {Number.isFinite(maxQty(active, active.formats[fmtIdx])) && active.stock !== "out" && (
                <div className="footer-note" style={{textAlign:"left",marginTop:-10,marginBottom:12}}>
                  {maxQty(active, active.formats[fmtIdx])} {isBox(active.formats[fmtIdx]) ? "box(es)" : "vial(s)"} available
                </div>
              )}

              {(() => {
                const c = maxQty(active, active.formats[fmtIdx]);
                const o = active.stock === "out" || c < 1;
                return (
                  <button className="btn primary" disabled={o} onClick={addToOrder}>
                    {o ? (active.stock === "out" ? "Out of stock" : "Not enough stock") : "Add to order"}
                  </button>
                );
              })()}
              <a className="btn ghost" style={{marginTop:10}} href={wa(`Hi Dong Prime, I would like to ask about ${active.name}.`)} target="_blank" rel="noreferrer">
                <MessageCircle size={16}/>Ask about this on WhatsApp
              </a>
            </section>
          )}

          {view === "auth" && (
            <section className="screen">
              <button className="back" onClick={() => go(afterAuth === "order" ? "order" : "home")}><ArrowLeft size={15}/>Back</button>
              <h2 className="title" style={{fontSize:24}}>{authTab === "login" ? "Welcome back" : "Create account"}</h2>
              <p className="subtitle">{authTab === "login" ? "Log in to your account." : "Join Dong Prime Peptides."}</p>

              {authTab === "login" && <div className="detail-art" style={{minHeight:170,marginTop:16}}><ProductVial product={PRODUCTS[1]} size={88} hero /></div>}

              <div className="tabs">
                <button className={authTab === "login" ? "tab active" : "tab"} onClick={() => { setAuthTab("login"); setAuthMsg(null); }}>Log in</button>
                <button className={authTab === "signup" ? "tab active" : "tab"} onClick={() => { setAuthTab("signup"); setAuthMsg(null); }}>Sign up</button>
              </div>

              {authTab === "signup" && (
                <>
                  <div className="field"><label><User size={12}/>Full name</label><input value={af.name} placeholder="Enter your full name" onChange={(e) => setAf({...af, name:e.target.value})}/></div>
                  <div className="field"><label><Phone size={12}/>Mobile number</label><input value={af.phone} placeholder="+63 9XX XXX XXXX" onChange={(e) => setAf({...af, phone:e.target.value})}/></div>
                </>
              )}
              <div className="field"><label><Mail size={12}/>Email</label><input value={af.email} placeholder="Enter your email" onChange={(e) => setAf({...af, email:e.target.value})}/></div>
              <div className="field"><label><Lock size={12}/>Password</label><input type="password" value={af.password} placeholder={authTab === "login" ? "Enter your password" : "Create a password"} onChange={(e) => setAf({...af, password:e.target.value})}/></div>

              {authTab === "signup" && (
                <>
                  <div className="section-label">Default delivery address <span style={{color:"var(--muted)",letterSpacing:0,textTransform:"none"}}>(optional)</span></div>
                  <AddressFields addr={signupAddr} setAddr={setSignupAddr} />
                </>
              )}

              {authMsg && (
                <div className="notice" style={{
                  marginTop:14, marginBottom:0,
                  borderColor: authMsg.type === "error" ? "rgba(195,86,86,.5)" : "var(--line)",
                  color: authMsg.type === "error" ? "#E79A9A" : "var(--gold2)",
                  background: authMsg.type === "error" ? "rgba(195,86,86,.08)" : "rgba(200,146,42,.06)",
                }}>
                  {authMsg.text}
                </div>
              )}

              <button className="btn primary" style={{marginTop:14}} disabled={authBusy} onClick={authTab === "login" ? doLogin : doSignup}>
                {authBusy
                  ? (authTab === "login" ? "Logging in…" : "Creating account…")
                  : (authTab === "login" ? "Log in" : "Create account")}
              </button>
              <button className="link" style={{display:"block",margin:"16px auto 0"}} onClick={() => go("home")}>Continue as guest</button>
              <div className="footer-note">Your password is securely stored by Supabase Auth. We never see it.</div>
            </section>
          )}

          {view === "account" && (
            <section className="screen">
              <button className="back" onClick={() => go("home")}><ArrowLeft size={15}/>Home</button>
              {user ? (
                <>
                  <h2 className="title" style={{fontSize:24}}>Hi, <span className="gold">{user.name}</span></h2>
                  <div className="notice" style={{marginTop:16}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}><Phone size={14}/>{user.phone}</div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}><Mail size={14}/>{user.email}</div>
                    {user.savedAddress && <div style={{display:"flex",gap:8,alignItems:"flex-start"}}><MapPin size={14}/>{fmtAddr(user.savedAddress)}</div>}
                  </div>

                  <div className="section-label">My orders</div>
                  {recentOrders.length === 0 ? (
                    <div className="notice">No orders yet. Your orders will appear here after you place one.</div>
                  ) : recentOrders.map((o) => (
                    <button className="product-card" key={o.id} onClick={() => openTrack(o)}>
                      <div className="thumb"><ProductThumb product={itemProduct(o.items[0] || {})} size={42}/></div>
                      <div style={{flex:1}}>
                        <div className="pname">{o.id}</div>
                        <div className="pdesc">{o.placedAt} · {o.items.length} item(s)</div>
                      </div>
                      <div className="stock" style={{color:"var(--gold2)"}}>View</div>
                      <ChevronRight size={16} color="var(--gold2)"/>
                    </button>
                  ))}
                  <button className="btn ghost" style={{marginTop:14}} onClick={logout}><LogOut size={16}/>Log out</button>
                </>
              ) : (
                <>
                  <h2 className="title" style={{fontSize:24}}>Account</h2>
                  <p className="subtitle">Log in to autofill order details and see recent requests.</p>
                  <button className="btn primary" style={{marginTop:16}} onClick={() => { setAfterAuth("account"); setAuthTab("login"); go("auth"); }}>Log in</button>
                </>
              )}
            </section>
          )}

          {view === "order" && (
            <section className="screen">
              <button className="back" onClick={() => go("shop")}><ArrowLeft size={15}/>Catalog</button>
              <h2 className="title" style={{fontSize:24}}>Order request</h2>
              <p className="subtitle">This is a request, not a final order. We confirm price, stock, and total on WhatsApp before payment.</p>

              {user ? (
                <div className="banner"><span>Filling as <b style={{color:"var(--gold2)"}}>{user.name}</b></span><button className="link" onClick={logout}>Not you?</button></div>
              ) : (
                <div className="banner"><span>Have an account?</span><button className="link" onClick={() => { setAfterAuth("order"); setAuthTab("login"); go("auth"); }}>Log in to autofill</button></div>
              )}

              <div className="section-label">Items</div>
              {sel.length === 0 ? (
                <div className="notice">No items added yet. Add from the catalog, or describe what you want in the notes below.</div>
              ) : (
                sel.map((i) => (
                  <div className="order-item" key={i.key}>
                    <div className="thumb"><ProductThumb product={itemProduct(i)} size={39}/></div>
                    <div style={{flex:1}}>
                      <div className="pname">{i.name}</div>
                      <div className="pdesc">{fmtDisplay(i.format)} · {peso(i.price)}</div>
                    </div>
                    <div className="stepper">
                      <button onClick={() => bump(i.key, -1)}><Minus size={13}/></button>
                      <span>{i.qty}</span>
                      <button onClick={() => bump(i.key, 1)}><Plus size={13}/></button>
                    </div>
                  </div>
                ))
              )}

              <button className="btn ghost" style={{marginTop:12}} onClick={() => go("shop")}><Plus size={16}/>Add more from catalog</button>

              <div className="section-label">Your details</div>
              <div className="field"><label><User size={12}/>Full name</label><input value={cust.name} placeholder="Juan dela Cruz" onChange={(e) => setCust({...cust, name:e.target.value})}/></div>
              <div className="field"><label><Phone size={12}/>Mobile number</label><input value={cust.phone} placeholder="+63 917 000 0000" onChange={(e) => setCust({...cust, phone:e.target.value})}/></div>
              <div className="field"><label><Mail size={12}/>Email <span>(for confirmation & tracking)</span></label><input value={cust.email} placeholder="you@email.com" onChange={(e) => setCust({...cust, email:e.target.value})}/></div>

              <div className="section-label">Delivery method</div>
              {[
                { k:"courier", I:Truck, t:"Courier delivery", d:"J&T / LBC — fee & ETA confirmed on chat" },
                { k:"cod", I:Package, t:"Cash on delivery", d:"Pay the rider on arrival where available" },
              ].map(({k,I,t,d}) => (
                <button key={k} className={delivery === k ? "opt active" : "opt"} onClick={() => pickDelivery(k)}>
                  <div className="opt-ic"><I size={18}/></div>
                  <div style={{flex:1,textAlign:"left"}}>
                    <div className="pname">{t}</div>
                    <div className="pdesc">{d}</div>
                  </div>
                  <div className="radio">{delivery === k && <Check size={12}/>}</div>
                </button>
              ))}

              <div className="section-label">Delivery address</div>
              {user?.savedAddress && (
                <div className="banner">
                  <span>Use saved address?</span>
                  <button className="link" onClick={() => { setUseSaved(!useSaved); if (!useSaved) setAddr(user.savedAddress); }}>{useSaved ? "Using saved" : "Use saved"}</button>
                </div>
              )}
              <AddressFields addr={addr} setAddr={setAddr} />

              <div className="section-label">Payment method</div>
              {payOptions.map((k) => (
                <button key={k} className={payPref === k ? "opt active" : "opt"} onClick={() => setPayPref(k)}>
                  <div className="opt-ic">{k === "gcash" ? <WalletCards size={18}/> : k === "cash" ? <Package size={18}/> : <CreditCard size={18}/>}</div>
                  <div style={{flex:1,textAlign:"left"}}><div className="pname">{PAY_LABELS[k].t}</div><div className="pdesc">{PAY_LABELS[k].d}</div></div>
                  <div className="radio">{payPref === k && <Check size={12}/>}</div>
                </button>
              ))}
              {payPref === "bank" && (
                <div className="notice" style={{marginTop:8}}>
                  <b style={{color:"var(--gold2)"}}>Bank transfer</b><br/>
                  Transfer to account <b style={{color:"var(--ink)"}}>{BANK_ACCOUNT}</b>, then upload your deposit photo on the tracking page after ordering.
                </div>
              )}

              <div className="field"><label>Notes / special requests</label><textarea value={notes} placeholder="Type your request..." onChange={(e) => setNotes(e.target.value)}/></div>

              <button className="check-line" style={{background:"transparent",border:0,textAlign:"left"}} onClick={() => setAgree(!agree)}>
                <span className={agree ? "check-box on" : "check-box"}>{agree && <Check size={13}/>}</span>
                <span>I confirm I am 18 or older, this is for personal, cosmetic, or research use, and I have read the privacy & policies.</span>
              </button>

              <button className="btn primary" disabled={!validOrder} onClick={() => go("review")}>Review order <ChevronRight size={16}/></button>
              {!validOrder && <div className="footer-note">Add at least one item, fill your details and address, and tick the confirmation.</div>}
            </section>
          )}

          {view === "review" && (
            <section className="screen">
              <button className="back" onClick={() => go("order")}><ArrowLeft size={15}/>Edit order</button>
              <h2 className="title" style={{fontSize:24}}>Review & confirm</h2>
              <p className="subtitle">Please check everything before sending your request.</p>

              <div className="section-label">Items</div>
              {sel.map((i) => (
                <div className="review-item" key={i.key}>
                  <div className="thumb"><ProductThumb product={itemProduct(i)} size={36}/></div>
                  <div style={{flex:1}}><div className="pname">{i.name}</div><div className="pdesc">{fmtDisplay(i.format)} × {i.qty}</div></div>
                  <div className="price">{peso(i.price * i.qty)}</div>
                </div>
              ))}

              <div className="section-label">Summary</div>
              <div className="review-row"><span>Subtotal ({count} item{count > 1 ? "s" : ""})</span><b>{peso(subtotal)}</b></div>
              <div className="review-row"><span>Shipping / delivery</span><b>{SHIPPING ? peso(SHIPPING) : "Confirmed on chat"}</b></div>
              <div className="review-row"><span>Total shown</span><b>{peso(total)}</b></div>

              <div className="section-label">Your details</div>
              <div className="review-row"><span>Name</span><b>{cust.name}</b></div>
              <div className="review-row"><span>Phone</span><b>{cust.phone}</b></div>
              <div className="review-row"><span>Email</span><b>{cust.email}</b></div>

              <div className="section-label">Deliver to</div>
              <div className="review-row"><span>Address</span><b>{fmtAddr(effAddr)}</b></div>

              <div className="review-row"><span>Delivery</span><b>{delivery === "cod" ? "Cash on delivery" : "Courier delivery"}</b></div>
              <div className="review-row"><span>Payment</span><b>{PAY_LABELS[payPref]?.t || payPref}</b></div>
              {payPref === "bank" && <div className="review-row"><span>Bank account</span><b>{BANK_ACCOUNT}</b></div>}
              {notes && <div className="review-row"><span>Notes</span><b>{notes}</b></div>}

              <div className="notice" style={{marginTop:16}}>
                Submitting sends a request only. We will reply on WhatsApp with the final price, stock, and total before you pay anything.
              </div>
              <button className="btn primary" onClick={confirmOrder}>Submit request</button>
            </section>
          )}

          {view === "done" && activeOrder && (
            <section className="screen">
              <button className="back" onClick={() => go("home")}><ArrowLeft size={15}/>Home</button>
              <div className="success">
                <div className="success-icon"><Check size={34}/></div>
                <h2 className="title" style={{fontSize:24}}>Request received</h2>
                <p className="subtitle" style={{marginTop:6}}>Order {activeOrder.id}</p>
                <span className="pill">Received</span>
              </div>

              <div className="notice" style={{display:"flex",gap:12,alignItems:"center"}}>
                <div className="thumb" style={{width:64,minWidth:64,height:70}}><ProductThumb product={itemProduct(activeOrder.items[0])} size={44}/></div>
                <div>
                  <b style={{color:"var(--gold2)"}}>What happens next</b>
                  <p style={{marginTop:6}}>{activeOrder.payPref === "cash"
                    ? "We will confirm the price, stock, and total on WhatsApp. Pay the rider in cash on delivery."
                    : activeOrder.payPref === "bank"
                      ? `We will confirm your total. Transfer to ${BANK_ACCOUNT}, then upload your deposit photo on the tracking page.`
                      : "We will confirm your total and send GCash details. After paying, upload your receipt on the tracking page."}
                  </p>
                </div>
              </div>

              <div className="notice">
                Save your order number <b style={{color:"var(--ink)"}}>{activeOrder.id}</b> to track this order anytime.{user ? " You can also find it under My Orders." : " We'll follow up on WhatsApp."}
              </div>

              <button className="btn primary" onClick={() => openTrack(activeOrder)}>Track this order <ChevronRight size={16}/></button>
              <a className="btn ghost" style={{marginTop:10}} href={wa(`Hi Dong Prime, I submitted order ${activeOrder.id}.`)} target="_blank" rel="noreferrer">
                <MessageCircle size={16}/>Message us on WhatsApp
              </a>
            </section>
          )}

          {view === "track" && (
            <section className="screen">
              {!activeOrder ? (
                <>
                  <button className="back" onClick={() => go("home")}><ArrowLeft size={15}/>Home</button>
                  <h2 className="title" style={{fontSize:24}}>{user ? "My orders" : "Track order"}</h2>
                  <p className="subtitle">
                    {user ? "Tap an order to see its current status." : "Enter your order number from your confirmation, or pick a recent order."}
                  </p>

                  {recentOrders.length > 0 && (
                    <>
                      {user && <div className="section-label">Your orders</div>}
                      {recentOrders.map((o) => (
                        <button className="product-card" key={o.id} onClick={() => openTrack(o)}>
                          <div className="thumb"><ProductThumb product={itemProduct(o.items[0] || {})} size={42}/></div>
                          <div style={{flex:1}}><div className="pname">{o.id}</div><div className="pdesc">{o.placedAt} · {o.delivery}</div></div>
                          <ChevronRight size={16} color="var(--gold2)"/>
                        </button>
                      ))}
                    </>
                  )}

                  <div className="section-label">Track by order number</div>
                  <div className="field">
                    <label><Search size={12}/>Order number</label>
                    <input value={trackInput} placeholder="Enter order number" onChange={(e) => setTrackInput(e.target.value)} />
                  </div>
                  <button className="btn primary" onClick={lookup}>Track order</button>
                  {trackMsg && <div className="notice" style={{marginTop:12,borderColor:"rgba(195,86,86,.5)",color:"#E79A9A",background:"rgba(195,86,86,.08)"}}>{trackMsg}</div>}

                  {recentOrders.length === 0 && (
                    <div className="badge-grid">
                      <div className="mini-card"><ShieldCheck size={20}/><h4>Secure Checkout</h4><p>Clear confirmation flow.</p></div>
                      <div className="mini-card"><Package size={20}/><h4>Discreet Packaging</h4><p>Private and careful handling.</p></div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button className="back" onClick={() => setActiveOrder(null)}><ArrowLeft size={15}/>Back</button>
                  <h2 className="title" style={{fontSize:24}}>Track order</h2>
                  <p className="subtitle">Order {activeOrder.id}</p>

                  {activeOrder.cancelled ? (
                    <div style={{marginTop:20}}>
                      <div className="track-step">
                        <div className="track-left">
                          <div className="track-dot" style={{background:"#C35656",borderColor:"#C35656",color:"#fff"}}>✕</div>
                          {activeOrder.refunded && <div className="track-bar done" style={{background:"#C35656"}} />}
                        </div>
                        <div className="track-body current">
                          <h4 style={{color:"#E79A9A"}}>Cancelled</h4>
                          <p>This order was cancelled.{!activeOrder.refunded && " If this is unexpected, please message us on WhatsApp."}</p>
                        </div>
                      </div>
                      {activeOrder.refunded && (
                        <div className="track-step">
                          <div className="track-left">
                            <div className="track-dot done" style={{background:"#C35656",borderColor:"#C35656",color:"#fff"}}><Check size={13}/></div>
                          </div>
                          <div className="track-body current">
                            <h4 style={{color:"#E79A9A"}}>Refunded</h4>
                            <p>Your payment has been returned. Please allow a little time for it to reflect.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                  <>
                  {activeOrder.cancelRequested && (
                    <div className="notice" style={{marginTop:18,borderColor:"var(--line)",color:"var(--gold2)",background:"rgba(200,146,42,.06)"}}>
                      {activeOrder.refundable
                        ? "Refund requested — we'll review and follow up shortly."
                        : "Cancellation requested — we'll confirm and process any refund shortly."}
                    </div>
                  )}
                  <div style={{marginTop:20}}>
                    {activeOrder.steps.map((s, i) => {
                      const done = i < activeOrder.step;
                      const current = i === activeOrder.step;
                      return (
                        <div className="track-step" key={s.t}>
                          <div className="track-left">
                            <div className={done ? "track-dot done" : current ? "track-dot current" : "track-dot"}>
                              {done ? <Check size={13}/> : i + 1}
                            </div>
                            {i < activeOrder.steps.length - 1 && <div className={done ? "track-bar done" : "track-bar"} />}
                          </div>
                          <div className={current ? "track-body current" : "track-body"}>
                            <h4>{s.t}</h4>
                            <p>{s.d}</p>

                            {current && s.upload && (
                              <label className={proof ? "upload has" : "upload"} style={{cursor:"pointer"}}>
                                <Upload size={18}/>
                                {proofBusy ? "Uploading…" : proof ? "Receipt uploaded ✓" : "Upload receipt / proof of payment"}
                                <small>PNG, JPG or PDF max 10MB</small>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  style={{display:"none"}}
                                  disabled={proofBusy}
                                  onChange={(e) => handleProofUpload(e.target.files?.[0])}
                                />
                              </label>
                            )}

                            {current && s.ship && (
                              <div className="track-box">
                                Courier: <b style={{color:"var(--ink)"}}>{activeOrder.courier}</b>
                                {activeOrder.trackingNo && <><br/>Tracking no.: <b style={{color:"var(--ink)"}}>{activeOrder.trackingNo}</b></>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!activeOrder.cancelRequested && activeOrder.refundable && (
                    <a className="btn ghost" style={{marginTop:6}}
                       href={wa(`Hi Dong Prime, I want to request a refund for order ${activeOrder.id}.`)}
                       target="_blank" rel="noreferrer" onClick={handleRefundRequest}>
                      <MessageCircle size={16}/>Request refund
                    </a>
                  )}
                  {!activeOrder.cancelRequested && activeOrder.cancellable && (
                    <button className="btn ghost" style={{marginTop:6}} onClick={handleCancelRequest}>Request cancellation</button>
                  )}
                  </>
                  )}

                  <a className="btn ghost" href={wa(`Hi Dong Prime, I want to ask about order ${activeOrder.id}.`)} target="_blank" rel="noreferrer">
                    <MessageCircle size={16}/>Ask about this order
                  </a>
                  <button className="link" style={{display:"block",margin:"14px auto 0"}} onClick={() => setActiveOrder(null)}>Track another order</button>
                </>
              )}
            </section>
          )}

          {view === "policy" && (
            <section className="screen">
              <button className="back" onClick={() => go("home")}><ArrowLeft size={15}/>Home</button>
              <h2 className="title" style={{fontSize:24}}>Policies & information</h2>
              <p className="subtitle">Everything you need to know.</p>

              <div className="policy-list">
                <div className="policy-item"><FlaskConical/><div><h4>Research Use Only</h4><p>All products are for laboratory research only. Not for human or veterinary consumption.</p></div><ChevronRight size={16}/></div>
                <div className="policy-item"><ClipboardList/><div><h4>Ordering Process</h4><p>Orders are confirmed via WhatsApp with final price, stock, and total before payment.</p></div><ChevronRight size={16}/></div>
                <div className="policy-item"><Shield/><div><h4>Privacy</h4><p>We collect only what is needed to process and deliver your request. Your data is kept private and secure.</p></div><ChevronRight size={16}/></div>
                <div className="policy-item"><Truck/><div><h4>Shipping</h4><p>Delivery times depend on your location and courier availability. Discreet handling is prioritized.</p></div><ChevronRight size={16}/></div>
                <div className="policy-item"><Headphones/><div><h4>Support</h4><p>Questions or concerns? Contact us on WhatsApp during business hours.</p></div><ChevronRight size={16}/></div>
              </div>

              <a className="btn ghost" style={{marginTop:18}} href={wa("Hi Dong Prime, I have a question about your policies.")} target="_blank" rel="noreferrer">
                <MessageCircle size={16}/>Contact us on WhatsApp
              </a>
            </section>
          )}
        </main>

        <nav className="nav">
          <NavItem id="home" label="Home" Icon={Home}/>
          <NavItem id="shop" label="Shop" Icon={LayoutGrid}/>
          <NavItem id="orders" label="Orders" Icon={ClipboardList}/>
          <NavItem id="whatsapp" label="WhatsApp" Icon={MessageCircle} href={wa("Hi Dong Prime, I have a question.")}/>
          <NavItem id="account" label="Account" Icon={User}/>
        </nav>
      </div>
    </div>
  );
}
