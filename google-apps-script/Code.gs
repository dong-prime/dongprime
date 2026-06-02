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

/** Run once. Loads Products, fills the read-only tabs, installs the triggers. */
function setup() {
  pullProducts();
  refreshAll();
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('refreshAll').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('onEditRouter').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  SpreadsheetApp.getActive().toast('Setup done: Orders + Movements auto-refresh every 5 min; Products/Orders edits push to the site.');
}

/** Refresh all read-only views (called by the 5-min trigger). */
function refreshAll() {
  pullOrders();
  pullMovements();
  refreshStock();
}

/**
 * Update ONLY the stock_qty column (D) of the Products tab from the live
 * inventory, matched by id (column A). This keeps stock in sync after sales
 * without overwriting the name/price/active cells you edit. Script writes do
 * not fire onEditProducts, so there's no sync loop.
 */
function refreshStock() {
  var c = cfg_();
  var sh = SpreadsheetApp.getActive().getSheetByName('Products');
  if (!sh) return;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  var res = UrlFetchApp.fetch(c.url + '/rest/v1/inventory?select=product_id,qty', {
    headers: headers_(), muteHttpExceptions: true,
  });
  var inv = JSON.parse(res.getContentText());
  var map = {};
  inv.forEach(function (r) { map[r.product_id] = r.qty; });
  var ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  var out = ids.map(function (r) {
    var id = r[0];
    return [(id !== '' && map[id] != null) ? map[id] : ''];
  });
  sh.getRange(2, 4, out.length, 1).setValues(out); // column D = stock_qty
}

var ORDER_STATUSES = ['received', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];

/**
 * Orders: Supabase → "Orders" sheet. Rewritten each run.
 * Columns C (status) and D (tracking_no) are EDITABLE — editing them pushes
 * back to the DB (see onEditOrders). Everything else is read-only.
 */
function pullOrders() {
  var c = cfg_();
  var res = UrlFetchApp.fetch(c.url + '/rest/v1/orders?select=*&order=created_at.desc', {
    headers: headers_(), muteHttpExceptions: true,
  });
  var rows = JSON.parse(res.getContentText());
  var sh = SpreadsheetApp.getActive().getSheetByName('Orders');
  var header = ['order_code', 'created_at', 'status', 'tracking_no', 'name', 'phone', 'email', 'items', 'delivery', 'payment', 'address', 'total', 'notes', 'proof'];
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  if (!rows.length) return;
  var data = rows.map(function (o) {
    var items = (o.items || []).map(function (i) { return i.qty + 'x ' + i.name; }).join(', ');
    var addr = o.address
      ? [o.address.street, o.address.barangay, o.address.city, o.address.region].filter(Boolean).join(', ')
      : (o.meet ? ('Meetup: ' + (o.meet.place || '') + ' ' + (o.meet.when || '')) : '');
    var cu = o.customer || {};
    return [o.order_code, o.created_at, o.status || 'received', o.tracking_no || '', cu.name || '', cu.phone || '',
            cu.email || '', items, o.delivery || '', o.pay_pref || '', addr, o.total || 0, o.notes || '', o.proof_url || ''];
  });
  sh.getRange(2, 1, data.length, header.length).setValues(data);
  // status dropdown on column C
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(ORDER_STATUSES, true).build();
  sh.getRange(2, 3, data.length, 1).setDataValidation(rule);
}

/** Stock movements: Supabase → "Movements" sheet (read-only ledger). */
function pullMovements() {
  var c = cfg_();
  var sh = SpreadsheetApp.getActive().getSheetByName('Movements');
  if (!sh) return; // tab is optional
  var res = UrlFetchApp.fetch(c.url + '/rest/v1/stock_movements?select=*&order=created_at.desc&limit=500', {
    headers: headers_(), muteHttpExceptions: true,
  });
  var rows = JSON.parse(res.getContentText());
  var header = ['created_at', 'product_id', 'delta', 'reason', 'order_code', 'note'];
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  if (!rows.length) return;
  var data = rows.map(function (m) {
    return [m.created_at, m.product_id, m.delta, m.reason, m.order_code || '', m.note || ''];
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

/** Routes edit events to the right handler by sheet name. */
function onEditRouter(e) {
  var name = e.range.getSheet().getName();
  if (name === 'Products') onEditProducts(e);
  else if (name === 'Orders') onEditOrders(e);
}

/** Orders: editing status (col C) or tracking_no (col D) → Supabase. */
function onEditOrders(e) {
  var sh = e.range.getSheet();
  var row = e.range.getRow();
  var col = e.range.getColumn();
  if (row < 2 || (col !== 3 && col !== 4)) return; // only status / tracking_no
  var c = cfg_();
  var vals = sh.getRange(row, 1, 1, 4).getValues()[0]; // order_code, created_at, status, tracking_no
  var code = vals[0];
  if (!code) return;
  UrlFetchApp.fetch(c.url + '/rest/v1/orders?order_code=eq.' + encodeURIComponent(code), {
    method: 'patch', headers: headers_(), muteHttpExceptions: true,
    payload: JSON.stringify({ status: String(vals[2] || 'received'), tracking_no: vals[3] || null }),
  });
  SpreadsheetApp.getActive().toast('Order ' + code + ' updated.');
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

  // inventory: qty (upsert; DB trigger then refreshes the in/low/out label).
  // Also log the manual change to stock_movements as an 'adjustment'.
  if (v[3] !== '' && v[3] !== null) {
    var newQty = Number(v[3]) || 0;
    var cur = UrlFetchApp.fetch(c.url + '/rest/v1/inventory?product_id=eq.' + encodeURIComponent(id) + '&select=qty', {
      headers: headers_(), muteHttpExceptions: true,
    });
    var arr = JSON.parse(cur.getContentText());
    var oldQty = (arr && arr[0]) ? Number(arr[0].qty) : null;

    UrlFetchApp.fetch(c.url + '/rest/v1/inventory', {
      method: 'post',
      headers: Object.assign({ Prefer: 'resolution=merge-duplicates' }, headers_()),
      muteHttpExceptions: true,
      payload: JSON.stringify({ product_id: id, qty: newQty }),
    });

    if (oldQty !== null && newQty !== oldQty) {
      UrlFetchApp.fetch(c.url + '/rest/v1/stock_movements', {
        method: 'post', headers: headers_(), muteHttpExceptions: true,
        payload: JSON.stringify({ product_id: id, delta: newQty - oldQty, reason: 'adjustment', note: 'sheet edit' }),
      });
    }
  }
  SpreadsheetApp.getActive().toast('Synced "' + id + '" to the site.');
}
