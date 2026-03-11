export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  country: string;
}

const NOMINATIM_BASE =
  process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";

// ── Hardcoded strategic chokepoints ─────────────────────────────────────────
// Nominatim returns no result or wrong result for bodies of water — these
// ensure maritime events always get precise coordinates and a country label.
const CHOKEPOINT_COORDS: Record<string, GeocodingResult> = {
  "strait of hormuz": { latitude: 26.5667, longitude: 56.25, displayName: "Strait of Hormuz", country: "Iran" },
  "hormuz": { latitude: 26.5667, longitude: 56.25, displayName: "Strait of Hormuz", country: "Iran" },
  "bab el-mandeb": { latitude: 12.5833, longitude: 43.3167, displayName: "Bab el-Mandeb Strait", country: "Yemen" },
  "bab-el-mandeb": { latitude: 12.5833, longitude: 43.3167, displayName: "Bab el-Mandeb Strait", country: "Yemen" },
  "red sea": { latitude: 20.0, longitude: 38.5, displayName: "Red Sea", country: "Yemen" },
  "gulf of aden": { latitude: 12.0, longitude: 47.0, displayName: "Gulf of Aden", country: "Yemen" },
  "suez canal": { latitude: 30.4559, longitude: 32.5498, displayName: "Suez Canal", country: "Egypt" },
  "strait of malacca": { latitude: 2.5, longitude: 101.5, displayName: "Strait of Malacca", country: "Malaysia" },
  "persian gulf": { latitude: 26.5, longitude: 51.5, displayName: "Persian Gulf", country: "Iran" },
  "arabian sea": { latitude: 15.0, longitude: 65.0, displayName: "Arabian Sea", country: "Oman" },
  "south china sea": { latitude: 15.0, longitude: 115.0, displayName: "South China Sea", country: "Philippines" },
};

// Simple in-memory cache to respect Nominatim rate limits
const geocodeCache = new Map<string, GeocodingResult | null>();

// Rate limiter: max 1 request per second for Nominatim
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // ms

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed)
    );
  }
  lastRequestTime = Date.now();
}

/**
 * Geocode a location name to coordinates using OpenStreetMap Nominatim.
 */
export async function geocodeLocation(
  locationName: string
): Promise<GeocodingResult | null> {
  const cacheKey = locationName.toLowerCase().trim();

  // Check hardcoded chokepoints first — Nominatim can't geocode water bodies
  for (const [key, coords] of Object.entries(CHOKEPOINT_COORDS)) {
    if (cacheKey.includes(key)) {
      console.log(`[Geocode] Chokepoint match "${locationName}" → ${coords.latitude}, ${coords.longitude}`);
      return coords;
    }
  }

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    await rateLimit();

    const params = new URLSearchParams({
      q: locationName,
      format: "json",
      limit: "1",
      addressdetails: "1",
      "accept-language": "en",  // force English country names
    });

    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        "User-Agent": "ConflictScope/1.0 (OSINT Research Platform)",
        Accept: "application/json",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      console.warn(
        `[Geocode] HTTP ${response.status} for "${locationName}"`
      );
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const results = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: { country?: string };
    }>;

    if (!results.length) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const result: GeocodingResult = {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
      displayName: results[0].display_name,
      country: results[0].address?.country ?? locationName,
    };

    geocodeCache.set(cacheKey, result);
    console.log(
      `[Geocode] "${locationName}" → ${result.latitude}, ${result.longitude}`
    );
    return result;
  } catch (error) {
    console.error(`[Geocode] Error geocoding "${locationName}":`, error);
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Geocode multiple locations and return the first successful result.
 */
export async function geocodeFirstMatch(
  locations: string[]
): Promise<GeocodingResult | null> {
  for (const loc of locations) {
    const result = await geocodeLocation(loc);
    if (result) return result;
  }
  return null;
}
