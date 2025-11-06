import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    // the actual comment text
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
    },

    // reference to the video
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },

    // reference to the user who commented
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // optional: likes on the comment (can expand later)
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reply",
      },
    ],
  },
  { timestamps: true }
);

// add pagination plugin
commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);

