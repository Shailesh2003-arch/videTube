import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    reciepent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "videoLike",
        "videoComment",
        "commentLike",
        "commentDislike",
        "NEW_VIDEO",
        "subscribe",
      ],
      required: true,
    },
    video: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
    message: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
