// frontend/src/components/admin/AdminLayout.jsx
// ✅ Dark theme layout with sidebar navigation
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Activity,
  Crown,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Trash2,
  BarChart3,
} from "lucide-react";
import { useAdminStore } from "../../store/useAdminStore";
import { adminApi } from "../../lib/adminApi";
import toast from "react-hot-toast";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, clearAdmin } = useAdminStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
      clearAdmin();
      toast.success("Logged out");
      navigate("/admin/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/admin/dashboard",
    },
    {
      icon: Users,
      label: "Users",
      path: "/admin/users",
    },
    {
      icon: MessageCircle,
      label: "Groups",
      path: "/admin/groups",
    },
    {
      icon: Activity,
      label: "System Monitor",
      path: "/admin/system-monitor",
    },
    {
      icon: Crown,
      label: "Subscriptions",
      path: "/admin/subscriptions",
    },
    {
      icon: Trash2,
      label: "Message Cleanup",
      path: "/admin/message-cleanup",
    },
    {
      icon: BarChart3,
      label: "Analytics",
      path: "/admin/analytics",
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/admin/settings",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <Shield className="text-blue-500" size={28} />
              <span className="text-xl font-bold">Admin Panel</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-700 text-gray-300"
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-700">
          <div
            className={`flex items-center ${
              sidebarOpen ? "space-x-3" : "justify-center"
            }`}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="font-bold">
                {admin?.name?.[0]?.toUpperCase() || "A"}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="font-semibold text-sm">{admin?.name}</p>
                <p className="text-xs text-gray-400 capitalize">
                  {admin?.role?.replace("_", " ")}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-900">{children}</main>
    </div>
  );
}
