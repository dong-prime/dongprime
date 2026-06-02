/**
 * Dong Prime Peptides — Google Sheets ↔ Supabase sync
 *
 * Paste this into the Sheet's Apps Script editor (Extensions → Apps Script).
 * Then set two Script Properties (Project Settings → Script Properties):
 *   SUPABASE_URL = https://ovxhiclfsboqhmyfgfip.supabase.co
 *   SERVICE_KEY  = <your service_role key>   ← NEVER put this in the website
 *
 * Sheets expected (tab names): "Orders", "Products"
 *
 * Directions:
 *   Orders   : DB  → Sheet   (pullOrders, every 5 min)   — read-only view
 *   Products : Sheet → DB    (onEditProducts, live)       — edit price/stock here
 *
 * One-time setup: run setup() once and authorize.
 */

function cfg_() {
  var p = PropertiesService.getScriptProperties();
  return { url: p.getProperty('SUPABASE_URL'), key: p.getProperty('SERVICE_KEY') };
}

function headers_() {
  var c = cfg_();
  return { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' };
}

/** Run once. Loads Products, fills Orders, and installs the triggers. */
function setup() {
  pullProducts();
  pullOrders();
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('pullOrders').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('onEditProducts').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  SpreadsheetApp.getActive().toast('Setup done: Orders auto-refresh every 5 min, Products edits push to the site.');
}

/** Orders: Supabase → "Orders" sheet (read-only view, rewritten each run). */
function pullOrders() {
  var c = cfg_();
  var res = UrlFetchApp.fetch(c.url + '/rest/v1/orders?select=*&order=created_at.desc', {
    headers: headers_(), muteHttpExceptions: true,
  });
  var rows = JSON.parse(res.getContentText());
  var sh = SpreadsheetApp.getActive().getSheetByName('Orders');
  var header = ['order_code', 'created_at', 'name', 'phone', 'email', 'items', 'delivery', 'payment', 'address', 'total', 'step', 'proof'];
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  if (!rows.length) return;
  var data = rows.map(function (o) {
    var items = (o.items || []).map(function (i) { return i.qty + 'x ' + i.name; }).join(', ');
    var addr = o.address
      ? [o.address.street, o.address.barangay, o.address.city, o.address.region].filter(Boolean).join(', ')
      : (o.meet ? ('Meetup: ' + (o.meet.place || '') + ' ' + (o.meet.when || '')) : '');
    var cu = o.customer || {};
    return [o.order_code, o.created_at, cu.name || '', cu.phone || '', cu.email || '',
            items, o.delivery || '', o.pay_pref || '', addr, o.total || 0, o.step || 0, o.proof_url || ''];
  });
  sh.getRange(2, 1, data.length, header.length).setValues(data);
}

/** Products: Supabase → "Products" sheet. Run to (re)load the editable list. */
function pullProducts() {
  var c = cfg_();
  var res = UrlFetchApp.fetch(c.url + '/rest/v1/products?select=id,name,price,active,inventory(qty)&order=sort_order', {
    headers: headers_(), muteHttpExceptions: true,
  });
  var rows = JSON.parse(res.getContentText());
  var sh = SpreadsheetApp.getActive().getSheetByName('Products');
  var header = ['id', 'name', 'price', 'stock_qty', 'active'];
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  var data = rows.map(function (p) {
    var inv = p.inventory;
    var qty = Array.isArray(inv) ? (inv[0] ? inv[0].qty : '') : (inv && inv.qty != null ? inv.qty : '');
    return [p.id, p.name, p.price, qty, p.active];
  });
  if (data.length) sh.getRange(2, 1, data.length, header.length).setValues(data);
}

/** Products: "Products" sheet edit → Supabase (price/name/active + inventory qty). */
function onEditProducts(e) {
  var sh = e.range.getSheet();
  if (sh.getName() !== 'Products') return;
  var row = e.range.getRow();
  if (row < 2) return; // skip header
  var c = cfg_();
  var v = sh.getRange(row, 1, 1, 5).getValues()[0]; // id,name,price,stock_qty,active
  var id = v[0];
  if (!id) return;

  // products: name, price, active
  UrlFetchApp.fetch(c.url + '/rest/v1/products?id=eq.' + encodeURIComponent(id), {
    method: 'patch', headers: headers_(), muteHttpExceptions: true,
    payload: JSON.stringify({
      name: v[1],
      price: Number(v[2]) || 0,
      active: (v[4] === true || String(v[4]).toLowerCase() === 'true'),
    }),
  });

  // inventory: qty (upsert; DB trigger then refreshes the in/low/out label)
  if (v[3] !== '' && v[3] !== null) {
    UrlFetchApp.fetch(c.url + '/rest/v1/inventory', {
      method: 'post',
      headers: Object.assign({ Prefer: 'resolution=merge-duplicates' }, headers_()),
      muteHttpExceptions: true,
      payload: JSON.stringify({ product_id: id, qty: Number(v[3]) || 0 }),
    });
  }
  SpreadsheetApp.getActive().toast('Synced "' + id + '" to the site.');
}
