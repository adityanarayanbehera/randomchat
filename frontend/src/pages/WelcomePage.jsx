// ========================================================================
// FILE: frontend/src/pages/WelcomePage.jsx
// ✅ SIMPLIFIED: Gender selection → Direct buttons (no age input)
// ========================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User2, Users, UserPlus, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import toast from "react-hot-toast";

export default function WelcomePage() {
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const [selectedGender, setSelectedGender] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // ✅ Handle start anonymous chat - no age required
  const handleStartAnonymous = async () => {
    if (!selectedGender) {
      return toast.error("Please select your gender first");
    }

    setLoading(true);
    try {
      const res = await api.createAnonymous({
        gender: selectedGender,
        age: null, // No age required anymore
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create session");
      }

      setUser(data.user);
      toast.success(`Welcome, ${data.user.username}!`);
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle signup redirect
  const handleSignUp = () => {
    if (!selectedGender) {
      return toast.error("Please select your gender first");
    }

    // Store gender for potential autopopulate in signup
    sessionStorage.setItem(
      "tempUserData",
      JSON.stringify({
        gender: selectedGender,
        returnTo: "/dashboard",
      })
    );

    navigate("/signup");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="text-center text-white max-w-2xl">
        <h1 className="text-6xl md:text-7xl font-bold mb-6 animate-fade-in">
          Random Chat
        </h1>
        <p className="text-xl md:text-2xl mb-4 text-blue-100">
          Connect with Strangers Instantly
        </p>
        <p className="text-md mb-8 text-blue-200">
          Free • Anonymous • Safe • Fun
        </p>

        <div className="space-y-4 max-w-md mx-auto">
          {/* ========== GENDER SELECTION ========== */}
          <h2 className="text-2xl font-semibold mb-4">Select Your Gender</h2>

          <button
            onClick={() => setSelectedGender("male")}
            className={`w-full backdrop-blur-md border-2 px-10 py-6 rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3 ${
              selectedGender === "male"
                ? "bg-white bg-opacity-40 border-white shadow-xl"
                : "bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30"
            }`}
          >
            <User2 size={32} />
            <span>Male</span>
          </button>

          <button
            onClick={() => setSelectedGender("female")}
            className={`w-full backdrop-blur-md border-2 px-10 py-6 rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3 ${
              selectedGender === "female"
                ? "bg-white bg-opacity-40 border-white shadow-xl"
                : "bg-white bg-opacity-20 border-white text-white hover:bg-opacity-30"
            }`}
          >
            <Users size={32} />
            <span>Female</span>
          </button>

          {/* ========== ACTION BUTTONS (Show after gender selection) ========== */}
          {selectedGender && (
            <div className="space-y-4 mt-8 animate-fade-in">
              {/* Start Anonymous Button */}
              <button
                onClick={handleStartAnonymous}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white px-8 py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              >
                {loading ? "Starting..." : "Start Chatting Anonymously"}
              </button>

              {/* Signup Button */}
              <button
                onClick={handleSignUp}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center space-x-3 hover:scale-105"
              >
                <UserPlus size={24} />
                <span>Sign Up</span>
              </button>

              {/* Info Text */}
              <p className="text-sm text-blue-100 mt-4">
                ⚡ No sign up required - start chatting instantly!<br />
                Sign up to save your chats and add friends
              </p>

              {/* Reset Button */}
              <button
                onClick={() => setSelectedGender(null)}
                className="text-sm text-blue-200 hover:text-white underline transition"
              >
                Change gender
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-xs text-blue-200">
          <p>
            By continuing, you agree to our{" "}
            <button
              onClick={() => setShowTermsModal(true)}
              className="underline hover:text-white transition font-semibold"
            >
              Terms & Privacy Policy
            </button>
          </p>
          <p className="mt-2">
            <button
              onClick={() => navigate("/blog")}
              className="underline hover:text-white transition font-semibold"
            >
              📖 Read Our Blog - Tips for Safe Random Chatting
            </button>
          </p>
        </div>
      </div>

      {/* ========== TERMS & CONDITIONS MODAL ========== */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Terms & Conditions</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] text-gray-800">
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-gray-600 mb-4">
                  Effective Date: November 26, 2025
                </p>

                <h3 className="text-lg font-bold mt-6 mb-3">1. ACCEPTANCE</h3>
                <p className="mb-4">
                  By using RandomChat, you agree to these terms. If you don't agree,
                  please don't use our service.
                </p>

                <h3 className="text-lg font-bold mt-6 mb-3">2. WHO CAN USE</h3>
                <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>You must be 18+ years old</li>
                  <li>If you're under 18, you need parent/guardian permission</li>
                  <li>One account per person</li>
                </ul>

                <h3 className="text-lg font-bold mt-6 mb-3">3. WHAT YOU CAN'T DO</h3>
                <p className="font-semibold mb-2">Prohibited Content:</p>
                <ul className="list-disc pl-6 mb-3 space-y-1">
                  <li>No nudity, sexual content, or explicit material</li>
                  <li>No violence, hate speech, or harassment</li>
                  <li>No illegal activities (drugs, weapons, etc.)</li>
                  <li>No sharing others' private information</li>
                  <li>No spam or commercial advertising</li>
                </ul>
                <p className="bg-red-50 border-l-4 border-red-500 p-3 mb-4">
                  <strong>If you break these rules:</strong> Your account will be
                  banned immediately.
                </p>

                <h3 className="text-lg font-bold mt-6 mb-3">4. YOUR CONTENT</h3>
                <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>You own what you share</li>
                  <li>We can use it to run the service (store, display, moderate)</li>
                  <li>You're responsible for what you post</li>
                  <li>Don't post copyrighted stuff unless it's yours</li>
                </ul>

                <h3 className="text-lg font-bold mt-6 mb-3">5. PRIVACY & DATA</h3>
                <p className="font-semibold mb-2">What we collect:</p>
                <ul className="list-disc pl-6 mb-3 space-y-1">
                  <li>Username and email (if provided)</li>
                  <li>Device info and IP address (for security)</li>
                  <li>Chat messages (deleted after delivery unless you save them)</li>
                </ul>
                <p className="font-semibold mb-2">What we DON'T do:</p>
                <ul className="list-disc pl-6 mb-3 space-y-1">
                  <li>Sell your data</li>
                  <li>Share with anyone except when legally required</li>
                </ul>
                <p className="font-semibold mb-2">Your rights:</p>
                <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>Delete your account anytime</li>
                  <li>Request your data</li>
                  <li>Opt-out of emails</li>
                </ul>

                <h3 className="text-lg font-bold mt-6 mb-3">
                  6. DISAPPEARING MESSAGES
                </h3>
                <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>You can set messages to auto-delete</li>
                  <li>Once deleted, they're gone forever</li>
                  <li>We don't keep backups</li>
                </ul>

                <h3 className="text-lg font-bold mt-6 mb-3">
                  7. REPORTING & MODERATION
                </h3>
                <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>Report abuse using the report button</li>
                  <li>We review reports within 24-48 hours</li>
                  <li>Serious violations reported to authorities</li>
                </ul>

                <h3 className="text-lg font-bold mt-6 mb-3">
                  8. PAYMENTS (Premium Features)
                </h3>
                <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>Monthly subscription: ₹299</li>
                  <li>Cancel anytime (no refunds for current month)</li>
                  <li>Auto-renewal unless cancelled</li>
                </ul>

                <h3 className="text-lg font-bold mt-6 mb-3">9. NO WARRANTY</h3>
                <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>Service provided "as is"</li>
                  <li>We don't guarantee 100% uptime</li>
                  <li>Not responsible for other users' actions</li>
                  <li>Use at your own risk</li>
                </ul>

                <h3 className="text-lg font-bold mt-6 mb-3">10. LEGAL STUFF</h3>
                <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>Governed by Indian law</li>
                  <li>Disputes handled in Angul, Odisha, India</li>
                  <li>We may update these terms (we'll notify you)</li>
                  <li>Changes effective immediately</li>
                </ul>

                <h3 className="text-lg font-bold mt-6 mb-3">11. TERMINATION</h3>
                <ul className="list-disc pl-6 mb-4 space-y-1">
                  <li>We can suspend/ban accounts for violations</li>
                  <li>You can delete your account anytime</li>
                  <li>No refunds for banned accounts</li>
                </ul>

                <h3 className="text-lg font-bold mt-6 mb-3">12. CONTACT</h3>
                <ul className="list-none mb-4 space-y-1">
                  <li>
                    <strong>Email:</strong> support@randomchat.app
                  </li>
                  <li>
                    <strong>For abuse reports:</strong> report@randomchat.app
                  </li>
                  <li>
                    <strong>Response time:</strong> 24-48 hours
                  </li>
                </ul>
              </div>

              {/* Close Button */}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
