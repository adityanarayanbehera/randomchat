// frontend/src/components/SystemMetricsCard.jsx
export default function SystemMetricsCard({ metrics }) {
  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow">
        <div className="text-sm text-gray-500">No metrics available</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">System</h3>
        <div className="text-xs text-gray-500">
          {new Date(metrics.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-sm">
          <div className="text-xs text-gray-500">CPU</div>
          <div className="font-bold">{metrics.cpu.usage}</div>
          <div className="text-xs text-gray-400 truncate">
            {metrics.cpu.model}
          </div>
        </div>

        <div className="text-sm">
          <div className="text-xs text-gray-500">Memory</div>
          <div className="font-bold">{metrics.memory.usagePercent}</div>
          <div className="text-xs text-gray-400">
            {metrics.memory.used} / {metrics.memory.total}
          </div>
        </div>

        <div className="text-sm">
          <div className="text-xs text-gray-500">MongoDB</div>
          <div className="font-bold">{metrics.database.mongodb.status}</div>
          <div className="text-xs text-gray-400">
            Collections: {metrics.database.mongodb.collections}
          </div>
        </div>

        <div className="text-sm">
          <div className="text-xs text-gray-500">Redis</div>
          <div className="font-bold">{metrics.database.redis.status}</div>
          <div className="text-xs text-gray-400">
            Mem: {metrics.database.redis.memory}
          </div>
        </div>
      </div>
    </div>
  );
}
