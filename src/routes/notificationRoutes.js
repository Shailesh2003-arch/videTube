import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getNotifications, markAsRead } from "../controllers/notification.controller.js";

const router = Router();


router.route("/").get(verifyJWT, getNotifications);
router.route("/:id/read").put(verifyJWT,markAsRead)


export default router;