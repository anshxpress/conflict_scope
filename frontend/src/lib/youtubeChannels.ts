// ============================
// CHANNEL CONFIG - Categorized
// ============================

export const CHANNELS = {
  news: [
    "UCZFMm1mMw0F81Z37aaEzTUA", // NDTV
    "UCYPvAwZP8pZhSMW8qs7cVCw", // India Today
    "UCPP3etACgdUWvizcES1dJ8Q", // News18 India
    "UCMk9Tdc-d1BIcAFaSppiVkw", // Times Now Navbharat
    "UC_gUM8rL-Lrg6O3adPW9K1g", // WION
  ],
  global: [
    "UC16niRr50-MSBwiO3YDb3RA", // BBC News
    "UCNye-wNBqNL5ZzHSJj3l8Bg", // Al Jazeera
  ],
  // analysis category temporarily removed
};

// Legacy exports for backward compatibility
export const INDIA_NEWS_CHANNELS = [
  "UCZFMm1mMw0F81Z37aaEzTUA", // NDTV
  "UCYPvAwZP8pZhSMW8qs7cVCw", // India Today
  "UCPP3etACgdUWvizcES1dJ8Q", // News18 India
  "UCMk9Tdc-d1BIcAFaSppiVkw", // Times Now Navbharat
  "UC6RJ7-PaXg6TIH2BzZfTV7w", // Times Now
];

export const HINDI_NEWS_CHANNELS = [
  "UCPP3etACgdUWvizcES1dJ8Q", // News18 India
  "UCMk9Tdc-d1BIcAFaSppiVkw", // Times Now Navbharat
];

// Individual category exports
export const NEWS_CHANNELS = CHANNELS.news;
export const GLOBAL_CHANNELS = CHANNELS.global;
// analysis removed; keep export for backward-compat but empty
export const ANALYSIS_CHANNELS: string[] = [];

// Channel display names mapping
export const CHANNEL_NAMES: Record<string, string> = {
  "UCZFMm1mMw0F81Z37aaEzTUA": "NDTV",
  "UCYPvAwZP8pZhSMW8qs7cVCw": "India Today",
  "UCPP3etACgdUWvizcES1dJ8Q": "News18 India",
  "UCMk9Tdc-d1BIcAFaSppiVkw": "Times Now Navbharat",
  "UC_gUM8rL-Lrg6O3adPW9K1g": "WION",
  "UC16niRr50-MSBwiO3YDb3RA": "BBC News",
  "UCNye-wNBqNL5ZzHSJj3l8Bg": "Al Jazeera",
  "UC3gNmTGu-TTbFPpfSs5kNkg": "Abhi & Niyu",
  "UCJ2z2p4q1M4zqKq7cZrK0Dw": "Deshbhakt",
  "UC5n-0ihUiOuuvZSSUnMNZLw": "StudyIQ",
};
