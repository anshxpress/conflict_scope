import { INDIAN_CITIES, INDIAN_STATES, type LocationInfo } from "./location-dictionary";
import { geocodeLocation } from "../geocoding/nominatim";
import nlp from "compromise";

const STATE_COORDS: Record<string, [number, number]> = {
  "maharashtra": [19.7515, 75.7139],
  "karnataka": [15.3173, 75.7139],
  "tamil nadu": [11.1271, 78.6569],
  "telangana": [18.1124, 79.0193],
  "delhi": [28.7041, 77.1025],
  "west bengal": [22.9868, 87.8550],
  "gujarat": [22.2587, 71.1924],
  "rajasthan": [27.0238, 74.2179],
  "uttar pradesh": [26.8467, 80.9462],
  "bihar": [25.0961, 85.3131],
  "jharkhand": [23.6102, 85.2799],
  "madhya pradesh": [22.9734, 78.6569],
  "chhattisgarh": [21.2787, 81.8661],
  "odisha": [20.9517, 85.0985],
  "assam": [26.2006, 92.9376],
  "punjab": [31.1471, 75.3412],
  "haryana": [29.0588, 76.0856],
  "jammu and kashmir": [33.7782, 76.5762],
  "kerala": [10.8505, 76.2711],
  "uttarakhand": [30.0668, 79.0193],
  "goa": [15.2993, 74.1240],
  "himachal pradesh": [31.1048, 77.1734],
};

/**
 * Normalise strings for case-insensitive matching
 */
function cleanText(text: string): string {
  return (text || "").toLowerCase().replace(/[^\w\s]/g, " ").trim();
}

/**
 * Extract structured location hierarchy from article text
 */
export async function extractLocation(
  title: string,
  description: string,
  body: string
): Promise<LocationInfo | null> {
  const combinedText = `${title} ${description} ${body}`;
  const cleaned = cleanText(combinedText);

  // 1. Direct Indian City Lookup (High Priority)
  for (const [cityKey, info] of Object.entries(INDIAN_CITIES)) {
    const regex = new RegExp(`\\b${cityKey}\\b`, "i");
    if (regex.test(cleaned)) {
      console.log(`[LocationEngine] Local dictionary match: City "${info.city}" in "${info.state}"`);
      return { ...info };
    }
  }

  // 2. Direct Indian State Lookup (Medium Priority)
  for (const stateName of INDIAN_STATES) {
    const regex = new RegExp(`\\b${stateName}\\b`, "i");
    if (regex.test(cleaned)) {
      const coords = STATE_COORDS[stateName] || [20.5937, 78.9629]; // Fallback to center of India
      const formattedState = stateName
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      console.log(`[LocationEngine] Local dictionary match: State "${formattedState}"`);
      return {
        city: "",
        district: "",
        state: formattedState,
        country: "India",
        latitude: coords[0],
        longitude: coords[1],
      };
    }
  }

  // 3. Fallback: Parse place entities with compromise.js and geocode via OSM Nominatim
  try {
    const doc = nlp(title + " " + description);
    const places = doc.places().out("array") as string[];
    
    // De-duplicate and filter out short tokens
    const candidates = Array.from(new Set(places))
      .map(p => p.trim())
      .filter(p => p.length > 2)
      .slice(0, 3); // Take first 3 candidates to avoid rate-limiting

    for (const place of candidates) {
      console.log(`[LocationEngine] Attempting geocoding for NER candidate: "${place}"`);
      const geoResult = await geocodeLocation(place);
      if (geoResult) {
        const isIndia = 
          geoResult.country.toLowerCase().includes("india") || 
          geoResult.displayName.toLowerCase().includes("india") ||
          geoResult.address?.country?.toLowerCase() === "india";

        if (isIndia) {
          const addr = geoResult.address;
          const city = addr?.city || addr?.town || addr?.village || addr?.suburb || addr?.municipality || "";
          const district = addr?.state_district || addr?.county || "";
          const state = addr?.state || "";
          
          console.log(`[LocationEngine] Geocoded Indian location: ${city}, ${district}, ${state}`);
          return {
            city,
            district,
            state,
            country: "India",
            latitude: geoResult.latitude,
            longitude: geoResult.longitude,
          };
        } else {
          // International location
          console.log(`[LocationEngine] Geocoded International location: Country "${geoResult.country}"`);
          return {
            city: geoResult.address?.city || geoResult.address?.town || "",
            district: "",
            state: geoResult.address?.state || "",
            country: geoResult.country,
            latitude: geoResult.latitude,
            longitude: geoResult.longitude,
          };
        }
      }
    }
  } catch (err) {
    console.error("[LocationEngine] Geocoding fallback chain failed:", err);
  }

  // 4. Default National Fallback if India is mentioned anywhere
  if (cleaned.includes("india") || cleaned.includes("indian")) {
    return {
      city: "",
      district: "",
      state: "",
      country: "India",
      latitude: 20.5937,
      longitude: 78.9629,
    };
  }

  // 5. Ultimate global fallback (Null, signifying no location found)
  return null;
}
