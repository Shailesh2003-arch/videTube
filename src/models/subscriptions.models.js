import mongoose, { Schema } from "mongoose";

const subscriptSchema = new Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId, // one who is subscribing
      required: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId, // one to whom subscriber is subscribing
      required: true,
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptSchema);
