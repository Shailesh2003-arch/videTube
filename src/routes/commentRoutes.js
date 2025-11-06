import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComment,
  updateComment,
  getVideoComments, likeComment, dislikeComment
} from "../controllers/comment.controllers.js";

const router = Router();
router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments).post(addComment);
router.route("/comment/:commentId").delete(deleteComment).patch(updateComment);
router.route("/:commentId/like").post(likeComment)
router.route("/:commentId/dislike").post(dislikeComment)

export default router;
