// backend/routes/friend.routes.js
import express from "express";
import * as friendController from "../controllers/friend.controller.js";
import { isAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/request", isAuth, friendController.sendRequest);
router.get("/requests", isAuth, friendController.getRequests);
router.post("/accept/:requestId", isAuth, friendController.acceptRequest);
router.post("/reject/:requestId", isAuth, friendController.rejectRequest);
router.get("/", isAuth, friendController.getFriends);
router.delete("/:friendId", isAuth, friendController.removeFriend);

export default router;
