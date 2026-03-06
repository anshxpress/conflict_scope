export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  country: string;
}

const NOMINATIM_BASE =
  process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";

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
    });

    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        "User-Agent": "ConflictScope/1.0 (OSINT Research Platform)",
        Accept: "application/json",
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
