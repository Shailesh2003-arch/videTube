import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  toggleVideoReaction,
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
} from "../controllers/like.controllers.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle/v/:videoId").post(toggleVideoReaction);
router.route("/videos").get(getLikedVideos);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);

export default router;
