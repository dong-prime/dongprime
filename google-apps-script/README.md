# Google Sheets ↔ Supabase sync

Two-way sync between the admin Google Sheet and the Supabase database.

| Data | Direction | Behaviour |
|------|-----------|-----------|
| Orders | DB → Sheet | `Orders` tab auto-refreshes every 5 min (read-only view) |
| Stock movements | DB → Sheet | `Movements` tab — sales + manual adjustments ledger (read-only, optional tab) |
| Products / inventory | Sheet → DB | Editing `Products` tab pushes to the live site instantly; qty changes are logged to `Movements` |

## Setup (once)

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Delete the default `Code.gs` content and paste in `Code.gs` from this folder.
3. **Project Settings** (gear icon) → **Script Properties** → add two:
   - `SUPABASE_URL` = `https://ovxhiclfsboqhmyfgfip.supabase.co`
   - `SERVICE_KEY` = the **service_role** key (Supabase → Project Settings → API → `service_role`).
     ⚠️ This key bypasses security. It lives ONLY here (Google's servers), never in the website or GitHub.
4. Make sure the spreadsheet has tabs named exactly **`Orders`**, **`Products`**, and (optional) **`Movements`**.
5. Back in the editor, select the `setup` function and click **Run**. Authorize when prompted.
   - This loads the products, fills the orders, and installs the triggers.

## Day-to-day

- **See orders:** open the `Orders` tab — it refreshes itself every 5 minutes
  (or run `pullOrders` for an instant refresh). This tab is overwritten each run,
  so don't add your own notes here.
- **Change a price or stock:** edit the `price` / `stock_qty` / `active` cell in the
  `Products` tab. It syncs to the site within a second. Don't edit the `id` column.
- **Add a brand-new product:** add it in Supabase first (it needs an `id`), then run
  `pullProducts` to pull it into the sheet.
