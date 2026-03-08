/**
 * Country flag emoji utilities.
 *
 * Flag emojis are generated from ISO-3166-1 alpha-2 codes using Unicode
 * Regional Indicator Symbols (U+1F1E6…U+1F1FF). They render as flag emojis
 * on all modern platforms and make country names universally understandable.
 */

/** Convert an ISO-3166-1 alpha-2 code (e.g. "UA") → flag emoji "🇺🇦" */
function isoToFlag(iso: string): string {
  return [...iso.toUpperCase()]
    .map((c) => String.fromCodePoint(c.codePointAt(0)! + 127397))
    .join("");
}

/**
 * Maps lowercase English country names (as stored in the DB / returned by API)
 * to ISO-3166-1 alpha-2 codes.
 */
const COUNTRY_ISO: Record<string, string> = {
  // ── Middle East ────────────────────────────────────────────────────────────
  israel: "IL",
  palestine: "PS",
  "state of palestine": "PS",
  lebanon: "LB",
  syria: "SY",
  iraq: "IQ",
  iran: "IR",
  yemen: "YE",
  jordan: "JO",
  "saudi arabia": "SA",
  kuwait: "KW",
  bahrain: "BH",
  qatar: "QA",
  "united arab emirates": "AE",
  oman: "OM",
  turkey: "TR",
  turkiye: "TR",
  // ── Africa ─────────────────────────────────────────────────────────────────
  egypt: "EG",
  libya: "LY",
  tunisia: "TN",
  morocco: "MA",
  algeria: "DZ",
  sudan: "SD",
  "south sudan": "SS",
  ethiopia: "ET",
  eritrea: "ER",
  djibouti: "DJ",
  somalia: "SO",
  kenya: "KE",
  uganda: "UG",
  rwanda: "RW",
  burundi: "BI",
  tanzania: "TZ",
  "democratic republic of the congo": "CD",
  "dr congo": "CD",
  drc: "CD",
  "republic of congo": "CG",
  angola: "AO",
  zambia: "ZM",
  mozambique: "MZ",
  zimbabwe: "ZW",
  "south africa": "ZA",
  nigeria: "NG",
  niger: "NE",
  mali: "ML",
  "burkina faso": "BF",
  chad: "TD",
  cameroon: "CM",
  "central african republic": "CF",
  senegal: "SN",
  ghana: "GH",
  "ivory coast": "CI",
  "côte d'ivoire": "CI",
  "cote d'ivoire": "CI",
  liberia: "LR",
  "sierra leone": "SL",
  guinea: "GN",
  "guinea-bissau": "GW",
  togo: "TG",
  benin: "BJ",
  malawi: "MW",
  // ── Asia ───────────────────────────────────────────────────────────────────
  russia: "RU",
  ukraine: "UA",
  afghanistan: "AF",
  pakistan: "PK",
  india: "IN",
  "sri lanka": "LK",
  bangladesh: "BD",
  myanmar: "MM",
  burma: "MM",
  thailand: "TH",
  vietnam: "VN",
  cambodia: "KH",
  laos: "LA",
  philippines: "PH",
  indonesia: "ID",
  malaysia: "MY",
  china: "CN",
  taiwan: "TW",
  "north korea": "KP",
  "south korea": "KR",
  japan: "JP",
  mongolia: "MN",
  kazakhstan: "KZ",
  uzbekistan: "UZ",
  tajikistan: "TJ",
  kyrgyzstan: "KG",
  turkmenistan: "TM",
  azerbaijan: "AZ",
  armenia: "AM",
  georgia: "GE",
  // ── Americas ───────────────────────────────────────────────────────────────
  "united states": "US",
  usa: "US",
  canada: "CA",
  mexico: "MX",
  guatemala: "GT",
  honduras: "HN",
  "el salvador": "SV",
  nicaragua: "NI",
  "costa rica": "CR",
  panama: "PA",
  cuba: "CU",
  haiti: "HT",
  "dominican republic": "DO",
  venezuela: "VE",
  colombia: "CO",
  ecuador: "EC",
  peru: "PE",
  bolivia: "BO",
  brazil: "BR",
  paraguay: "PY",
  uruguay: "UY",
  argentina: "AR",
  chile: "CL",
  // ── Europe ─────────────────────────────────────────────────────────────────
  "united kingdom": "GB",
  uk: "GB",
  france: "FR",
  germany: "DE",
  italy: "IT",
  spain: "ES",
  portugal: "PT",
  netherlands: "NL",
  belgium: "BE",
  switzerland: "CH",
  austria: "AT",
  poland: "PL",
  czechia: "CZ",
  "czech republic": "CZ",
  slovakia: "SK",
  hungary: "HU",
  romania: "RO",
  bulgaria: "BG",
  greece: "GR",
  cyprus: "CY",
  sweden: "SE",
  norway: "NO",
  finland: "FI",
  denmark: "DK",
  "north macedonia": "MK",
  macedonia: "MK",
  serbia: "RS",
  "bosnia and herzegovina": "BA",
  bosnia: "BA",
  croatia: "HR",
  slovenia: "SI",
  albania: "AL",
  kosovo: "XK",
  belarus: "BY",
  moldova: "MD",
  estonia: "EE",
  latvia: "LV",
  lithuania: "LT",
  // ── Oceania ────────────────────────────────────────────────────────────────
  australia: "AU",
  "new zealand": "NZ",
  "papua new guinea": "PG",
};

/**
 * Returns the flag emoji for a country name, or an empty string if unknown.
 * Lookup is case-insensitive and trims whitespace.
 *
 * @example
 *   getFlag("Ukraine")  // "🇺🇦"
 *   getFlag("unknown")  // ""
 */
export function getFlag(countryName: string): string {
  const iso = COUNTRY_ISO[countryName.toLowerCase().trim()];
  if (!iso) return "";
  // Kosovo uses XK which has no official flag emoji — return a neutral symbol
  if (iso === "XK") return "🏳";
  return isoToFlag(iso);
}

/**
 * Returns the flag + country name string for display.
 * e.g. "🇺🇦 Ukraine"
 */
export function formatCountry(countryName: string): string {
  const flag = getFlag(countryName);
  return flag ? `${flag} ${countryName}` : countryName;
}
