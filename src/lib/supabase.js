import { createClient } from "@supabase/supabase-js";

// Public Supabase project values. The anon key is PUBLIC by design — it ships
// in the browser bundle on every build, and data is protected by Row Level
// Security, not by hiding this key. Env vars (e.g. on Vercel) override these.
// NEVER put the service_role / secret key here.
const DEFAULT_URL = "https://ovxhiclfsboqhmyfgfip.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92eGhpY2xmc2JvcWhteWZnZmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDA3MTgsImV4cCI6MjA5NTk3NjcxOH0.2Ls1WcGr7_n8Vuj9zv4xiLbzdIQBTgvLnqf9wOCz03M";

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

// `supabase` is null if env vars are missing — the app then falls back to its
// built-in catalog so it never crashes (e.g. a preview build without secrets).
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

// Map a DB row (snake_case) to the shape the UI already expects (camelCase).
function rowToProduct(r) {
  return {
    id: r.id,
    image: r.image_url,
    focus: r.focus,
    name: r.name,
    labelName: r.label_name,
    dose: r.dose,
    desc: r.descr,
    detail: r.detail,
    capacity: r.capacity,
    category: r.category,
    formats: r.formats || [],
    stock: r.stock,
    price: r.price,
    stockQty: Array.isArray(r.inventory)
      ? (r.inventory[0]?.qty ?? null)
      : (r.inventory?.qty ?? null),
  };
}

// Fetch active products ordered for display. Returns [] if Supabase is not
// configured or the query fails (caller keeps its fallback list).
export async function fetchProducts() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*, inventory(qty)")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("fetchProducts failed:", error.message);
    return [];
  }
  return (data || []).map(rowToProduct);
}

// ─── Auth ───────────────────────────────────────────────────────────────────

// Sign up. With "Confirm email" ON, the returned session is null until the user
// clicks the link in their email. Name/phone/address are saved into the auth
// user metadata, which the handle_new_user DB trigger copies into profiles.
export async function signUpUser({ email, password, name, phone, savedAddress }) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const data = { name: name || "", phone: phone || "" };
  if (savedAddress) data.saved_address = savedAddress;
  return supabase.auth.signUp({ email, password, options: { data } });
}

export async function signInUser({ email, password }) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutUser() {
  if (supabase) await supabase.auth.signOut();
}

// Read a user's profile row. Returns null if missing / not configured.
export async function getProfile(userId) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

// Build the app's `user` shape from an auth user + (optional) profile row.
export function toAppUser(authUser, profile) {
  const meta = authUser.user_metadata || {};
  const emailPrefix = (authUser.email || "").split("@")[0];
  return {
    id: authUser.id,
    name: profile?.name || meta.name || emailPrefix,
    phone: profile?.phone || meta.phone || "",
    email: authUser.email || "",
    savedAddress: profile?.saved_address || meta.saved_address || null,
  };
}

// ─── Orders ───────────────────────────────────────────────────────────────

// Create an order via the place_order RPC (also decrements stock server-side).
// Returns { data: orderRow } or { error }.
export async function placeOrder(payload) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { data, error } = await supabase.rpc("place_order", payload);
  return { data: Array.isArray(data) ? data[0] : data, error };
}

// Look up a single order by its DP-XXXXX code (works for guests).
export async function lookupOrder(code) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_order_by_code", { p_code: code });
  if (error) { console.error("lookupOrder failed:", error.message); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

// All orders for a logged-in user, newest first.
export async function fetchMyOrders(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchMyOrders failed:", error.message); return []; }
  return data || [];
}

// Customer asks to cancel an order (owner confirms + handles any refund).
export async function requestCancellation(code) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { error } = await supabase.rpc("request_cancellation", { p_code: code });
  return { error };
}

// Upload a payment receipt to the private bucket and attach it to the order.
export async function uploadPaymentProof(orderCode, file) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const ext = (file.name.split(".").pop() || "dat").toLowerCase();
  const path = `${orderCode}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { upsert: false });
  if (error) return { error };
  await supabase.rpc("attach_payment_proof", { p_code: orderCode, p_path: path });
  return { path };
}
