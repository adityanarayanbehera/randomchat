import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Loader, ArrowLeft, RefreshCw } from "lucide-react";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]); // 4-digit OTP
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Resend OTP timer
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(120); // 120 seconds

  // Auto-focus OTP inputs
  const otpRefs = [
    useState(null)[0],
    useState(null)[0],
    useState(null)[0],
    useState(null)[0],
  ];

  // Timer countdown
  useEffect(() => {
    if (step === 2 && resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, resendTimer]);

  // ===== STEP 1: Send OTP =====
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success("OTP sent to your email");
      setStep(2);
      setResendTimer(120);
      setCanResend(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 2: Resend OTP =====
  const handleResendOtp = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success("New OTP sent!");
      setResendTimer(120);
      setCanResend(false);
      setOtp(["", "", "", ""]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 2: Handle OTP Input =====
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take last digit only
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      otpRefs[index + 1]?.focus();
    }

    // Auto-verify when all 4 digits entered
    if (newOtp.every((digit) => digit) && newOtp.join("").length === 4) {
      handleVerifyOtp(newOtp.join(""));
    }
  };

  // ===== STEP 2: Handle Backspace =====
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1]?.focus();
    }
  };

  // ===== STEP 2: Verify OTP =====
  const handleVerifyOtp = async (otpCode) => {
    setLoading(true);

    try {
      const res = await api.verifyOtp({ email, otp: otpCode });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success("OTP verified!");
      setStep(3);
    } catch (error) {
      toast.error(error.message);
      setOtp(["", "", "", ""]);
      otpRefs[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 3: Reset Password =====
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      const res = await api.resetPassword({ email, newPassword });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      // ✅ Auto-login user
      setUser(data.user);
      toast.success("Password reset successful!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Format timer display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reset Password
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Step {step} of 3
          </p>
        </div>

        {/* ===== STEP 1: Email Input ===== */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
                  required
                />
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
                "Send 4-Digit Code"
              )}
            </button>

            <Link
              to="/login"
              className="block text-center text-sm text-blue-600 hover:underline mt-4"
            >
              ← Back to Login
            </Link>
          </form>
        )}

        {/* ===== STEP 2: OTP Input ===== */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter the 4-digit code sent to
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {email}
              </p>
            </div>

            {/* OTP Boxes */}
            <div className="flex justify-center space-x-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition"
                  disabled={loading}
                />
              ))}
            </div>

            {/* Resend Button */}
            <div className="text-center">
              {canResend ? (
                <button
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center justify-center space-x-1 mx-auto disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  <span>Resend OTP</span>
                </button>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Resend OTP in{" "}
                  <span className="font-semibold text-blue-600">
                    {formatTime(resendTimer)}
                  </span>
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setStep(1);
                setOtp(["", "", "", ""]);
              }}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center space-x-1 mx-auto"
            >
              <ArrowLeft size={16} />
              <span>Change Email</span>
            </button>
          </div>
        )}

        {/* ===== STEP 3: New Password ===== */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Password must be at least 6 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? (
                <Loader className="animate-spin mx-auto" size={20} />
              ) : (
                "Reset Password & Login"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
