import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Comment } from "../models/comments.models.js";
import { Video } from "../models/videos.models.js";

// add comment on a video...
const addComment = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { text } = req.body;
    const userId = req.user?._id;

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot be empty",
      });
    }

    const newComment = await Comment.create({ video: videoId, owner: userId, text });

    const populatedComment = await Comment.findById(newComment._id)
      .populate("owner", "username avatar")
      .lean();

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: populatedComment, // ✅ changed here
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};



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


const getVideoComments = async (req, res) => {
  try {
    const { videoId } = req.params;
    const comments = await Comment.find({ video:videoId })
      .populate("owner", "username avatar") // get user info
      .sort({ createdAt: -1 }); // newest first
return res
  .status(200)
  .json(new ApiResponse(200, comments, "Comments fetched succesfully"));
      } catch (error) {
    console.error("Error fetching comments:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch comments" });
  }
};


export { addComment, deleteComment, updateComment, getVideoComments };
