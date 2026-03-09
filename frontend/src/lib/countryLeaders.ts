export interface Leader {
  name: string;
  position: string;
}

export interface RichPerson {
  name: string;
  netWorth: string;
  industry: string;
}

export interface CountryProfile {
  leaders: Leader[];
  richest: RichPerson[];
}

/**
 * Static profiles for major conflict-affected and geopolitically significant countries.
 * Key is the country name as it appears in the DB (lowercase or title-case handled by lookup).
 */
const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  Ukraine: {
    leaders: [
      { name: "Volodymyr Zelenskyy", position: "President" },
      { name: "Denys Shmyhal", position: "Prime Minister" },
      { name: "Rustem Umerov", position: "Minister of Defence" },
      { name: "Andrii Sybiha", position: "Minister of Foreign Affairs" },
      { name: "Oleksandr Syrskyi", position: "Commander-in-Chief, Armed Forces" },
      { name: "Kyrylo Budanov", position: "Head of Military Intelligence" },
      { name: "Oleksii Danilov", position: "Ambassador to Moldova" },
      { name: "Iryna Vereshchuk", position: "Deputy PM, Reintegration" },
      { name: "Dmytro Kuleba", position: "Former Foreign Minister" },
      { name: "Andriy Yermak", position: "Head of Presidential Office" },
    ],
    richest: [
      { name: "Rinat Akhmetov", netWorth: "$4.7B", industry: "Steel & Mining" },
      { name: "Vadim Novinsky", netWorth: "$1.4B", industry: "Steel & Mining" },
      { name: "Petro Poroshenko", netWorth: "$1.1B", industry: "Confectionery & Media" },
      { name: "Kostyantyn Zhevago", netWorth: "$0.9B", industry: "Banking & Mining" },
      { name: "Viktor Pinchuk", netWorth: "$0.8B", industry: "Steel Pipes" },
    ],
  },
  Russia: {
    leaders: [
      { name: "Vladimir Putin", position: "President" },
      { name: "Mikhail Mishustin", position: "Prime Minister" },
      { name: "Andrei Belousov", position: "Minister of Defence" },
      { name: "Sergei Lavrov", position: "Minister of Foreign Affairs" },
      { name: "Nikolai Patrushev", position: "Presidential Advisor" },
      { name: "Sergei Shoigu", position: "Secretary, Security Council" },
      { name: "Valentina Matviyenko", position: "Chair, Federation Council" },
      { name: "Vyacheslav Volodin", position: "Chair, State Duma" },
      { name: "Valery Gerasimov", position: "Chief of General Staff" },
      { name: "Alexander Bortnikov", position: "Director, FSB" },
    ],
    richest: [
      { name: "Alexei Mordashov", netWorth: "$23.4B", industry: "Steel & Mining" },
      { name: "Vladimir Lisin", netWorth: "$22.1B", industry: "Steel & Transport" },
      { name: "Leonid Mikhelson", netWorth: "$21.8B", industry: "Gas & Petrochemicals" },
      { name: "Vagit Alekperov", netWorth: "$20.5B", industry: "Oil (LUKOIL)" },
      { name: "Vladimir Potanin", netWorth: "$19.7B", industry: "Nickel & Palladium" },
    ],
  },
  Israel: {
    leaders: [
      { name: "Isaac Herzog", position: "President" },
      { name: "Benjamin Netanyahu", position: "Prime Minister" },
      { name: "Yoav Gallant", position: "Former Minister of Defence" },
      { name: "Israel Katz", position: "Minister of Defence" },
      { name: "Gideon Sa'ar", position: "Minister of Foreign Affairs" },
      { name: "Bezalel Smotrich", position: "Minister of Finance" },
      { name: "Itamar Ben Gvir", position: "Minister of National Security" },
      { name: "Herzi Halevi", position: "IDF Chief of Staff" },
      { name: "Benny Gantz", position: "Former Defence Minister" },
      { name: "Yair Lapid", position: "Opposition Leader" },
    ],
    richest: [
      { name: "Eyal Ofer", netWorth: "$22.1B", industry: "Shipping & Real Estate" },
      { name: "Idan Ofer", netWorth: "$15.3B", industry: "Shipping & Energy" },
      { name: "Miriam Adelson", netWorth: "$14.8B", industry: "Casinos & Media" },
      { name: "Stef Wertheimer", netWorth: "$7.6B", industry: "Manufacturing" },
      { name: "Morris Kahn", netWorth: "$5.1B", industry: "Tech & Telecom" },
    ],
  },
  Palestine: {
    leaders: [
      { name: "Mahmoud Abbas", position: "President, Palestinian Authority" },
      { name: "Mohammad Mustafa", position: "Prime Minister, PA" },
      { name: "Hussein al-Sheikh", position: "Secretary General, PLO" },
      { name: "Yahya Sinwar", position: "Former Hamas Political Chief" },
      { name: "Ismail Haniyeh", position: "Former Hamas Political Bureau Chief" },
      { name: "Mohammed Deif", position: "Hamas Military Commander" },
      { name: "Khalil al-Hayya", position: "Hamas Deputy Chief" },
      { name: "Majed Faraj", position: "Head of Intelligence, PA" },
      { name: "Ziad Nakhaleh", position: "Leader, Islamic Jihad" },
      { name: "Marwan Barghouti", position: "Imprisoned Fatah Leader" },
    ],
    richest: [
      { name: "Munib al-Masri", netWorth: "$1.5B", industry: "Conglomerates" },
      { name: "Sabih al-Masri", netWorth: "$1.2B", industry: "Banking & Industry" },
      { name: "Bashar Masri", netWorth: "$0.6B", industry: "Real Estate" },
    ],
  },
  Syria: {
    leaders: [
      { name: "Ahmad al-Sharaa", position: "De Facto Leader (HTS)" },
      { name: "Mohammed al-Bashir", position: "Transitional PM" },
      { name: "Asaad al-Shibani", position: "Foreign Minister" },
      { name: "Murhaf Abu Qasra", position: "Military Chief" },
      { name: "Bashar al-Assad", position: "Deposed President (exile)" },
      { name: "Mazloum Abdi", position: "SDF Commander (NE Syria)" },
      { name: "Ilham Ahmed", position: "Co-chair, Syrian Democratic Council" },
    ],
    richest: [
      { name: "Rami Makhlouf", netWorth: "$3B", industry: "Telecom & Finance" },
      { name: "Samir Foz", netWorth: "$0.8B", industry: "Construction & Trade" },
    ],
  },
  Iran: {
    leaders: [
      { name: "Masoud Pezeshkian", position: "President" },
      { name: "Ali Khamenei", position: "Supreme Leader" },
      { name: "Mohammad Reza Aref", position: "First Vice President" },
      { name: "Abbas Araghchi", position: "Minister of Foreign Affairs" },
      { name: "Aziz Nasirzadeh", position: "Minister of Defence" },
      { name: "Ahmad Vahidi", position: "Secretary, Supreme National Security" },
      { name: "Hossein Salami", position: "Commander, IRGC" },
      { name: "Mohammad Bagheri", position: "Chief of Armed Forces Staff" },
      { name: "Esmail Qaani", position: "Quds Force Commander" },
      { name: "Gholamhossein Mohseni-Eje'i", position: "Judiciary Chief" },
    ],
    richest: [
      { name: "IRGC Cooperative Foundation", netWorth: "$20B+", industry: "Conglomerate (state-linked)" },
      { name: "Asadollah Asgaroladi", netWorth: "$4B", industry: "Trade & Commerce" },
      { name: "Behruz Ashtiani", netWorth: "$1.2B", industry: "Real Estate" },
    ],
  },
  India: {
    leaders: [
      { name: "Droupadi Murmu", position: "President" },
      { name: "Narendra Modi", position: "Prime Minister" },
      { name: "Rajnath Singh", position: "Minister of Defence" },
      { name: "S. Jaishankar", position: "Minister of External Affairs" },
      { name: "Amit Shah", position: "Minister of Home Affairs" },
      { name: "Nirmala Sitharaman", position: "Minister of Finance" },
      { name: "Jagdeep Dhankhar", position: "Vice President" },
      { name: "Ajit Doval", position: "National Security Advisor" },
      { name: "Gen. Upendra Dwivedi", position: "Chief of Army Staff" },
      { name: "Rahul Gandhi", position: "Leader of Opposition" },
    ],
    richest: [
      { name: "Mukesh Ambani", netWorth: "$116B", industry: "Petrochemicals & Telecom" },
      { name: "Gautam Adani", netWorth: "$84B", industry: "Infrastructure & Energy" },
      { name: "Shiv Nadar", netWorth: "$37B", industry: "IT Services (HCL)" },
      { name: "Dilip Shanghvi", netWorth: "$26B", industry: "Pharmaceuticals" },
      { name: "Kumar Birla", netWorth: "$19B", industry: "Commodities & Telecom" },
    ],
  },
  China: {
    leaders: [
      { name: "Xi Jinping", position: "President & CPC General Secretary" },
      { name: "Li Qiang", position: "Premier, State Council" },
      { name: "Zhao Leji", position: "Chairman, NPC Standing Committee" },
      { name: "Wang Huning", position: "Chairman, CPPCC" },
      { name: "Cai Qi", position: "CPC Secretariat" },
      { name: "Dong Jun", position: "Minister of National Defense" },
      { name: "Wang Yi", position: "Minister of Foreign Affairs" },
      { name: "Chen Wenqing", position: "Secretary, Political & Legal Affairs" },
      { name: "Zhang Youxia", position: "Vice Chairman, CMC" },
      { name: "He Weidong", position: "Vice Chairman, CMC" },
    ],
    richest: [
      { name: "Zhong Shanshan", netWorth: "$62B", industry: "Beverages & Pharma" },
      { name: "Zhang Yiming", netWorth: "$49B", industry: "Tech (ByteDance)" },
      { name: "Ma Huateng", netWorth: "$39B", industry: "Tech (Tencent)" },
      { name: "William Ding", netWorth: "$26B", industry: "Gaming (NetEase)" },
      { name: "He Xiangjian", netWorth: "$24B", industry: "Home Appliances (Midea)" },
    ],
  },
  "United States": {
    leaders: [
      { name: "Donald Trump", position: "President" },
      { name: "JD Vance", position: "Vice President" },
      { name: "Pete Hegseth", position: "Secretary of Defense" },
      { name: "Marco Rubio", position: "Secretary of State" },
      { name: "Scott Bessent", position: "Secretary of the Treasury" },
      { name: "Mike Johnson", position: "Speaker of the House" },
      { name: "Chuck Schumer", position: "Senate Minority Leader" },
      { name: "John Ratcliffe", position: "CIA Director" },
      { name: "Kash Patel", position: "FBI Director" },
      { name: "Mike Waltz", position: "National Security Advisor" },
    ],
    richest: [
      { name: "Elon Musk", netWorth: "$241B", industry: "Tesla, SpaceX, xAI" },
      { name: "Jeff Bezos", netWorth: "$207B", industry: "Amazon" },
      { name: "Mark Zuckerberg", netWorth: "$186B", industry: "Meta" },
      { name: "Larry Ellison", netWorth: "$178B", industry: "Oracle" },
      { name: "Warren Buffett", netWorth: "$136B", industry: "Berkshire Hathaway" },
    ],
  },
  "United Kingdom": {
    leaders: [
      { name: "King Charles III", position: "Head of State" },
      { name: "Keir Starmer", position: "Prime Minister" },
      { name: "John Healey", position: "Secretary of State for Defence" },
      { name: "David Lammy", position: "Foreign Secretary" },
      { name: "Rachel Reeves", position: "Chancellor of the Exchequer" },
      { name: "Yvette Cooper", position: "Home Secretary" },
      { name: "Tony Radakin", position: "Chief of the Defence Staff" },
      { name: "Kemi Badenoch", position: "Leader of the Opposition" },
    ],
    richest: [
      { name: "Gopi Hinduja & family", netWorth: "$37B", industry: "Conglomerate" },
      { name: "Jim Ratcliffe", netWorth: "$14B", industry: "Chemicals (INEOS)" },
      { name: "Leonard Blavatnik", netWorth: "$32B", industry: "Media & Industry" },
      { name: "James Dyson", netWorth: "$9B", industry: "Technology" },
      { name: "Lakshmi Mittal", netWorth: "$16B", industry: "Steel" },
    ],
  },
  Turkey: {
    leaders: [
      { name: "Recep Tayyip Erdogan", position: "President" },
      { name: "Cevdet Yilmaz", position: "Vice President" },
      { name: "Yasar Guler", position: "Minister of National Defence" },
      { name: "Hakan Fidan", position: "Minister of Foreign Affairs" },
      { name: "Ibrahim Kalin", position: "Head of National Intelligence" },
      { name: "Metin Gurenel", position: "Chief of General Staff" },
    ],
    richest: [
      { name: "Murat Ulker", netWorth: "$6.1B", industry: "Food & Beverages" },
      { name: "Sezai Baciksiz", netWorth: "$3.4B", industry: "Steel & Mining" },
      { name: "Husnu Ozyegin", netWorth: "$2.8B", industry: "Banking" },
    ],
  },
  Pakistan: {
    leaders: [
      { name: "Asif Ali Zardari", position: "President" },
      { name: "Shehbaz Sharif", position: "Prime Minister" },
      { name: "Khawaja Asif", position: "Minister of Defence" },
      { name: "Ishaq Dar", position: "Deputy PM & Foreign Affairs" },
      { name: "Asim Munir", position: "Chief of Army Staff" },
      { name: "Imran Khan", position: "Former PM (imprisoned)" },
    ],
    richest: [
      { name: "Mian Muhammad Mansha", netWorth: "$3.8B", industry: "Banking & Cement" },
      { name: "Shahid Khan", netWorth: "$12.5B", industry: "Auto Parts (US-based)" },
      { name: "Anwar Pervez", netWorth: "$3.5B", industry: "Retail (UK-based)" },
    ],
  },
  "Saudi Arabia": {
    leaders: [
      { name: "King Salman bin Abdulaziz", position: "King" },
      { name: "Mohammed bin Salman", position: "Crown Prince & PM" },
      { name: "Khalid bin Salman", position: "Minister of Defense" },
      { name: "Faisal bin Farhan", position: "Minister of Foreign Affairs" },
      { name: "Abdulaziz bin Saud", position: "Minister of Interior" },
    ],
    richest: [
      { name: "Al Waleed bin Talal", netWorth: "$16B", industry: "Investments" },
      { name: "Mohammed Al Amoudi", netWorth: "$8.4B", industry: "Construction & Oil" },
      { name: "Nassef Sawiris", netWorth: "$7.6B", industry: "Construction" },
    ],
  },
  Sudan: {
    leaders: [
      { name: "Abdel Fattah al-Burhan", position: "Sovereign Council Chairman" },
      { name: "Mohamed Hamdan Dagalo (Hemedti)", position: "RSF Commander" },
      { name: "Minni Minnawi", position: "Darfur Governor" },
      { name: "Ibrahim Jaber", position: "Foreign Minister" },
    ],
    richest: [
      { name: "Mo Ibrahim", netWorth: "$1.1B", industry: "Telecom (UK-based)" },
    ],
  },
  Myanmar: {
    leaders: [
      { name: "Min Aung Hlaing", position: "SAC Chairman (Junta leader)" },
      { name: "Soe Win", position: "Deputy SAC Chairman" },
      { name: "Duwa Lashi La", position: "Acting President, NUG" },
      { name: "Mahn Win Khaing Than", position: "PM, NUG" },
      { name: "Aung San Suu Kyi", position: "Detained State Counsellor" },
    ],
    richest: [
      { name: "Tay Za", netWorth: "$0.6B", industry: "Conglomerate" },
    ],
  },
  "North Korea": {
    leaders: [
      { name: "Kim Jong Un", position: "Supreme Leader" },
      { name: "Choe Ryong-hae", position: "President, Presidium" },
      { name: "Kim Tok-hun", position: "Premier" },
      { name: "Choe Son-hui", position: "Minister of Foreign Affairs" },
      { name: "Ri Yong-gil", position: "Minister of National Defence" },
    ],
    richest: [],
  },
  "South Korea": {
    leaders: [
      { name: "Yoon Suk-yeol", position: "President (suspended)" },
      { name: "Han Duck-soo", position: "Acting President / PM" },
      { name: "Shin Won-sik", position: "Minister of National Defense" },
      { name: "Cho Tae-yul", position: "Minister of Foreign Affairs" },
      { name: "Lee Jae-myung", position: "Opposition Leader" },
    ],
    richest: [
      { name: "Kim Beom-su", netWorth: "$9.6B", industry: "Tech (Kakao)" },
      { name: "Lee Jae-yong", netWorth: "$9.3B", industry: "Samsung" },
      { name: "Seo Jung-jin", netWorth: "$7.2B", industry: "Biotech (Celltrion)" },
    ],
  },
  France: {
    leaders: [
      { name: "Emmanuel Macron", position: "President" },
      { name: "Francois Bayrou", position: "Prime Minister" },
      { name: "Sebastien Lecornu", position: "Minister of the Armed Forces" },
      { name: "Jean-Noel Barrot", position: "Minister of Foreign Affairs" },
    ],
    richest: [
      { name: "Bernard Arnault", netWorth: "$174B", industry: "Luxury Goods (LVMH)" },
      { name: "Francoise Bettencourt Meyers", netWorth: "$80B", industry: "Cosmetics (L'Oreal)" },
      { name: "Gerard Wertheimer", netWorth: "$40B", industry: "Luxury (Chanel)" },
    ],
  },
  Germany: {
    leaders: [
      { name: "Frank-Walter Steinmeier", position: "President" },
      { name: "Friedrich Merz", position: "Chancellor" },
      { name: "Boris Pistorius", position: "Minister of Defence" },
      { name: "Annalena Baerbock", position: "Former Foreign Minister" },
    ],
    richest: [
      { name: "Klaus-Michael Kuhne", netWorth: "$39B", industry: "Logistics" },
      { name: "Dieter Schwarz", netWorth: "$37B", industry: "Retail (Lidl)" },
      { name: "Stefan Quandt", netWorth: "$25B", industry: "Automotive (BMW)" },
    ],
  },
  Japan: {
    leaders: [
      { name: "Emperor Naruhito", position: "Emperor" },
      { name: "Shigeru Ishiba", position: "Prime Minister" },
      { name: "Gen Nakatani", position: "Minister of Defense" },
      { name: "Takeshi Iwaya", position: "Minister of Foreign Affairs" },
    ],
    richest: [
      { name: "Tadashi Yanai", netWorth: "$41B", industry: "Retail (Uniqlo)" },
      { name: "Takemitsu Takizaki", netWorth: "$28B", industry: "Electronics (Keyence)" },
      { name: "Masayoshi Son", netWorth: "$23B", industry: "Tech (SoftBank)" },
    ],
  },
  Ethiopia: {
    leaders: [
      { name: "Sahle-Work Zewde", position: "President" },
      { name: "Abiy Ahmed", position: "Prime Minister" },
      { name: "Birhanu Jula", position: "Chief of Defence Forces" },
      { name: "Demeke Mekonnen", position: "Deputy PM" },
    ],
    richest: [
      { name: "Mohammed Al Amoudi", netWorth: "$8.4B", industry: "Construction & Oil" },
    ],
  },
  Nigeria: {
    leaders: [
      { name: "Bola Tinubu", position: "President" },
      { name: "Kashim Shettima", position: "Vice President" },
      { name: "Abubakar Badaru", position: "Minister of Defence" },
      { name: "Yusuf Tuggar", position: "Minister of Foreign Affairs" },
    ],
    richest: [
      { name: "Aliko Dangote", netWorth: "$13.5B", industry: "Cement & Sugar" },
      { name: "Mike Adenuga", netWorth: "$6.3B", industry: "Telecom & Oil" },
      { name: "Abdulsamad Rabiu", netWorth: "$5.8B", industry: "Cement & Sugar" },
    ],
  },
  Lebanon: {
    leaders: [
      { name: "Joseph Aoun", position: "President" },
      { name: "Nawaf Salam", position: "Prime Minister" },
      { name: "Nabih Berri", position: "Former Speaker of Parliament" },
      { name: "Naim Qassem", position: "Hezbollah Secretary-General" },
    ],
    richest: [
      { name: "Najib Mikati", netWorth: "$2.8B", industry: "Telecom" },
      { name: "Taha Mikati", netWorth: "$2.5B", industry: "Telecom" },
      { name: "Bahaa Hariri", netWorth: "$2.1B", industry: "Real Estate" },
    ],
  },
  Iraq: {
    leaders: [
      { name: "Abdul Latif Rashid", position: "President" },
      { name: "Mohammed Shia al-Sudani", position: "Prime Minister" },
      { name: "Thabet al-Abbasi", position: "Minister of Defence" },
      { name: "Fuad Hussein", position: "Minister of Foreign Affairs" },
    ],
    richest: [
      { name: "Nadhmi Auchi", netWorth: "$2.5B", industry: "Trade & Real Estate" },
    ],
  },
  Yemen: {
    leaders: [
      { name: "Rashad al-Alimi", position: "Presidential Leadership Council" },
      { name: "Abdul-Malik al-Houthi", position: "Ansar Allah Leader" },
      { name: "Ahmed Obeid bin Daghr", position: "PM" },
      { name: "Aidarus al-Zoubaidi", position: "STC President" },
    ],
    richest: [],
  },
  Somalia: {
    leaders: [
      { name: "Hassan Sheikh Mohamud", position: "President" },
      { name: "Hamza Abdi Barre", position: "Prime Minister" },
      { name: "Ahmed Moallim Fiqi", position: "Minister of Defence" },
    ],
    richest: [],
  },
  "Democratic Republic of the Congo": {
    leaders: [
      { name: "Felix Tshisekedi", position: "President" },
      { name: "Judith Suminwa", position: "Prime Minister" },
      { name: "Jean-Pierre Bemba", position: "Minister of Defence" },
    ],
    richest: [],
  },
  Afghanistan: {
    leaders: [
      { name: "Hibatullah Akhundzada", position: "Supreme Leader (Taliban)" },
      { name: "Hasan Akhund", position: "PM (Taliban)" },
      { name: "Sirajuddin Haqqani", position: "Interior Minister" },
      { name: "Amir Khan Muttaqi", position: "Foreign Minister" },
    ],
    richest: [],
  },
};

// Alias table for name normalisation (DB names can vary)
const ALIASES: Record<string, string> = {
  US: "United States",
  USA: "United States",
  "United States of America": "United States",
  UK: "United Kingdom",
  Britain: "United Kingdom",
  "Great Britain": "United Kingdom",
  "South Korea": "South Korea",
  "Republic of Korea": "South Korea",
  DPRK: "North Korea",
  "Democratic People's Republic of Korea": "North Korea",
  DRC: "Democratic Republic of the Congo",
  Congo: "Democratic Republic of the Congo",
  "DR Congo": "Democratic Republic of the Congo",
  Burma: "Myanmar",
  KSA: "Saudi Arabia",
};

export function getCountryProfile(country: string): CountryProfile | null {
  // Direct match
  if (COUNTRY_PROFILES[country]) return COUNTRY_PROFILES[country];

  // Alias lookup
  const aliased = ALIASES[country];
  if (aliased && COUNTRY_PROFILES[aliased]) return COUNTRY_PROFILES[aliased];

  // Case-insensitive search
  const lower = country.toLowerCase();
  for (const key of Object.keys(COUNTRY_PROFILES)) {
    if (key.toLowerCase() === lower) return COUNTRY_PROFILES[key];
  }

  // Alias case-insensitive
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (alias.toLowerCase() === lower && COUNTRY_PROFILES[target]) {
      return COUNTRY_PROFILES[target];
    }
  }

  return null;
}
