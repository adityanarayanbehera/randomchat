import express from "express";
import * as notificationController from "../controllers/notification.controller.js";
import { isAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", isAuth, notificationController.getNotifications);
router.post("/mark-all-read", isAuth, notificationController.markAllRead);
router.post("/:notificationId/read", isAuth, notificationController.markAsRead);
router.delete("/clear-all", isAuth, notificationController.clearAll);
router.post("/toggle", isAuth, notificationController.toggleNotifications);

export default router;
