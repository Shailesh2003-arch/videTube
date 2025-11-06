import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Comment } from "../models/comments.models.js";
import { Reply } from "../models/commentReply.models.js";
import { Notification } from "../models/notification.models.js";
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
  const userId = req.user?._id;

  if (!commentId) {
    throw new ApiError(400, "Comment ID is required");
  }

  const comment = await Comment.findById(commentId).populate("video", "owner");

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Only the comment owner or video owner can delete
  const isCommentOwner = comment.owner.toString() === userId.toString();
  const isVideoOwner = comment.video?.owner?.toString() === userId.toString();

  if (!isCommentOwner && !isVideoOwner) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  await Comment.findByIdAndDelete(commentId);

  return res
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

    const comments = await Comment.find({ video: videoId })
      .populate("owner", "username avatar")
      .sort({ createdAt: -1 });

    // Transform comments to include counts and any future computed fields
    const formattedComments = comments.map((comment) => ({
      ...comment.toObject(),
      likesCount: comment.likes?.length || 0,
      dislikesCount: comment.dislikes?.length || 0,
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(200, formattedComments, "Comments fetched successfully")
      );
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch comments" });
  }
};




const addReply = asyncErrorHandler(async (req, res) => {
  console.log("Body:", req.body);
  console.log("User:", req.user);
  const { commentId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  const reply = await Reply.create({
    parentComment: commentId,
    user: userId,
    text,
  });

  // optionally push reference in comment
  comment.replies.push(reply._id);
  await comment.save();

  const populatedReply = await Reply.findById(reply._id).populate(
    "user",
    "username avatar"
  );

  res.status(201).json({
    message: "Reply added successfully",
    reply: populatedReply,
  });
}); 




const getReplies = asyncErrorHandler(async (req, res) => {
  const { commentId } = req.params;

  const replies = await Reply.find({ parentComment: commentId })
    .populate("user", "username avatar")
    .sort({ createdAt: 1 });

  res.status(200).json({ replies });
});



const likeComment = asyncErrorHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  console.log(`Comment Id recived on which the like happend ${commentId}`);

  const comment = await Comment.findById(commentId).populate(
    "owner",
    "username"
  );
  if (!comment) throw new ApiError(404, "Comment not found");

  // Check if user already liked
  const alreadyLiked = comment.likes.includes(userId);
  const alreadyDisliked = comment.dislikes.includes(userId);

  if (alreadyLiked) {
    // If already liked → remove like
    comment.likes.pull(userId);
  } else {
    // Add like
    comment.likes.push(userId);
    // If previously disliked → remove dislike
    if (alreadyDisliked) comment.dislikes.pull(userId);

    // Optional: Notify the owner if someone else liked their comment
    if (String(comment.owner._id) !== String(userId)) {
      await Notification.create({
        type: "commentLike",
        sender: userId,
        reciepent: comment.owner._id,
        comment: comment._id,
        message: `${req.user.username} liked your comment.`,
      });
    }
  }

  await comment.save();

  res.status(200).json(
    new ApiResponse(200, {
      likesCount: comment.likes.length,
      dislikesCount: comment.dislikes.length,
      message: alreadyLiked ? "Like removed" : "Comment liked",
    })
  );
});



const dislikeComment = asyncErrorHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  console.log(`Dislike action triggered on comment: ${commentId}`);

  // Step 1: Fetch the comment and owner
  const comment = await Comment.findById(commentId).populate(
    "owner",
    "username"
  );
  if (!comment) throw new ApiError(404, "Comment not found");

  // Step 2: Determine the current reaction state
  const alreadyDisliked = comment.dislikes.includes(userId);
  const alreadyLiked = comment.likes.includes(userId);

  // Step 3: Handle toggling logic
  if (alreadyDisliked) {
    // If already disliked, remove it
    comment.dislikes.pull(userId);
  } else {
    // Add new dislike
    comment.dislikes.push(userId);
    // Remove existing like if present
    if (alreadyLiked) comment.likes.pull(userId);

    // Optional: send notification (only if not self-dislike)
    if (String(comment.owner._id) !== String(userId)) {
      await Notification.create({
        type: "commentDislike",
        sender: userId,
        reciepent: comment.owner._id,
        comment: comment._id,
        message: `${req.user.username} disliked your comment.`,
      });
    }
  }

  // Step 4: Save and respond
  await comment.save();

  res.status(200).json(
    new ApiResponse(200, {
      likesCount: comment.likes.length,
      dislikesCount: comment.dislikes.length,
      message: alreadyDisliked ? "Dislike removed" : "Comment disliked",
    })
  );
});






export { addComment, deleteComment, updateComment, getVideoComments, addReply, getReplies, likeComment, dislikeComment };
