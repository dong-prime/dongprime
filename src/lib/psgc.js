// Philippine Standard Geographic Code (PSGC) address data.
// Public, CORS-enabled static API — full official list of regions,
// cities/municipalities and barangays. https://psgc.gitlab.io/api/
const BASE = "https://psgc.gitlab.io/api";
const byName = (a, b) => a.name.localeCompare(b.name);

async function getJson(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data.sort(byName) : [];
  } catch {
    return [];
  }
}

export const fetchRegions = () => getJson(`${BASE}/regions/`);
export const fetchCities = (regionCode) =>
  regionCode ? getJson(`${BASE}/regions/${regionCode}/cities-municipalities/`) : Promise.resolve([]);
export const fetchBarangays = (cityCode) =>
  cityCode ? getJson(`${BASE}/cities-municipalities/${cityCode}/barangays/`) : Promise.resolve([]);
