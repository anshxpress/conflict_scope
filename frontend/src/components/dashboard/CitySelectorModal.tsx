import { useState, useMemo } from "react";

// Top Indian cities mapped to their respective states
export const CURATED_CITIES = [
  { city: "Delhi", state: "Delhi" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Surat", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Gurugram", state: "Haryana" },
  { city: "Patna", state: "Bihar" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Guwahati", state: "Assam" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Srinagar", state: "Jammu and Kashmir" },
  { city: "Kochi", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Dehradun", state: "Uttarakhand" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Panaji", state: "Goa" },
  { city: "Shimla", state: "Himachal Pradesh" },
];

interface CitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (city: string, state: string) => void;
}

export default function CitySelectorModal({
  isOpen,
  onClose,
  onSelect,
}: CitySelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCities = useMemo(() => {
    if (!searchTerm) return CURATED_CITIES;
    const term = searchTerm.toLowerCase();
    return CURATED_CITIES.filter(
      (c) =>
        c.city.toLowerCase().includes(term) ||
        c.state.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-cs-panel border border-cs-border rounded-xl w-[90%] max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cs-border flex justify-between items-center bg-cs-dark/40">
          <div>
            <h2 className="text-base font-bold text-gray-100 uppercase tracking-wider">
              Select Your City
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Personalize your intelligence feed for local updates
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 bg-cs-dark/10 border-b border-cs-border/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for city or state in India..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-cs-dark border border-cs-border rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-cs-blue transition-colors placeholder:text-gray-600"
              autoFocus
            />
            <svg
              className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[50vh]">
          {filteredCities.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {filteredCities.map((item) => (
                <button
                  key={`${item.city}-${item.state}`}
                  onClick={() => {
                    onSelect(item.city, item.state);
                    onClose();
                  }}
                  className="flex flex-col text-left p-3 rounded-lg border border-cs-border hover:border-cs-blue/50 bg-cs-dark/20 hover:bg-cs-blue/5 transition-all group duration-200"
                >
                  <span className="text-sm font-bold text-gray-200 group-hover:text-cs-blue transition-colors">
                    {item.city}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {item.state}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="w-8 h-8 text-gray-600 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-sm text-gray-400 font-bold">No cities found</p>
              <p className="text-xs text-gray-600 mt-1">
                Try searching for another Indian city or state name
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
