import { Like } from "../models/likes.models.js";
import { Video } from "../models/videos.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Tweet } from "../models/tweets.models.js";
import { Comment } from "../models/comments.models.js";
import { Notification } from "../models/notification.models.js";
// toggle videoLike...
const toggleVideoReaction = asyncErrorHandler(async (req, res) => {
  const { videoId } = req.params;
  const { type } = req.body; // 'like' or 'dislike'
  console.log(type)
  const userId = req.user._id;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  if (!["like", "dislike"].includes(type)) {
    throw new ApiError(400, "Invalid reaction type");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  // check if user already reacted to this video
  const existingReaction = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  let message = "";

  if (existingReaction) {
    if (existingReaction.type === type) {
      // same reaction again -> remove (toggle off)
      await existingReaction.deleteOne();
      message = `${type} removed successfully`;
    } else {
      // opposite reaction -> update
      existingReaction.type = type;
      await existingReaction.save();
      message = `${type} updated successfully`;
    }
  } else {
    // first-time reaction
    await Like.create({ video: videoId, likedBy: userId, type });
    message = `${type} added successfully`;

    if (type === "like" && String(video.videoOwner._id) !== String(userId)) {
      const notification = await Notification.create({
        reciepent: video.videoOwner._id,
        sender: userId,
        type: "videoLike",
        video: videoId,
        message: `${req.user.username} liked your video "${video.title}"`,
      });
      if (global.io) {
        global.io
          .to(video.videoOwner._id.toString())
          .emit("notification", notification);
      }
    }
  }

  // 🧮 Get updated counts
  const likeCount = await Like.countDocuments({ video: videoId, type: "like" });
  const dislikeCount = await Like.countDocuments({
    video: videoId,
    type: "dislike",
  });

  // 🔥 Emit real-time update (to all connected clients watching this video)
  if (global.io) {
     console.log("📢 Emitting likeDislikeUpdated for video:", videoId);
    global.io.to(videoId).emit("likeDislikeUpdated", {
      videoId,
      likeCount,
      dislikeCount,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { likeCount, dislikeCount }, message));
});


// getLiked videos by the user...
// [CLEAN]
const getLikedVideos = asyncErrorHandler(async (req, res) => {
  const user = req.user._id;
  const likedVideos = await Like.find({ likedBy: user })
    .populate("video", "title thumbnail duration views")
    .select("-updatedAt -__v");
  if (!likedVideos || likedVideos.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No liked videos"));
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

// toggle comment like...
const toggleCommentLike = asyncErrorHandler(async (req, res) => {
  const { commentId } = req.params;
  const likedBy = req.user._id;

  if (!commentId) {
    throw new ApiError(400, "Comment-Id is required");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: likedBy,
  });

  if (existingLike) {
    await Like.deleteOne({ comment: commentId, likedBy: likedBy });
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Comment like removed successfully"));
  }
  const newLikeOnComment = await Like.create({
    comment: commentId,
    likedBy: likedBy,
  });
  // [AFTER]: add only required data to response object...
  const newLikeOnCommentObj = newLikeOnComment.toObject();
  delete newLikeOnCommentObj.__v;
  delete newLikeOnCommentObj.updatedAt;
  res
    .status(200)
    .json(
      new ApiResponse(200, newLikeOnCommentObj, "Liked on comment successfully")
    );
});

const toggleTweetLike = asyncErrorHandler(async (req, res) => {
  const { tweetId } = req.params;
  const tweetLikedBy = req.user._id;
  if (!tweetId) {
    throw new ApiError(400, "Tweet-Id is required");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  const existingLikeOnTweet = await Like.findOne({
    likedBy: tweetLikedBy,
    tweet: tweetId,
  });
  if (existingLikeOnTweet) {
    await Like.deleteOne({
      likedBy: tweetLikedBy,
      tweet: tweetId,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Tweet unliked successfully"));
  }

  const newLikeOnTweet = await Like.create({
    likedBy: tweetLikedBy,
    tweet: tweetId,
  });
  const newLikeOnTweetObj = newLikeOnTweet.toObject();
  delete newLikeOnTweetObj.__v;
  delete newLikeOnTweetObj.updatedAt;
  res
    .status(200)
    .json(new ApiResponse(200, newLikeOnTweetObj, "Tweet liked successfully"));
});

export { toggleVideoReaction, getLikedVideos, toggleCommentLike, toggleTweetLike };
