import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  getCurrentUser,
  updateExistingDetailsOfUser,
  changeCurrentPassword,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

// secured routes
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/profile").get(verifyJWT, getCurrentUser);
router.route("/update-profile").patch(verifyJWT, updateExistingDetailsOfUser);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
  .route("/update-coverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
router.route("/reset-password").patch(verifyJWT, changeCurrentPassword);

router.route("/:username").get(verifyJWT, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getUserWatchHistory);

export default router;
