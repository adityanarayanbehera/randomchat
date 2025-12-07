// frontend/src/pages/admin/AdminSettingsPage.jsx
// ✅ Create admins, manage roles, change password
import { useState, useEffect } from "react";
import {
  UserPlus,
  Shield,
  Trash2,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  X,
  Tag,
} from "lucide-react";
import { useAdminStore } from "../../store/useAdminStore";
import AdminLayout from "../../components/admin/AdminLayout";
import PromoCodeManager from "../../components/admin/PromoCodeManager";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AdminSettingsPage() {
  const { admin } = useAdminStore();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [activeTab, setActiveTab] = useState("admins");

  // Create Admin Form
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    secretCode: "",
    role: "admin",
  });

  // Change Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    create: false,
    secret: false,
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/all`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setAdmins(data.admins || []);
    } catch (error) {
      toast.error("Failed to load admins");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();

    if (createForm.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    if (createForm.secretCode.length < 6) {
      return toast.error("Secret code must be at least 6 characters");
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(createForm),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success("Admin created successfully!");
      setShowCreateForm(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        secretCode: "",
        role: "admin",
      });
      fetchAdmins();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!confirm(`Delete admin "${adminName}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/${adminId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Delete failed");

      toast.success(`Admin "${adminName}" deleted`);
      fetchAdmins();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    if (passwordForm.newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success("Password changed successfully!");
      setShowPasswordForm(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const isSuperAdmin = admin?.role === "super_admin";

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Settings</h1>
            <p className="text-gray-400 mt-1">
              Manage admin accounts and settings
            </p>
          </div>
          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab("admins")}
            className={`px-4 py-2 font-medium transition ${
              activeTab === "admins"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Shield size={18} />
              <span>Admin Management</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("promo")}
            className={`px-4 py-2 font-medium transition ${
              activeTab === "promo"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Tag size={18} />
              <span>Promo Codes</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "admins" && (
          <div className="space-y-6">
            {/* Change Password (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Key size={24} className="text-blue-500" />
                <span>Change Your Password</span>
              </h2>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {showPasswordForm ? "Cancel" : "Change Password"}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          current: !showPasswords.current,
                        })
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPasswords.current ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          new: !showPasswords.new,
                        })
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPasswords.new ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          confirm: !showPasswords.confirm,
                        })
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPasswords.confirm ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                >
                  <Check size={20} />
                  <span>Update Password</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Create Admin (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <UserPlus size={24} className="text-green-500" />
                <span>Create New Admin</span>
              </h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {showCreateForm ? "Cancel" : "Create Admin"}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Admin Name"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.create ? "text" : "password"}
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          password: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          create: !showPasswords.create,
                        })
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPasswords.create ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Secret Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Secret Code (min 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.secret ? "text" : "password"}
                      value={createForm.secretCode}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          secretCode: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          secret: !showPasswords.secret,
                        })
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPasswords.secret ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, role: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                >
                  <UserPlus size={20} />
                  <span>Create Admin</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Admin List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">All Admins</h2>
          </div>

          <div className="divide-y divide-gray-700">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw
                  className="animate-spin mx-auto text-blue-500"
                  size={32}
                />
              </div>
            ) : admins.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No admins found
              </div>
            ) : (
              admins.map((adm) => (
                <div
                  key={adm._id}
                  className="p-4 flex items-center justify-between hover:bg-gray-700 transition"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        adm.role === "super_admin"
                          ? "bg-gradient-to-br from-yellow-500 to-orange-600"
                          : "bg-gradient-to-br from-blue-500 to-purple-600"
                      }`}
                    >
                      <Shield size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{adm.name}</p>
                      <p className="text-sm text-gray-400">{adm.email}</p>
                      <p className="text-xs text-gray-500 capitalize mt-1">
                        {adm.role.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  {isSuperAdmin && adm._id !== admin._id && (
                    <button
                      onClick={() => handleDeleteAdmin(adm._id, adm.name)}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
          </div>
        )}

        {/* Promo Codes Tab */}
        {activeTab === "promo" && <PromoCodeManager />}
      </div>
    </AdminLayout>
  );
}
