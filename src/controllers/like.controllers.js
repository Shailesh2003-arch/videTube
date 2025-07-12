import { Like } from "../models/likes.models.js";
import { Video } from "../models/videos.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Comment } from "../models/comments.models.js";

// toggle videoLike...
const toggleVideoLike = asyncErrorHandler(async (req, res) => {
  const { videoId } = req.params;
  const likedByUser = req.user._id;
  if (!videoId) {
    throw new ApiError(400, "video-Id required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  const likedAlready = await Like.findOne({
    likedBy: likedByUser,
    video: videoId,
  });
  if (likedAlready) {
    await Like.deleteOne({ likedBy: likedByUser });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video unliked successfully 🚫❤️"));
  }
  const newLike = await Like.create({
    video: videoId,
    likedBy: likedByUser,
  });

  res
    .status(200)
    .json(new ApiResponse(200, newLike, "Video liked successfully ❤️"));
});

// getLiked videos by the user...
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
      .json(new ApiResponse(200, null, "Comment like removed successfully ✅"));
  }
  const newLikeOnComment = await Like.create({
    comment: commentId,
    likedBy: likedBy,
  });
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newLikeOnComment,
        "Liked on comment successfully ❤️✅"
      )
    );
});

export { toggleVideoLike, getLikedVideos, toggleCommentLike };
