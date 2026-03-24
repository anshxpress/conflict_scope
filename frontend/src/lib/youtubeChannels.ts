// ============================
// YOUTUBE CHANNEL CONFIG
// All IDs verified via Wikidata / SocialBlade / official sources
// ============================

export const CHANNELS = {
  // Indian news channels → "News" tab
  news: [
    "UCZFMm1mMw0F81Z37aaEzTUA", // NDTV                ✅ Wikidata
    "UCt4t-jeY85JegMlZ-E5UWtA", // Aaj Tak             ✅ Wikidata
    "UC_gUM8rL-Lrg6O3adPW9K1g", // WION                ✅ SocialBlade
    "UC6RJ7-PaXg6TIH2BzZfTV7w", // Times Now           ✅ user verified
    "UCMk9Tdc-d1BIcAFaSppiVkw", // Times Now Navbharat ✅ user verified
    "UCilbgr035NJ7BIkVPMeLyWA", // Republic TV         ✅ user verified
  ],

  // International news channels → "Global" tab
  global: [
    "UC16niRr50-MSBwiO3YDb3RA", // BBC News             ✅ Wikidata
    "UCupvZG-5ko_eiXAupbDfxWw", // CNN                  ✅ Wikidata
    "UCNye-wNBqNL5ZzHSJj3l8Bg", // Al Jazeera English   ✅ Wikidata
    "UCknLrEdhRCp1aegoMqRaCZg", // DW News              ✅ SocialBlade
    "UChqUTb7kYRX8-EiaN3XFrSQ", // Reuters              ✅ widely confirmed
  ],
};

// Display names — quoted keys required (IDs contain hyphens)
export const CHANNEL_NAMES: Record<string, string> = {
  "UCZFMm1mMw0F81Z37aaEzTUA": "NDTV",
  "UCt4t-jeY85JegMlZ-E5UWtA": "Aaj Tak",
  "UC_gUM8rL-Lrg6O3adPW9K1g": "WION",
  "UC6RJ7-PaXg6TIH2BzZfTV7w": "Times Now",
  "UCMk9Tdc-d1BIcAFaSppiVkw": "Times Now Navbharat",
  "UCilbgr035NJ7BIkVPMeLyWA": "Republic TV",
  "UC16niRr50-MSBwiO3YDb3RA": "BBC News",
  "UCupvZG-5ko_eiXAupbDfxWw": "CNN",
  "UCNye-wNBqNL5ZzHSJj3l8Bg": "Al Jazeera English",
  "UCknLrEdhRCp1aegoMqRaCZg": "DW News",
  "UChqUTb7kYRX8-EiaN3XFrSQ": "Reuters",
};