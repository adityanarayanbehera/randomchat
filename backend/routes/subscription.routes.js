// // backend/routes/subscription.routes.js
// import express from "express";
// import * as subscriptionController from "../controllers/subscription.controller.js";
// import { isAuth } from "../middleware/auth.js";

// const router = express.Router();

// router.post("/create-order", isAuth, subscriptionController.createOrder);
// router.post("/verify", isAuth, subscriptionController.verifyPayment);
// router.get("/status", isAuth, subscriptionController.getSubscription);

// export default router;

// backend/routes/subscription.routes.js
import express from "express";
import { isAuth } from "../middleware/auth.js";

const router = express.Router();

// Import controllers
import {
  getCurrentPrice,
  createOrder,
  verifyPayment,
  getSubscription,
  redeemPromoCode,
} from "../controllers/subscription.controller.js";

// ✅ Public route to get current price
router.get("/price", getCurrentPrice);

// Protected routes
router.post("/create-order", isAuth, createOrder);
router.post("/verify", isAuth, verifyPayment);
router.get("/status", isAuth, getSubscription);
router.post("/redeem-promo", isAuth, redeemPromoCode);

export default router;
