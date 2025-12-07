// backend/routes/search.routes.js
import express from "express";
import * as searchController from "../controllers/search.controller.js";
import { isAuth } from "../middleware/auth.js";

const router = express.Router();

// Main search endpoint
router.get("/", isAuth, searchController.searchAll);

// Quick suggestions (autocomplete)
router.get("/suggestions", isAuth, searchController.getSearchSuggestions);

export default router;
