// frontend/src/pages/SignupPage.jsx
// ✅ UPDATED: Autopopulate data from welcome page session
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Loader, ArrowLeft } from "lucide-react";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import { signInWithGoogle } from "../lib/firebase";
import toast from "react-hot-toast";

export default function SignupPage() {
  const navigate = useNavigate();
  const { user, setUser } = useStore();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    gender: "male",
    age: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [returnTo, setReturnTo] = useState("/dashboard");

  // ✅ NEW: Autopopulate from session storage
  useEffect(() => {
    const tempData = sessionStorage.getItem("tempUserData");
    if (tempData) {
      try {
        const parsed = JSON.parse(tempData);
        setFormData((prev) => ({
          ...prev,
          gender: parsed.gender || "male",
          age: parsed.age || "",
        }));
        setReturnTo(parsed.returnTo || "/dashboard");

        // Show info toast
        toast.success("Gender and age pre-filled from welcome page!", {
          icon: "✨",
          duration: 2000,
        });
      } catch (error) {
        console.error("Error parsing temp data:", error);
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    if (formData.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      const res = await api.signup({
        email: formData.email,
        password: formData.password,
        gender: formData.gender,
        age: formData.age ? parseInt(formData.age) : null,
        userId: user?._id,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Signup failed");
      }

      setUser(data.user);

      // Clear session storage
      sessionStorage.removeItem("tempUserData");

      toast.success("Account created successfully!");
      navigate(returnTo);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);

    try {
      const result = await signInWithGoogle();

      if (!result.success) {
        throw new Error(result.error);
      }

      const res = await api.googleAuth({
        ...result.user,
        userId: user?._id,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Google signup failed");
      }

      setUser(data.user);

      // Clear session storage
      sessionStorage.removeItem("tempUserData");

      toast.success("Signed up with Google!");
      navigate(returnTo);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipSignup = () => {
    // Clear session storage and go back
    sessionStorage.removeItem("tempUserData");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* ✅ Back Button */}
        <button
          onClick={handleSkipSignup}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Skip and chat anonymously</span>
        </button>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join Random Chat today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {/* ✅ Gender Field (Autopopulated) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender{" "}
              {formData.gender && (
                <span className="text-green-600 text-xs">✓ Pre-filled</span>
              )}
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* ✅ Age Field (Autopopulated) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Age (optional){" "}
              {formData.age && (
                <span className="text-green-600 text-xs">✓ Pre-filled</span>
              )}
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="Enter your age"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              min="13"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password (min 6 chars)"
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? (
              <Loader className="animate-spin mx-auto" size={20} />
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="text-center mt-6 text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
