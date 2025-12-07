// frontend/src/components/CityAutocomplete.jsx
// ✅ NEW: Autocomplete for Indian cities and states
import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

// Top 100 Indian cities and states for autocomplete
const INDIAN_LOCATIONS = [
  // Metro Cities
  "Mumbai, Maharashtra",
  "Delhi",
  "Bangalore, Karnataka",
  "Hyderabad, Telangana",
  "Ahmedabad, Gujarat",
  "Chennai, Tamil Nadu",
  "Kolkata, West Bengal",
  "Pune, Maharashtra",
  "Jaipur, Rajasthan",
  "Surat, Gujarat",

  // Tier 1 Cities
  "Lucknow, Uttar Pradesh",
  "Kanpur, Uttar Pradesh",
  "Nagpur, Maharashtra",
  "Indore, Madhya Pradesh",
  "Thane, Maharashtra",
  "Bhopal, Madhya Pradesh",
  "Visakhapatnam, Andhra Pradesh",
  "Pimpri-Chinchwad, Maharashtra",
  "Patna, Bihar",
  "Vadodara, Gujarat",
  "Ghaziabad, Uttar Pradesh",
  "Ludhiana, Punjab",
  "Agra, Uttar Pradesh",
  "Nashik, Maharashtra",
  "Faridabad, Haryana",
  "Meerut, Uttar Pradesh",
  "Rajkot, Gujarat",
  "Kalyan-Dombivali, Maharashtra",
  "Vasai-Virar, Maharashtra",
  "Varanasi, Uttar Pradesh",

  // Tier 2 Cities
  "Srinagar, Jammu and Kashmir",
  "Aurangabad, Maharashtra",
  "Dhanbad, Jharkhand",
  "Amritsar, Punjab",
  "Navi Mumbai, Maharashtra",
  "Allahabad, Uttar Pradesh",
  "Ranchi, Jharkhand",
  "Howrah, West Bengal",
  "Coimbatore, Tamil Nadu",
  "Jabalpur, Madhya Pradesh",
  "Gwalior, Madhya Pradesh",
  "Vijayawada, Andhra Pradesh",
  "Jodhpur, Rajasthan",
  "Madurai, Tamil Nadu",
  "Raipur, Chhattisgarh",
  "Kota, Rajasthan",
  "Chandigarh",
  "Guwahati, Assam",
  "Solapur, Maharashtra",
  "Hubli-Dharwad, Karnataka",
  "Mysore, Karnataka",
  "Tiruchirappalli, Tamil Nadu",
  "Bareilly, Uttar Pradesh",
  "Aligarh, Uttar Pradesh",
  "Tiruppur, Tamil Nadu",
  "Moradabad, Uttar Pradesh",
  "Jalandhar, Punjab",
  "Bhubaneswar, Odisha",
  "Salem, Tamil Nadu",
  "Warangal, Telangana",

  // States Only (for people who want to just mention state)
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli",
  "Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export default function CityAutocomplete({ value, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const input = e.target.value;
    setInputValue(input);

    if (input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter locations
    const filtered = INDIAN_LOCATIONS.filter((location) =>
      location.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 8); // Show max 8 suggestions

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  };

  const handleSelectSuggestion = (suggestion) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleBlur = () => {
    // Update parent with current value even if no suggestion selected
    onChange(inputValue);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={handleBlur}
          placeholder={placeholder || "Search city or state..."}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition ${
                index === selectedIndex ? "bg-blue-50 dark:bg-gray-700" : ""
              } ${
                index !== suggestions.length - 1
                  ? "border-b border-gray-100 dark:border-gray-700"
                  : ""
              }`}
            >
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {suggestion}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
