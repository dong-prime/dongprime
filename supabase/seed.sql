-- ============================================================================
-- Dong Prime Peptides — seed catalog
-- Run AFTER schema.sql. Safe to re-run (upserts by id).
-- Mirrors the original hardcoded PRODUCTS array.
-- ============================================================================

insert into public.products
  (id, name, label_name, dose, focus, descr, detail, capacity, category, formats, stock, price, image_url, sort_order)
values
  ('tirzepatide-15mg', 'Tirzepatide 15 mg', 'TIRZEPATIDE', '15mg', 'Weight',
   'GLP-1/GIP dual agonist, 15 mg/mL',
   'Premium research-grade Tirzepatide supplied in a sealed vial for laboratory research use only. Commonly referenced in metabolic-pathway research involving GLP-1 and GIP receptor activity. Each vial is packaged for clean handling, discreet delivery, and catalog-based ordering.',
   '15 mg/mL · per vial', 'Weight / metabolic research',
   '{"Single vial","Box option"}', 'in', 3000, '/assets/tirzepatide-15mg.png', 1),

  ('retatrutide-20mg', 'Retatrutide 20 mg', 'RETATRUTIDE', '20mg', 'Weight',
   'Triple agonist (GLP-1/GIP/GCG), 20 mg',
   'Premium research-grade Retatrutide supplied in a sealed 20 mg vial for laboratory research use only. Designed for advanced metabolic-research discussions involving triple-hormone pathway interest: GLP-1, GIP, and glucagon receptor activity. Packaged with a luxury black-and-gold Dong Prime presentation.',
   '20 mg · per vial', 'Weight / triple-pathway research',
   '{"Single vial","Box option"}', 'in', 4000, '/assets/retatrutide-20mg.png', 2),

  ('klow-80mg', 'Klow 80 mg', 'KLOW', '80mg', 'Recovery',
   'Research compound',
   'Klow 80 mg is positioned as a premium research compound for catalog demonstration and research-use-only presentation. It is supplied in sealed packaging with a clean luxury vial identity, suitable for product-listing, order-flow, and educational demo use.',
   '80 mg · per vial', 'Recovery research',
   '{"Single vial","Box option"}', 'in', 3500, '/assets/klow-80mg.png', 3),

  ('ghk-cu-50mg', 'GHK-Cu 50 mg', 'GHK-CU', '50mg', 'Skin',
   'Copper peptide, skin & repair research',
   'Premium research-grade GHK-Cu supplied in a sealed 50 mg vial for laboratory research use only. Commonly referenced in cosmetic-science and repair-pathway research contexts. This catalog copy avoids medical claims and is intended for demo and educational product presentation only.',
   '50 mg · per vial', 'Skin / repair research',
   '{"Single vial","Box option"}', 'in', 2500, '/assets/ghk-cu-50mg.png', 4),

  ('nad-glutathione', 'NAD+ 250 mg / Glutathione 200 mg', 'NAD+ / GLUTATHIONE', '250mg / 200mg', 'Cellular',
   'Cellular energy & antioxidant research blend',
   'Premium research-use-only blend containing NAD+ 250 mg and Glutathione 200 mg. Presented for cellular-energy and antioxidant-pathway research discussions in a sealed vial format. No wellness, treatment, or performance claims are implied.',
   'NAD+ 250 mg / Glutathione 200 mg · per vial', 'Cellular / antioxidant research',
   '{"Single vial","Box option"}', 'in', 4000, '/assets/nad-glutathione.png', 5),

  ('cjc-ipa-5mg-5mg', 'CJC-1295 5 mg + Ipamorelin 5 mg', 'CJC-1295 + IPAMORELIN', '5mg + 5mg', 'Performance',
   'GHRH + GH secretagogue research blend',
   'Premium research-grade peptide blend containing CJC-1295 5 mg and Ipamorelin 5 mg. Presented for laboratory research discussions around GHRH and GH-secretagogue pathways. Supplied as a sealed research-use-only vial with discreet ordering support.',
   'CJC-1295 5 mg + Ipamorelin 5 mg · per vial', 'Performance / recovery research',
   '{"Single vial","Box option"}', 'in', 3500, '/assets/cjc-ipamorelin.png', 6)

on conflict (id) do update set
  name       = excluded.name,
  label_name = excluded.label_name,
  dose       = excluded.dose,
  focus      = excluded.focus,
  descr      = excluded.descr,
  detail     = excluded.detail,
  capacity   = excluded.capacity,
  category   = excluded.category,
  formats    = excluded.formats,
  stock      = excluded.stock,
  price      = excluded.price,
  image_url  = excluded.image_url,
  sort_order = excluded.sort_order;

-- Starting inventory quantities (the trigger will sync products.stock label).
-- Re-running keeps existing qty (does nothing on conflict). Adjust later in the
-- Supabase Table Editor → inventory.
insert into public.inventory (product_id, qty, low_stock_threshold) values
  ('tirzepatide-15mg', 20, 5),
  ('retatrutide-20mg', 20, 5),
  ('klow-80mg',        20, 5),
  ('ghk-cu-50mg',      20, 5),
  ('nad-glutathione',  20, 5),
  ('cjc-ipa-5mg-5mg',  20, 5)
on conflict (product_id) do nothing;
