// frontend/src/pages/admin/AdminLoginPage.jsx
// ✅ Dark theme admin login with secret code
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Key, Eye, EyeOff, Loader } from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import { useAdminStore } from "../../store/useAdminStore";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setAdmin } = useAdminStore();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    secretCode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.secretCode) {
      return toast.error("All fields are required");
    }

    setLoading(true);

    try {
      const res = await adminApi.login(
        formData.email,
        formData.password,
        formData.secretCode
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      setAdmin(data.admin);
      toast.success("Login successful!");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 bg-gray-800 bg-opacity-90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-gray-400 text-sm">
            Secure access for administrators only
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="admin@example.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Secret Code */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Secret Code
            </label>
            <div className="relative">
              <Key
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type={showSecretCode ? "text" : "password"}
                value={formData.secretCode}
                onChange={(e) =>
                  setFormData({ ...formData, secretCode: e.target.value })
                }
                placeholder="Enter secret code"
                className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecretCode(!showSecretCode)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showSecretCode ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              🔒 This code is required for admin access
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Shield size={20} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 p-3 bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg">
          <p className="text-xs text-yellow-400 text-center">
            ⚠️ Unauthorized access is strictly prohibited and logged
          </p>
        </div>
      </div>
    </div>
  );
}
