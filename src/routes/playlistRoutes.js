import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.js";
import {
  createPlaylist,
  addVideoToPlaylist,
  removeVideoFromAPlaylist,
  getPlaylistById,
  deletePlaylist,
  updatePlaylistDetails,
  getUserPlaylists,
} from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(upload.single("thumbnail"), createPlaylist);
router.route("/add/:playlistId/:videoId").patch(addVideoToPlaylist);
router.route("/remove/:playlistId/:videoId").patch(removeVideoFromAPlaylist);

router
  .route("/:playlistId")
  .get(getPlaylistById)
  .delete(deletePlaylist)
  .patch(updatePlaylistDetails);

router.route("/user/:userId").get(getUserPlaylists);

export default router;
