import { ChevronDown, ChevronUp } from "lucide-react";

export default function ChatSection({ 
  title, 
  icon, 
  count, 
  expanded, 
  onToggle, 
  children,
  hasMore = false 
}) {
  const displayChildren = Array.isArray(children) ? children : [children].filter(Boolean);
  const visibleItems = expanded ? displayChildren : displayChildren.slice(0, 5);
  const showExpandButton = displayChildren.length > 5;

  return (
    <div className="mb-1">
      {/* Section Header */}
      <div 
        onClick={showExpandButton ? onToggle : undefined}
        className={`flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-900 ${
          showExpandButton ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {title} ({count})
          </h2>
        </div>
        {showExpandButton && (
          <button 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Chat Items */}
      <div className="bg-white dark:bg-gray-800">
        {visibleItems}
      </div>

      {/* Show All/Less Button */}
      {showExpandButton && !expanded && (
        <button
          onClick={onToggle}
          className="w-full text-center text-sm text-blue-500 dark:text-blue-400 hover:underline font-medium py-2.5 bg-white dark:bg-gray-800 border-b dark:border-gray-700"
        >
          Show All ({displayChildren.length})
        </button>
      )}
    </div>
  );
}
