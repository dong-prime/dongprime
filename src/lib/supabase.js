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
  };
}

// Fetch active products ordered for display. Returns [] if Supabase is not
// configured or the query fails (caller keeps its fallback list).
export async function fetchProducts() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("fetchProducts failed:", error.message);
    return [];
  }
  return (data || []).map(rowToProduct);
}
