// backend/controllers/subscription.controller.js
// ✅ UPDATED: With email billing and dynamic pricing + Redis caching

import crypto from "crypto";
import User from "../models/User.model.js";
import { SUBSCRIPTION_PRICES } from "../config/prices.js";
import { sendSubscriptionEmail } from "../utils/mailer.js";
import { redisClient } from "../config/redis.js";

const DEV_MODE = process.env.NODE_ENV === "development";

// Helper: Calculate seconds until next 3 AM IST
const getSecondsUntil3AM = () => {
  const now = new Date();
  const next3AM = new Date();
  next3AM.setHours(3, 0, 0, 0);
  
  // If it's past 3 AM today, set for tomorrow
  if (now.getHours() >= 3) {
    next3AM.setDate(next3AM.getDate() + 1);
  }
  
  return Math.floor((next3AM - now) / 1000);
};

// ✅ Get Current Price (Public endpoint with Redis cache)
export const getCurrentPrice = async (req, res) => {
  try {
    // Check Redis cache first
    const cachedPrice = await redisClient.get("subscription:price");
    
    if (cachedPrice) {
      const priceData = JSON.parse(cachedPrice);
      return res.status(200).json({
        success: true,
        ...priceData,
        cached: true,
      });
    }

    // If not cached, get from config and cache it
    const price = SUBSCRIPTION_PRICES.tier1?.monthly || 299;
    const priceData = {
      price,
      isFree: price === 0,
    };

    // Cache until next 3 AM IST
    const ttl = getSecondsUntil3AM();
    await redisClient.set("subscription:price", JSON.stringify(priceData), { EX: ttl });

    res.status(200).json({
      success: true,
      ...priceData,
      cached: false,
    });
  } catch (error) {
    console.error("❌ Get price error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      price: 299,
      isFree: false,
    });
  }
};

// Create Order
export const createOrder = async (req, res) => {
  try {
    const { duration } = req.body;

    if (!["monthly", "yearly"].includes(duration)) {
      return res.status(400).json({ message: "Invalid duration" });
    }

    // Get current price
    const amount = SUBSCRIPTION_PRICES.tier1[duration] * 100; // Convert to paise

    // ✅ Check if price is 0 (free mode)
    if (SUBSCRIPTION_PRICES.tier1.monthly === 0) {
      const expiryMonths = duration === "monthly" ? 1 : 12;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);

      await User.findByIdAndUpdate(req.userId, {
        "subscription.tier": "premium",
        "subscription.duration": duration,
        "subscription.expiresAt": expiresAt,
        "subscription.paymentId": "FREE_SUBSCRIPTION",
        "subscription.activatedAt": new Date(),
        "settings.hasGenderFilter": true,
        "settings.genderFilterEnabled": false,
        "settings.genderPreference": "any",
        "settings.fallbackToRandom": true,
      });

      // Send free subscription email
      const user = await User.findById(req.userId).select("username email");

      try {
        await sendSubscriptionEmail({
          email: user.email || `${user.username}@temp.com`,
          username: user.username,
          amount: 0,
          duration: duration === "monthly" ? "Monthly" : "Yearly",
          transactionId: "FREE_SUBSCRIPTION",
          expiryDate: expiresAt.toLocaleDateString("en-IN"),
          isFree: true,
        });
      } catch (emailError) {
        console.error("❌ Email error:", emailError);
      }

      return res.status(200).json({
        success: true,
        message: "Free subscription activated!",
        subscription: {
          tier: "premium",
          duration,
          expiresAt,
        },
      });
    }

    // 🧩 Skip Razorpay in dev mode
    if (DEV_MODE) {
      return res.status(200).json({
        success: true,
        message: "Mock order created (DEV MODE)",
        orderId: "fake_order_" + Date.now(),
        amount,
        currency: "INR",
        keyId: "dev_key_mock",
      });
    }

    // ---- REAL Razorpay logic ----
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `sub_${req.userId}_${Date.now()}`,
      notes: { userId: req.userId, duration },
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify Payment and Activate Subscription
export const verifyPayment = async (req, res) => {
  try {
    const {
      duration = "monthly",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // Get current price at time of payment
    const paidAmount = SUBSCRIPTION_PRICES.tier1[duration];

    // 🧩 Skip signature verification in dev mode
    if (DEV_MODE) {
      const expiryMonths = duration === "monthly" ? 1 : 12;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);

      await User.findByIdAndUpdate(req.userId, {
        "subscription.tier": "premium",
        "subscription.duration": duration,
        "subscription.expiresAt": expiresAt,
        "subscription.paymentId": "fake_payment_dev_" + Date.now(),
        "subscription.activatedAt": new Date(),
        "subscription.paidAmount": paidAmount,
        "settings.hasGenderFilter": true,
        "settings.genderFilterEnabled": false,
        "settings.genderPreference": "any",
        "settings.fallbackToRandom": true,
      });

      // Send email
      const user = await User.findById(req.userId).select("username email");

      try {
        await sendSubscriptionEmail({
          email: user.email || `${user.username}@temp.com`,
          username: user.username,
          amount: paidAmount,
          duration: duration === "monthly" ? "Monthly" : "Yearly",
          transactionId: "fake_payment_dev_" + Date.now(),
          expiryDate: expiresAt.toLocaleDateString("en-IN"),
          isFree: false,
        });
      } catch (emailError) {
        console.error("❌ Email error:", emailError);
      }

      return res.status(200).json({
        success: true,
        message: "Subscription activated (DEV MODE) - Gender filter unlocked!",
        subscription: {
          tier: "premium",
          duration,
          expiresAt,
        },
      });
    }

    // ---- REAL Razorpay verification ----
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const { duration: orderDuration } = order.notes;

    const expiryMonths = orderDuration === "monthly" ? 1 : 12;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);

    await User.findByIdAndUpdate(req.userId, {
      "subscription.tier": "premium",
      "subscription.duration": orderDuration,
      "subscription.expiresAt": expiresAt,
      "subscription.paymentId": razorpay_payment_id,
      "subscription.activatedAt": new Date(),
      "subscription.paidAmount": paidAmount,
      "settings.hasGenderFilter": true,
      "settings.genderFilterEnabled": false,
      "settings.genderPreference": "any",
      "settings.fallbackToRandom": true,
    });

    // ✅ Send subscription email
    const user = await User.findById(req.userId).select("username email");

    try {
      await sendSubscriptionEmail({
        email: user.email || `${user.username}@temp.com`,
        username: user.username,
        amount: paidAmount,
        duration: orderDuration === "monthly" ? "Monthly" : "Yearly",
        transactionId: razorpay_payment_id,
        expiryDate: expiresAt.toLocaleDateString("en-IN"),
        isFree: false,
      });
      console.log("✅ Subscription email sent successfully");
    } catch (emailError) {
      console.error("❌ Email send failed:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Subscription activated - Gender filter unlocked!",
      subscription: {
        tier: "premium",
        duration: orderDuration,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Subscription Status
export const getSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "subscription settings"
    );

    // Check if subscription expired
    if (
      user.subscription.expiresAt &&
      new Date() > new Date(user.subscription.expiresAt)
    ) {
      // ✅ Disable gender filter access on expiry
      user.subscription.tier = "free";
      user.subscription.expiresAt = null;
      user.settings.hasGenderFilter = false;
      user.settings.genderFilterEnabled = false;
      await user.save();
    }

    res.status(200).json({
      success: true,
      subscription: user.subscription,
      hasGenderFilter: user.settings?.hasGenderFilter || false,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Redeem Promo Code
export const redeemPromoCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        message: "Promo code is required",
      });
    }

    // Import PromoCode model
    const PromoCode = (await import("../models/PromoCode.model.js")).default;

    // Find promo code (case-insensitive)
    const promoCode = await PromoCode.findOne({
      code: code.toUpperCase().trim(),
    });

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Invalid promo code",
      });
    }

    // Check if promo code is valid
    const validation = promoCode.isValid();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason,
      });
    }

    // Check if user has already used this code
    if (promoCode.hasUserUsed(req.userId)) {
      return res.status(400).json({
        success: false,
        message: "You have already used this promo code",
      });
    }

    // Get user
    const user = await User.findById(req.userId);

    // Calculate new expiry date (1 month from now or extend existing)
    let expiresAt;
    const currentSubscription = user.subscription;

    if (
      currentSubscription?.tier === "premium" &&
      currentSubscription?.expiresAt &&
      new Date(currentSubscription.expiresAt) > new Date()
    ) {
      // Extend existing subscription by 1 month
      expiresAt = new Date(currentSubscription.expiresAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      // Start new 1-month subscription
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Update user subscription
    await User.findByIdAndUpdate(req.userId, {
      "subscription.tier": "premium",
      "subscription.duration": "monthly",
      "subscription.expiresAt": expiresAt,
      "subscription.paymentId": `PROMO_${promoCode.code}`,
      "subscription.activatedAt": new Date(),
      "subscription.paidAmount": 0,
      "settings.hasGenderFilter": true,
      "settings.genderFilterEnabled": false,
      "settings.genderPreference": "any",
      "settings.fallbackToRandom": true,
    });

    // Mark promo code as used by this user
    await promoCode.redeemForUser(req.userId);

    // Send email notification
    try {
      await sendSubscriptionEmail({
        email: user.email || `${user.username}@temp.com`,
        username: user.username,
        amount: 0,
        duration: "Monthly",
        transactionId: `PROMO_${promoCode.code}`,
        expiryDate: expiresAt.toLocaleDateString("en-IN"),
        isFree: true,
      });
    } catch (emailError) {
      console.error("❌ Email error:", emailError);
    }

    console.log(
      `🎉 Promo code redeemed: ${promoCode.code} by user ${req.userId}`
    );

    res.status(200).json({
      success: true,
      message: "Promo code redeemed successfully! 1 month premium activated.",
      subscription: {
        tier: "premium",
        duration: "monthly",
        expiresAt,
      },
    });
  } catch (error) {
    console.error("❌ Redeem promo code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to redeem promo code",
    });
  }
};
