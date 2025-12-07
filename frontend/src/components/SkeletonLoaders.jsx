// Skeleton loader components for instant perceived loading

export const ChatCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

export const MessageSkeleton = () => (
  <div className="space-y-3 p-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[70%] rounded-2xl p-3 animate-pulse ${
            i % 2 === 0
              ? 'bg-blue-100 dark:bg-blue-900'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        </div>
      </div>
    ))}
  </div>
);

export const ProfileSkeleton = () => (
  <div className="animate-pulse space-y-6 p-6">
    <div className="flex flex-col items-center">
      <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full mb-4"></div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-4 p-4">
    {/* Search skeleton */}
    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
    
    {/* Chat cards skeleton */}
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <ChatCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const GroupListSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm animate-pulse"
      >
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    ))}
  </div>
);
