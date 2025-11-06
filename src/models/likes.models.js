import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    // Either a video or a comment will be referenced, never both.
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },

    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Type of reaction
    type: {
      type: String,
      enum: ["like", "dislike"],
      required: true,
    },
  },
  { timestamps: true }
);

// 🔐 Ensure one reaction (like/dislike) per user per comment
likeSchema.index(
  { likedBy: 1, comment: 1 },
  { unique: true, partialFilterExpression: { comment: { $exists: true } } }
);

// 🔐 Ensure one reaction (like/dislike) per user per video
likeSchema.index(
  { likedBy: 1, video: 1 },
  { unique: true, partialFilterExpression: { video: { $exists: true } } }
);

export const Like = mongoose.model("Like", likeSchema);
