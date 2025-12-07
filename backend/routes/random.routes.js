import express from "express";
import * as randomController from "../controllers/random.controller.js";
import { isAuth } from "../middleware/auth.js";
import { checkUserBan } from "../middleware/checkBanStatus.js";

const router = express.Router();

router.post("/join", isAuth, checkUserBan, randomController.joinQueue);
router.post("/leave", isAuth, randomController.leaveQueue);

export default router;
