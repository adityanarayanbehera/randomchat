// backend/controllers/auth.controller.js
// ✅ FIXED: Applied Food Delivery authentication pattern
import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import genToken from "../utils/token.js"; // ✅ MODIFIED: Using genToken (Food Delivery pattern)
import { sendOtpMail } from "../utils/mailer.js";
import { generateUsername } from "../utils/usernameGenerator.js";
// ✅ ADDED: Helper function to set cookie (Food Delivery pattern)
const setCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * CREATE ANONYMOUS USER
 * ✅ MODIFIED: Simplified to match Food Delivery pattern
 */
export const createAnonymous = async (req, res) => {
  try {
    const { gender, age } = req.body;

    if (!gender) {
      return res.status(400).json({ message: "Gender is required" });
    }

    // ✅ MODIFIED: Generate username inline (simpler than separate function)
    // const username = `User_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const username = await generateUsername(gender);
    const user = await User.create({
      username,
      gender,
      age: age || null,
      isAnonymous: true,
    });

    // ✅ ADDED: Generate token and set cookie (Food Delivery pattern)
    const token = await genToken(user._id);
    setCookie(res, token);

    console.log("✅ Anonymous user created:", username);

    return res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        gender: user.gender,
        age: user.age,
        isAnonymous: true,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Create anonymous error:", error);
    return res
      .status(500)
      .json({ message: `Create anonymous error: ${error.message}` });
  }
};

/**
 * SIGNUP (Email/Password)
 * ✅ MODIFIED: Applied Food Delivery pattern exactly
 */
export const signup = async (req, res) => {
  try {
    const { email, password, userId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // ✅ MODIFIED: Check existing user (Food Delivery pattern)
    let user = await User.findOne({ email });
    if (user && !user.isAnonymous) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ MODIFIED: Password validation (Food Delivery pattern)
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // ✅ MODIFIED: Hash password before saving (Food Delivery pattern)
    const hashedPassword = await bcrypt.hash(password, 10);

    if (userId) {
      // ✅ MODIFIED: Upgrade anonymous user
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.email = email;
      user.password = hashedPassword;
      user.isAnonymous = false;
      await user.save();
    } else {
      // ✅ MODIFIED: Create new user (Food Delivery pattern)
      const username = `User_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      user = await User.create({
        username,
        email,
        password: hashedPassword,
        gender: req.body.gender || "male",
        isAnonymous: false,
      });
    }

    // ✅ ADDED: Generate token and set cookie (Food Delivery pattern)
    const token = await genToken(user._id);
    setCookie(res, token);

    console.log("✅ User signed up:", email);

    // ✅ MODIFIED: Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    return res.status(500).json({ message: `Signup error: ${error.message}` });
  }
};

/**
 * SIGNIN (Email/Password)
 * ✅ MODIFIED: Applied Food Delivery pattern exactly
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // ✅ MODIFIED: Find user with password (Food Delivery pattern)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    // ✅ ADDED: Check if password exists (for Google auth users)
    if (!user.password) {
      return res.status(400).json({ message: "Please sign in with Google" });
    }

    // ✅ MODIFIED: Compare password (Food Delivery pattern)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // ✅ ADDED: Update last active
    user.lastActive = Date.now();
    await user.save();

    // ✅ ADDED: Generate token and set cookie (Food Delivery pattern)
    const token = await genToken(user._id);
    setCookie(res, token);

    console.log("✅ User signed in:", email);

    // ✅ MODIFIED: Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ message: `Login error: ${error.message}` });
  }
};

/**
 * GOOGLE AUTH
 * ✅ MODIFIED: Applied Food Delivery pattern exactly
 */
export const googleAuth = async (req, res) => {
  try {
    const { email, displayName, photoURL, googleId, userId } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // ✅ MODIFIED: Find or create user (Food Delivery pattern)
    let user = await User.findOne({ email });

    if (user) {
      // ✅ MODIFIED: Update existing user
      user.lastActive = Date.now();
      // if (photoURL && !user.avatar) user.avatar = photoURL; // REMOVED: Enforcing anonymity, no Google photos
      await user.save();
    } else if (userId) {
      // ✅ MODIFIED: Upgrade anonymous user
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.email = email;
      user.googleId = googleId;
      // user.avatar = photoURL; // REMOVED: Enforcing anonymity
      user.isAnonymous = false;
      await user.save();
    } else {
      // ✅ MODIFIED: Create new user (Food Delivery pattern)
      const username = displayName?.replace(/\s/g, "_") || `User_${Date.now()}`;
      user = await User.create({
        username,
        email,
        googleId,
        // avatar: photoURL, // REMOVED: Enforcing anonymity
        gender: "male",
        isAnonymous: false,
        emailVerified: true,
      });
    }

    // ✅ ADDED: Generate token and set cookie (Food Delivery pattern)
    const token = await genToken(user._id);
    setCookie(res, token);

    console.log("✅ Google auth successful:", email);

    // ✅ MODIFIED: Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("❌ Google auth error:", error);
    return res
      .status(500)
      .json({ message: `Google auth error: ${error.message}` });
  }
};

/**
 * SEND OTP (Forgot Password Step 1)
 * ✅ MODIFIED: 4-digit OTP with expiry
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    // ✅ Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    user.resetOtp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.isOtpVerified = false;
    await user.save();

    // Send email
    await sendOtpMail(email, otp);

    console.log("✅ OTP sent to:", email, "| OTP:", otp); // For development

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      expiresIn: 300, // 5 minutes in seconds
    });
  } catch (error) {
    console.error("❌ Send OTP error:", error);
    return res
      .status(500)
      .json({ message: `Send OTP error: ${error.message}` });
  }
};

/**
 * VERIFY OTP (Forgot Password Step 2)
 * ✅ MODIFIED: 4-digit validation
 */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    // ✅ Validate 4-digit OTP
    if (otp.length !== 4) {
      return res.status(400).json({ message: "OTP must be 4 digits" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.resetOtp) {
      return res
        .status(400)
        .json({ message: "No OTP request found. Please request a new OTP." });
    }

    if (user.otpExpires < Date.now()) {
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark as verified
    user.isOtpVerified = true;
    await user.save();

    console.log("✅ OTP verified:", email);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    return res
      .status(500)
      .json({ message: `Verify OTP error: ${error.message}` });
  }
};

/**
 * RESET PASSWORD (Forgot Password Step 3)
 * ✅ MODIFIED: Auto-login after reset
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email and new password required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (!user || !user.isOtpVerified) {
      return res.status(400).json({ message: "OTP verification required" });
    }

    // Hash and save password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.isOtpVerified = false;
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // ✅ Auto-login: Generate token and set cookie
    const token = await genToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log("✅ Password reset successful:", email);

    // Return user data for auto-login
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return res
      .status(500)
      .json({ message: `Reset password error: ${error.message}` });
  }
};

/**
 * LOGOUT
 * ✅ MODIFIED: Applied Food Delivery pattern exactly
 */
export const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    console.log("✅ User logged out");
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    return res.status(500).json({ message: `Logout error: ${error.message}` });
  }
};

/**
 * GET CURRENT USER
 * ✅ MODIFIED: Applied Food Delivery pattern
 */
export const getCurrentUser = async (req, res) => {
  try {
    // ✅ MODIFIED: Find user without password
    const user = await User.findById(req.userId)
      .populate("friends", "username avatar gender lastActive")
      .select("-password"); // ✅ ADDED: Exclude password

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Current user fetched:", user.username);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ Get current user error:", error);
    return res
      .status(500)
      .json({ message: `Get user error: ${error.message}` });
  }
};
