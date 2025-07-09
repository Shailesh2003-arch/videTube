import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createPlaylist,
  addVideoToPlaylist,
  removeVideoFromAPlaylist,
  getPlaylistById,
  deletePlaylist,
  updatePlaylistDetails,
} from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist);
router.route("/add/:playlistId/:videoId").patch(addVideoToPlaylist);
router.route("/remove/:playlistId/:videoId").patch(removeVideoFromAPlaylist);

router
  .route("/:playlistId")
  .get(getPlaylistById)
  .delete(deletePlaylist)
  .patch(updatePlaylistDetails);

export default router;
