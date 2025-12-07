import { Search } from "lucide-react";

export default function WhatsAppSearch({ value, onChange, placeholder = "Search messages or users..." }) {
  return (
    <div className="sticky top-[62px] z-10 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800">
      <div className="flex items-center bg-white dark:bg-gray-800 rounded-full px-4 py-2.5 shadow-sm">
        <Search size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="flex-1 ml-3 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
      </div>
    </div>
  );
}
