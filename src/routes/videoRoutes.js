import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  publishAVideo,
  getVideoById,
  updateVideoDetails,
} from "../controllers/video.controller.js";

const router = Router();

router.route("/upload").post(
  verifyJWT,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
    {
      name: "videoFile",
      maxCount: 1,
    },
  ]),
  publishAVideo
);

router.route("/vId/:videoId").get(verifyJWT, getVideoById);
router
  .route("/vId/:videoId")
  .patch(verifyJWT, upload.single("thumbnail"), updateVideoDetails);

export default router;
