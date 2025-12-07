// frontend/src/components/admin/StatsCard.jsx
// ✅ Reusable stats card for dashboard
export default function StatsCard({ title, value, icon: Icon, color, trend }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <div
          className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}
        >
          <Icon className="text-white" size={24} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-bold text-white">
          {value.toLocaleString()}
        </p>
        {trend && <p className="text-xs text-gray-400">{trend}</p>}
      </div>
    </div>
  );
}
