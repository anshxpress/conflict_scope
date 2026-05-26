import nlp from "compromise";

// demomyms and capital cities mapped to standard English country names
const GEOGRAPHIC_ANCHORS: Record<string, string> = {
  // India
  india: "India",
  indian: "India",
  delhi: "India",
  "new delhi": "India",
  mumbai: "India",
  
  // Saudi Arabia
  "saudi arabia": "Saudi Arabia",
  saudi: "Saudi Arabia",
  riyadh: "Saudi Arabia",
  jeddah: "Saudi Arabia",
  
  // Russia
  russia: "Russia",
  russian: "Russia",
  moscow: "Russia",
  kremlin: "Russia",
  
  // Ukraine
  ukraine: "Ukraine",
  ukrainian: "Ukraine",
  kyiv: "Ukraine",
  kiev: "Ukraine",
  crimea: "Ukraine",
  donbas: "Ukraine",
  
  // United States
  usa: "United States",
  "united states": "United States",
  american: "United States",
  washington: "United States",
  "white house": "United States",
  "new york": "United States",
  
  // China
  china: "China",
  chinese: "China",
  beijing: "China",
  shanghai: "China",
  
  // Iran
  iran: "Iran",
  iranian: "Iran",
  tehran: "Iran",
  
  // Israel & Palestine
  israel: "Israel",
  israeli: "Israel",
  tel_aviv: "Israel",
  jerusalem: "Israel",
  palestine: "Palestine",
  palestinian: "Palestine",
  gaza: "Palestine",
  "west bank": "Palestine",
  
  // United Kingdom
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  britain: "United Kingdom",
  british: "United Kingdom",
  london: "United Kingdom",
  
  // Germany
  germany: "Germany",
  german: "Germany",
  berlin: "Germany",
  
  // France
  france: "France",
  french: "France",
  paris: "France",
  
  // Japan
  japan: "Japan",
  japanese: "Japan",
  tokyo: "Japan",
  
  // Yemen
  yemen: "Yemen",
  yemeni: "Yemen",
  sanaa: "Yemen",
  "gulf of aden": "Yemen",
  "red sea": "Yemen",
  
  // Others
  turkey: "Turkey",
  turkish: "Turkey",
  ankara: "Turkey",
  syria: "Syria",
  syrian: "Syria",
  damascus: "Syria",
  sudan: "Sudan",
  sudanese: "Sudan",
  khartoum: "Sudan",
  pakistan: "Pakistan",
  pakistani: "Pakistan",
  islamabad: "Pakistan",
  taiwan: "Taiwan",
  taipei: "Taiwan",
  venezuela: "Venezuela",
  caracas: "Venezuela",
  iraq: "Iraq",
  iraqi: "Iraq",
  baghdad: "Iraq",
};

// Complete standard list of country names for fallback check
const STANDARD_COUNTRIES = new Set([
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso",
  "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile",
  "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "France", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia",
  "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka",
  "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste",
  "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe",
]);

/**
 * Detect all unique countries mentioned in an article.
 * Respects search priority: Headline -> Description -> Content.
 */
export function detectCountries(
  title: string,
  description: string,
  content: string
): string[] {
  const detected = new Set<string>();

  // Helper function to extract countries from a specific block of text
  const extractFromText = (text: string) => {
    if (!text) return;
    
    // 1. Run Compromise NLP places detection
    const doc = nlp(text);
    const places = doc.places().out("array") as string[];
    const organizations = doc.organizations().out("array") as string[];
    const normalText = text.toLowerCase();

    // 2. Check extracted places against our geographic anchor dictionary
    for (const place of places) {
      const lowerPlace = place.toLowerCase().trim();
      if (GEOGRAPHIC_ANCHORS[lowerPlace]) {
        detected.add(GEOGRAPHIC_ANCHORS[lowerPlace]);
      }
    }

    // 3. Scan organizations for country-linked terms (e.g. "US Army" or "IDF" or "Kremlin")
    for (const org of organizations) {
      const lowerOrg = org.toLowerCase().trim();
      if (GEOGRAPHIC_ANCHORS[lowerOrg]) {
        detected.add(GEOGRAPHIC_ANCHORS[lowerOrg]);
      }
      if (lowerOrg.includes("idf")) detected.add("Israel");
      if (lowerOrg.includes("houthi")) detected.add("Yemen");
      if (lowerOrg.includes("hezbollah")) detected.add("Lebanon");
      if (lowerOrg.includes("hamas")) detected.add("Palestine");
    }

    // 4. Perform direct substring scanning for geographic anchors (handles demonyms like "Russian")
    for (const [anchor, countryName] of Object.entries(GEOGRAPHIC_ANCHORS)) {
      const regex = new RegExp(`\\b${anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(normalText)) {
        detected.add(countryName);
      }
    }

    // 5. Final fallback: Direct check of all standard country names
    for (const country of STANDARD_COUNTRIES) {
      const regex = new RegExp(`\\b${country.toLowerCase()}\\b`, "i");
      if (regex.test(normalText)) {
        detected.add(country);
      }
    }
  };

  // Run detection in strict prioritized order:
  // Headline first
  extractFromText(title);
  
  // If we want to capture relationships, e.g. "Oil restriction impacts India",
  // both Saudi Arabia and India will be captured if both are in headline, or if
  // Saudi is in content and India is in headline.
  extractFromText(description);
  extractFromText(content);

  // Return as list
  return Array.from(detected);
}
