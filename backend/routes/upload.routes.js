// ==========================================
// FILE 3: backend/routes/upload.routes.js
// ✅ Already correct - no changes needed
// ==========================================

import express from "express";
import {
  uploadImage,
  uploadMiddleware,
} from "../controllers/upload.controller.js";
import { isAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/image", isAuth, uploadMiddleware, uploadImage);

export default router;
