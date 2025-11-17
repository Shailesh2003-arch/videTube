import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  publishAVideo,
  getVideoById,
  updateVideoDetails,
  deleteVideo,
  getAllVideos,
  getHomePageVideos,
  getUserUploadedVideos,
  getLikedVideos,
} from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/upload").post(
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

router.route("/user").get(getUserUploadedVideos);

router.route("/").get(getAllVideos);
router.route("/liked").get(getLikedVideos);
router.route("/homepage").get(getHomePageVideos);
router.route("/vId/:videoId").get(getVideoById);
router
  .route("/vId/:videoId")
  .patch(upload.single("thumbnail"), updateVideoDetails);
router.route("/vId/:videoId").delete(deleteVideo);
export default router;
