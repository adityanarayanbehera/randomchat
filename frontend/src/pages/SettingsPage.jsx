// frontend/src/pages/SettingsPage.jsx
// ✅ FINAL: Persistent settings like notifications, no dark mode, optimized
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Shield,
  Trash2,
  Filter,
  Crown,
  CheckSquare,
  Square,
  Loader,
  Save,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, setUser, clearUser } = useStore();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    genderFilterEnabled: false,
    genderPreference: "any",
    fallbackToRandom: true,
  });

  // ✅ Load settings ONCE on mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    setLoading(true);
    try {
      // Fetch subscription
      const subRes = await api.getSubscription();
      const subData = await subRes.json();
      if (subRes.ok) {
        setSubscription(subData.subscription);
      }

      // Use existing user from store (no extra API call)
      if (user?.settings) {
        setSettings({
          notifications: user.settings.notifications ?? true,
          genderFilterEnabled: user.settings.genderFilterEnabled || false,
          genderPreference: user.settings.genderPreference || "any",
          fallbackToRandom: user.settings.fallbackToRandom ?? true,
        });
        console.log("✅ Settings loaded from store");
      }
    } catch (error) {
      console.error("❌ Load settings error:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      console.log("💾 Saving settings:", settings);

      const res = await fetch(`${API_URL}/api/user/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save settings");
      }

      // ✅ Update global user state
      setUser(data.user);

      console.log("✅ Settings saved successfully");
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("❌ Save settings error:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure? This action cannot be undone.")) return;

    try {
      const res = await api.deleteAccount();
      if (!res.ok) throw new Error("Delete failed");

      clearUser();
      toast.success("Account deleted");
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const isPremium = subscription?.tier === "premium";
  const isExpired =
    subscription?.expiresAt && new Date(subscription.expiresAt) < new Date();
  const hasGenderFilter = user?.settings?.hasGenderFilter && !isExpired;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* Subscription Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-lg mb-3 flex items-center space-x-2 dark:text-white">
            <Shield size={20} className="text-yellow-500" />
            <span>Subscription</span>
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold capitalize dark:text-gray-200">
                {isPremium && !isExpired ? (
                  <span className="flex items-center space-x-2">
                    <Crown className="text-yellow-500" size={18} />
                    <span>Premium Plan</span>
                  </span>
                ) : (
                  "Free Plan"
                )}
              </p>
              {subscription?.expiresAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isExpired
                    ? "Expired"
                    : `Expires: ${new Date(
                        subscription.expiresAt
                      ).toLocaleDateString()}`}
                </p>
              )}
            </div>
            {(!isPremium || isExpired) && (
              <button
                onClick={() => navigate("/subscription")}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-lg mb-4 dark:text-white">General</h2>

          <div className="space-y-4">
            {/* Notifications Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <Bell size={20} className="text-gray-700 dark:text-gray-300" />
                <div>
                  <p className="dark:text-gray-200 font-medium">
                    Notifications
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get notified about messages and friend requests
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    notifications: !settings.notifications,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  settings.notifications ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings.notifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>

            </div>

            {/* Blog / Safety Center Link */}
            <div className="border-t border-gray-200 dark:border-gray-700 py-3">
              <button
                onClick={() => navigate("/blog")}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 p-2 rounded-lg">
                    <Shield size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="dark:text-gray-200 font-medium group-hover:text-blue-500 transition">
                      Safety Center & Blog
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Read safety tips and platform updates
                    </p>
                  </div>
                </div>
                <div className="text-gray-400 dark:text-gray-500">
                  <ArrowLeft size={18} className="rotate-180" />
                </div>
              </button>
            </div>

            {/* Gender Filter (Premium Only) */}
            {hasGenderFilter ? (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Filter size={20} className="text-purple-500" />
                    <h3 className="font-semibold dark:text-white">
                      Gender Filter
                    </h3>
                    <Crown size={16} className="text-yellow-500" />
                  </div>

                  {/* Enable/Disable Filter */}
                  <div className="flex items-center justify-between py-2 mb-3">
                    <div>
                      <p className="dark:text-gray-200 font-medium">
                        Enable Gender Filter
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Match only with your preferred gender
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          genderFilterEnabled: !settings.genderFilterEnabled,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        settings.genderFilterEnabled
                          ? "bg-purple-600"
                          : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.genderFilterEnabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {settings.genderFilterEnabled && (
                    <>
                      {/* Gender Preference Buttons */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Match with:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {["any", "male", "female"].map((pref) => (
                            <button
                              key={pref}
                              onClick={() =>
                                setSettings({
                                  ...settings,
                                  genderPreference: pref,
                                })
                              }
                              className={`py-2 px-3 rounded-lg font-medium capitalize transition text-sm ${
                                settings.genderPreference === pref
                                  ? "bg-purple-600 text-white"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                              }`}
                            >
                              {pref === "any" ? "Anyone" : pref}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Fallback Option */}
                      {settings.genderPreference !== "any" && (
                        <div className="bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                          <button
                            onClick={() =>
                              setSettings({
                                ...settings,
                                fallbackToRandom: !settings.fallbackToRandom,
                              })
                            }
                            className="flex items-start space-x-3 w-full text-left"
                          >
                            {settings.fallbackToRandom ? (
                              <CheckSquare
                                size={18}
                                className="text-purple-600 flex-shrink-0 mt-0.5"
                              />
                            ) : (
                              <Square
                                size={18}
                                className="text-gray-400 flex-shrink-0 mt-0.5"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-xs dark:text-white">
                                Match anyone if not found
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                After 2 minutes, match with any available user
                              </p>
                            </div>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900 dark:bg-opacity-30 p-2 rounded mt-3">
                    💎 Premium Feature
                  </p>
                </div>
              </>
            ) : (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  onClick={() => navigate("/subscription")}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg p-3 flex items-center justify-between hover:shadow-lg transition"
                >
                  <div className="flex items-center space-x-3">
                    <Filter size={20} />
                    <div className="text-left">
                      <p className="font-semibold text-sm">Gender Filter</p>
                      <p className="text-xs opacity-90">
                        Match with preferred gender
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Crown size={18} />
                    <span className="text-xs font-semibold">Upgrade</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-md"
        >
          {saving ? (
            <>
              <Loader className="animate-spin" size={20} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Save Settings</span>
            </>
          )}
        </button>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h2 className="font-bold text-lg text-red-600 dark:text-red-400 mb-3">
            Danger Zone
          </h2>
          <button
            onClick={handleDeleteAccount}
            className="w-full bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition flex items-center justify-center space-x-2"
          >
            <Trash2 size={18} />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
