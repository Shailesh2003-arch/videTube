import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Comment } from "../models/comments.models.js";
import { Video } from "../models/videos.models.js";

// add comment on a video...
const addComment = asyncErrorHandler(async (req, res) => {
  const { videoId } = req.params;
  const commentBy = req.user._id;

  if (!videoId) {
    throw new ApiError(400, "Video-Id is required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const content = req.body.content?.trim();
  if (!content) {
    throw new ApiError(400, "Comment content is required");
  }
  if (!content.length > 0) {
    throw new ApiError(400, "Comment must be 1 word atleast");
  }

  const newComment = await Comment.create({
    video: videoId,
    comment: content,
    owner: commentBy,
  });
  // [AFTER]: add only required data in response object...
  const newCommentObj = newComment.toObject();
  delete newCommentObj.__v;
  delete newCommentObj.updatedAt;

  res
    .status(201)
    .json(new ApiResponse(200, newCommentObj, "Comment added successfully"));
});

// delete the comment from a video
// [CLEAN]
const deleteComment = asyncErrorHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "Comment-Id is required");
  }
  const comment = await Comment.findByIdAndDelete(commentId);
  if (!comment) {
    return res.status(404).json(new ApiResponse(404, "Comment not found"));
  }
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

// update the comment
const updateComment = asyncErrorHandler(async (req, res) => {
  const { commentId } = req.params;
  const content = req.body.content?.trim();
  if (!commentId) {
    throw new ApiError(400, "Comment-id is required");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      comment: content,
    },
    { new: true }
  );
  // [AFTER]: add only required data to the response object...
  const updatedCommentObj = updatedComment.toObject();
  delete updatedCommentObj.__v;
  res
    .status(200)
    .json(
      new ApiResponse(200, updatedCommentObj, "Comment updated successfully")
    );
});

export { addComment, deleteComment, updateComment };
