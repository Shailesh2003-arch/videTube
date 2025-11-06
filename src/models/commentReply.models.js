import mongoose, { Schema } from "mongoose";

const ReplySchema = new mongoose.Schema({
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Reply = mongoose.model("Reply", ReplySchema);
