import mongoose, { Schema } from "mongoose";

const tweetsSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true, // extra space remove karega
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },
  },
  { timestamps: true }
);

export const Tweet = mongoose.model("Tweet", tweetsSchema);
