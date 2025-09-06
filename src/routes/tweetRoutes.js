import Router from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.js";
import {
  createTweet,
  deleteTweet,
  updateTweet,
  getUserTweets,
  getAllTweets,
} from "../controllers/tweet.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/create").post(upload.single("image"), createTweet);
router.route("/tweets").get(getAllTweets);
router.route("/:userId").get(getUserTweets);
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

export default router;
