// frontend/src/pages/ProfilePage.jsx
// ✅ COMPLETE MODERN DESIGN: Crop + Countries + Cities + Progress Ring
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  LogOut,
  Mail,
  User as UserIcon,
  Calendar,
  Camera,
  X,
  Check,
  Loader,
  Users,
  Crown,
  MessageCircle,
  Globe,
} from "lucide-react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Country } from "country-state-city";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import toast from "react-hot-toast";
import ImageCropModal from "../components/ImageCropModal";
import CityAutocomplete from "../components/CityAutocomplete";
import { getAvatarSrc } from "../lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, clearUser } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    age: user?.age || "",
    gender: user?.gender || "male",
    location: user?.location || "",
    country: user?.country || "India",
  });

  const [originalImageFile, setOriginalImageFile] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedImageFile, setCroppedImageFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [checking, setChecking] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Get all countries for dropdown (default India)
  const countries = Country.getAllCountries();

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        age: user.age || "",
        gender: user.gender || "male",
        location: user.location || "",
        country: user.country || "India",
      });
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  // ✅ Calculate profile completion percentage
  const calculateCompletion = () => {
    const fields = [
      user?.username,
      user?.avatar,
      user?.age,
      user?.gender,
      user?.location,
      user?.country,
      user?.email,
    ];

    const filledFields = fields.filter(Boolean).length;
    const percentage = Math.round((filledFields / fields.length) * 100);

    return percentage;
  };

  const completionPercentage = calculateCompletion();

  // ✅ Get progress bar color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage <= 20) return "#EF4444"; // Red
    if (percentage <= 40) return "#F59E0B"; // Orange
    if (percentage <= 60) return "#FBBF24"; // Yellow
    if (percentage <= 80) return "#84CC16"; // Light Green
    return "#22C55E"; // Green
  };

  // ✅ Handle image selection (opens crop modal)
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast.error("Only JPG/PNG images allowed");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setOriginalImageFile(file);
    setShowCropModal(true);
  };

  // ✅ Handle cropped image
  const handleCropComplete = (croppedFile, previewUrl) => {
    setCroppedImageFile(croppedFile);
    setAvatarPreview(previewUrl);
    setShowCropModal(false);
    toast.success("Image cropped! Save changes to upload.");
  };

  // ✅ Check username availability
  const handleCheckUsername = async (username) => {
    if (username === user?.username || username.length < 3) {
      setSuggestions([]);
      return;
    }

    setChecking(true);
    try {
      const res = await api.checkUsername(username);
      const data = await res.json();

      if (!data.available) {
        setSuggestions(data.suggestions || []);
        toast.error("Username not available");
      } else {
        setSuggestions([]);
        toast.success("Username available!");
      }
    } catch (error) {
      console.error("Check username error:", error);
    } finally {
      setChecking(false);
    }
  };

  // ✅ Upload avatar to server
  const uploadAvatar = async () => {
    if (!croppedImageFile) return user?.avatar || null;

    setUploadingAvatar(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("image", croppedImageFile);

      const res = await fetch(`${API_URL}/api/upload/image`, {
        method: "POST",
        credentials: "include",
        body: formDataUpload,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      return data.url;
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar");
      return user?.avatar || null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ✅ Remove avatar
  const handleRemoveAvatar = () => {
    setCroppedImageFile(null);
    setAvatarPreview(null);
  };

  // ✅ Save profile
  const handleSave = async () => {
    setSaving(true);

    try {
      // Upload avatar if changed
      let avatarUrl = avatarPreview;
      if (croppedImageFile) {
        avatarUrl = await uploadAvatar();
      }

      // Update profile
      const res = await api.updateProfile({
        ...formData,
        avatar: avatarUrl,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
        throw new Error(data.message);
      }

      setUser(data.user);
      setIsEditing(false);
      setCroppedImageFile(null);
      toast.success("Profile updated!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ✅ Logout
  const handleLogout = async () => {
    try {
      await api.logout();
      clearUser();
      toast.success("Logged out");
      navigate("/");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">My Profile</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            disabled={saving}
          >
            <Edit2 size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* ✅ Avatar with Circular Progress Ring */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="relative inline-block">
            {/* Progress Ring */}
            <div className="w-40 h-40">
              <CircularProgressbar
                value={completionPercentage}
                text=""
                styles={buildStyles({
                  pathColor: getProgressColor(completionPercentage),
                  trailColor: "#E5E7EB",
                  strokeLinecap: "round",
                })}
                strokeWidth={6}
              />

              {/* Avatar Inside Ring */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-4xl shadow-xl border-4 border-white dark:border-gray-800">
                {avatarPreview || user?.username ? (
                  <img
                    src={avatarPreview || getAvatarSrc(user)}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "?"
                )}
              </div>
            </div>

            {/* Camera Button */}
            {isEditing && (
              <div className="absolute bottom-0 right-0 flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader className="animate-spin" size={20} />
                  ) : (
                    <Camera size={20} />
                  )}
                </button>
                {avatarPreview && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="bg-red-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </div>

          {/* Completion Status */}
          <div className="mt-4">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {completionPercentage}%
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Profile Completed
            </p>
          </div>

          {!isEditing && (
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user?.username}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 capitalize text-sm mt-1">
                {user?.gender} •{" "}
                {user?.age ? `${user.age} years` : "Age not set"}
              </p>
            </div>
          )}
        </div>

        {/* Edit Form */}
        {isEditing ? (
          <div className="space-y-4">
            {/* Username */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  onBlur={(e) => handleCheckUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-white transition-all"
                />
                {checking && (
                  <Loader className="animate-spin text-blue-500" size={24} />
                )}
              </div>
              {suggestions.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-xl">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
                    💡 Available suggestions:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setFormData({ ...formData, username: s });
                          setSuggestions([]);
                        }}
                        className="text-sm bg-white dark:bg-gray-700 px-3 py-1 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-gray-600 transition-all font-medium"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Gender & Age */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  placeholder="Age"
                  min="13"
                  max="100"
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Country Dropdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <div className="relative">
                <Globe
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <select
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 dark:text-white appearance-none"
                >
                  {countries.map((country) => (
                    <option key={country.isoCode} value={country.name}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* City/State Autocomplete */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                City / State
              </label>
              <CityAutocomplete
                value={formData.location}
                onChange={(value) =>
                  setFormData({ ...formData, location: value })
                }
                placeholder="Search for your city or state"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 This will be used for location-based matching
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    username: user?.username || "",
                    age: user?.age || "",
                    gender: user?.gender || "male",
                    location: user?.location || "",
                    country: user?.country || "India",
                  });
                  setAvatarPreview(user?.avatar || null);
                  setCroppedImageFile(null);
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold text-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all shadow-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploadingAvatar}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin" size={24} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={24} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          // View Mode
          <div className="space-y-4">
            {/* Info Cards */}
            {user?.email && (
              <InfoCard
                icon={Mail}
                label="Email"
                value={user.email}
                color="blue"
              />
            )}
            <InfoCard
              icon={Calendar}
              label="Age"
              value={user?.age || "Not set"}
              color="green"
            />
            <InfoCard
              icon={Globe}
              label="Country"
              value={user?.country || "Not set"}
              color="purple"
            />
            {user?.location && (
              <InfoCard
                icon={UserIcon}
                label="City/State"
                value={user.location}
                color="orange"
              />
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {user?.isAnonymous && (
                <button
                  onClick={() => navigate("/signup")}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
                >
                  Sign Up to Save Progress
                </button>
              )}

              <button
                onClick={() => navigate("/settings")}
                className="w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Settings
              </button>

              <button
                onClick={handleLogout}
                className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-red-600 transition-all flex items-center justify-center space-x-2"
              >
                <LogOut size={24} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Crop Modal */}
      {showCropModal && originalImageFile && (
        <ImageCropModal
          imageFile={originalImageFile}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setShowCropModal(false);
            setOriginalImageFile(null);
          }}
        />
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-2xl">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {[
            {
              id: "home",
              icon: MessageCircle,
              label: "Home",
              path: "/dashboard",
            },
            { id: "friends", icon: Users, label: "Friends", path: "/friends" },
            {
              id: "subscription",
              icon: Crown,
              label: "Premium",
              path: "/subscription",
            },
            {
              id: "profile",
              icon: UserIcon,
              label: "Profile",
              path: "/profile",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === "profile";

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center py-3 px-6 transition-all ${
                  isActive
                    ? "text-blue-500 scale-110"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                <Icon size={24} />
                <span className="text-xs mt-1 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ✅ Info Card Component
function InfoCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-500",
    green: "bg-green-100 dark:bg-green-900 text-green-500",
    purple: "bg-purple-100 dark:bg-purple-900 text-purple-500",
    orange: "bg-orange-100 dark:bg-orange-900 text-orange-500",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg flex items-center space-x-4 hover:shadow-xl transition-all">
      <div
        className={`w-12 h-12 ${colors[color]} rounded-xl flex items-center justify-center`}
      >
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="font-bold text-gray-900 dark:text-white truncate text-lg">
          {value}
        </p>
      </div>
    </div>
  );
}
