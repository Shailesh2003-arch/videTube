import mongoose, { Schema } from "mongoose";

const likesSchema = new Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["like", "dislike"],
      default: "like",
    },
  },
  { timestamps: true }
);


// ensure one reaction per user per target
likesSchema.index(
  { likedBy: 1, video: 1 },
  { unique: true, partialFilterExpression: { video: { $exists: true } } }
);
likesSchema.index(
  { likedBy: 1, comment: 1 },
  { unique: true, partialFilterExpression: { comment: { $exists: true } } }
);
likesSchema.index(
  { likedBy: 1, tweet: 1 },
  { unique: true, partialFilterExpression: { tweet: { $exists: true } } }
);

export const Like = mongoose.model("Like", likesSchema);
