// frontend/src/pages/SubscriptionPage.jsx
// ✅ UPDATED: Dynamic pricing with real-time updates and free mode support
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Crown,
  Check,
  Sparkles,
  Filter,
  Loader,
  Gift,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import BottomNav from "../components/BottomNav";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user, setUser } = useStore();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [price, setPrice] = useState(null);
  const [isFreeMode, setIsFreeMode] = useState(false);
  
  // Promo code state
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => {
    fetchData();
    loadRazorpayScript();
    // ✅ Removed 30-second polling - price is now cached until 3 AM IST
  }, []);

  const fetchCurrentPrice = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscription/price`, {
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setPrice(data.price);
        setIsFreeMode(data.isFree);

        // If price changed to free, notify user
        if (data.isFree && !isFreeMode) {
          toast.success("🎉 Subscriptions are now FREE!");
        }
      }
    } catch (error) {
      console.error("Fetch price error:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch current subscription
      const res = await api.getSubscription();
      const data = await res.json();
      if (res.ok) setSubscription(data.subscription);

      // Fetch current price
      await fetchCurrentPrice();
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async () => {
    setProcessingPayment(true);

    try {
      // Create order
      const orderRes = await api.createSubscriptionOrder({
        tier: "premium",
        duration: "monthly",
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) throw new Error(orderData.message);

      // ✅ Check if free mode
      if (orderData.subscription) {
        toast.success("🎉 Free subscription activated!");

        // Refresh user data
        const userRes = await api.getCurrentUser();
        const userData = await userRes.json();
        if (userRes.ok) setUser(userData.user);

        fetchData();
        setProcessingPayment(false);
        return;
      }

      // Initialize Razorpay for paid subscription
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Random Chat",
        description: "Premium Subscription - Gender Filter Access",
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyRes = await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tier: "premium",
              duration: "monthly",
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) throw new Error(verifyData.message);

            toast.success(
              "🎉 Subscription activated! Check your email for receipt."
            );

            // Update user with new subscription
            const userRes = await api.getCurrentUser();
            const userData = await userRes.json();
            if (userRes.ok) setUser(userData.user);

            fetchData();
          } catch (error) {
            toast.error(error.message);
          }
        },
        prefill: {
          name: user?.username,
          email: user?.email || "",
        },
        theme: {
          color: "#3B82F6",
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error(error.message);
      setProcessingPayment(false);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    setApplyingPromo(true);

    try {
      const res = await api.redeemPromoCode(promoCode.trim());
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to redeem promo code");
      }

      toast.success("🎉 " + data.message);

      // Refresh user data
      const userRes = await api.getCurrentUser();
      const userData = await userRes.json();
      if (userRes.ok) setUser(userData.user);

      // Refresh subscription data
      fetchData();

      // Reset promo code input
      setPromoCode("");
      setShowPromoCode(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setApplyingPromo(false);
    }
  };

  const isPremium = subscription?.tier === "premium";
  const isExpired =
    subscription?.expiresAt && new Date(subscription.expiresAt) < new Date();

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
      <div
        className={`${
          isFreeMode
            ? "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"
            : "bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500"
        } text-white p-4 shadow-lg`}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">
              {isFreeMode ? "🎁 Free Premium Access!" : "Premium Subscription"}
            </h1>
            <p className="text-sm text-white text-opacity-90">
              {isFreeMode ? "Available to everyone" : "Unlock Gender Filter"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* FREE MODE BANNER */}
        {isFreeMode && (
          <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white shadow-xl animate-pulse">
            <div className="flex items-center space-x-3 mb-3">
              <Gift size={40} />
              <div>
                <h2 className="text-2xl font-bold">Limited Time: 100% FREE!</h2>
                <p className="text-sm text-white text-opacity-90">
                  Admin has activated free premium for everyone
                </p>
              </div>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={processingPayment || (isPremium && !isExpired)}
              className="w-full mt-4 bg-white text-green-600 py-3 rounded-xl font-bold text-lg hover:shadow-2xl transition disabled:opacity-50"
            >
              {isPremium && !isExpired
                ? "✓ Already Activated"
                : "Activate Free Premium Now!"}
            </button>
          </div>
        )}

        {/* Current Status */}
        {isPremium && !isExpired && (
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center space-x-3 mb-3">
              <Crown size={32} />
              <div>
                <h2 className="text-2xl font-bold">Premium Active</h2>
                <p className="text-sm text-white text-opacity-90">
                  Gender filter unlocked!
                </p>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 mt-4">
              <p className="text-sm">
                {subscription.duration === "lifetime" ? (
                  "Valid: Lifetime Access"
                ) : (
                  <>
                    Expires:{" "}
                    {new Date(subscription.expiresAt).toLocaleDateString(
                      "en-IN",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </>
                )}
              </p>
              {subscription.paidAmount !== undefined && (
                <p className="text-xs mt-2 text-white text-opacity-80">
                  Amount paid: ₹{subscription.paidAmount}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="text-center mb-6">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 ${
                isFreeMode
                  ? "bg-gradient-to-br from-green-400 to-emerald-500"
                  : "bg-gradient-to-br from-yellow-400 to-orange-500"
              } rounded-full mb-4`}
            >
              {isFreeMode ? (
                <Gift size={40} className="text-white" />
              ) : (
                <Crown size={40} className="text-white" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Premium Features
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {isFreeMode
                ? "Now available to everyone for FREE!"
                : "Get access to exclusive features"}
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                <Check size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Filter size={18} className="text-blue-500" />
                  <span>Gender Filter</span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Choose to match with males or females only. Perfect for
                  focused conversations!
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                <Check size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Smart Fallback
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  If no preferred gender is available within 2 minutes,
                  automatically match with anyone (optional).
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                <Check size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Priority Support
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Get faster response to your queries and issues.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                <Check size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Sparkles size={18} className="text-purple-500" />
                  <span>Premium Badge</span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Show your premium status to other users.
                </p>
              </div>
            </div>
          </div>
        </div>

          {/* Pricing Card */}
          {!isFreeMode && (
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
              {/* Check if price is negative (coming soon) */}
              {price !== null && price < 0 ? (
                <div className="text-center py-8">
                  <Sparkles size={60} className="mx-auto mb-4 animate-pulse" />
                  <h2 className="text-4xl font-bold mb-3">Coming Soon!</h2>
                  <p className="text-lg opacity-90">
                    Premium subscriptions will be available soon
                  </p>
                  <p className="text-sm opacity-75 mt-2">
                    Stay tuned for exciting premium features
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <p className="text-sm opacity-90 mb-2">Monthly Subscription</p>
                    <div className="flex items-baseline justify-center">
                      {price !== null ? (
                        <>
                          <span className="text-5xl font-bold">₹{price}</span>
                          <span className="text-xl ml-2">/month</span>
                        </>
                      ) : (
                        <Loader className="animate-spin" size={40} />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-white text-opacity-90 text-center mb-6">
                    Cancel anytime • No hidden charges
                  </p>

                  {/* Promo Code Section */}
                  <div className="mb-6">
                    <button
                      onClick={() => setShowPromoCode(!showPromoCode)}
                      className="w-full flex items-center justify-between bg-white bg-opacity-20 px-4 py-3 rounded-xl hover:bg-opacity-30 transition"
                    >
                      <div className="flex items-center space-x-2">
                        <Tag size={18} />
                        <span className="text-sm font-medium">Have a promo code?</span>
                      </div>
                      {showPromoCode ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showPromoCode && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                            placeholder="Enter code"
                            className="flex-1 px-4 py-2 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            disabled={applyingPromo}
                          />
                          <button
                            onClick={handleApplyPromoCode}
                            disabled={!promoCode || applyingPromo}
                            className="px-6 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            {applyingPromo ? "Applying..." : "Apply"}
                          </button>
                        </div>
                        <p className="text-xs opacity-75">Get discounts with valid promo codes</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSubscribe}
                    disabled={processingPayment || (isPremium && !isExpired)}
                    className="w-full bg-white text-blue-600 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition disabled:opacity-50"
                  >
                    {processingPayment ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader className="animate-spin" size={20} />
                        <span>Processing...</span>
                      </div>
                    ) : isPremium && !isExpired ? (
                      "Already Subscribed"
                    ) : (
                      "Subscribe Now"
                    )}
                  </button>
                </>
              )}
            </div>
          )}

        {/* FAQ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                How does gender filter work?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                After subscribing, go to Settings and enable gender filter.
                Choose your preferred gender and you'll only match with users of
                that gender.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                What if no one is available?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You can enable "Match anyone if not found" option. If no
                preferred gender is available within 2 minutes, you'll match
                with anyone.
              </p>
            </div>
            {!isFreeMode && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Can I cancel anytime?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Yes! Your subscription is valid for 30 days from purchase. You
                  can continue using the app but won't have access to premium
                  features after expiry.
                </p>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Will I receive a receipt?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yes! You'll receive a detailed email receipt immediately after
                successful payment with all transaction details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="subscription" />
    </div>
  );
}
