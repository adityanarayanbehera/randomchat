//========================================================================
// FILE: frontend/src/components/SkeletonLoader.jsx
// ✅ LIGHTWEIGHT: Skeleton loading for dashboard cards
// ========================================================================
export function ChatCardSkeleton() {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg mb-2 animate-pulse">
      {/* Avatar Skeleton */}
      <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700"></div>
      
      {/* Content Skeleton */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
        </div>
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-48"></div>
      </div>
    </div>
  );
}

export function DashboardSkeletons() {
  return (
    <div className="flex-1 overflow-y-auto pb-20">
      {/* Random Chat Skeleton */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-40 mb-3"></div>
        <ChatCardSkeleton />
      </div>

      {/* Friends Skeleton */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
        </div>
        <ChatCardSkeleton />
        <ChatCardSkeleton />
        <ChatCardSkeleton />
      </div>

      {/* Groups Skeleton */}
      <div className="bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
        </div>
        <ChatCardSkeleton />
        <ChatCardSkeleton />
        <ChatCardSkeleton />
      </div>
    </div>
  );
}
