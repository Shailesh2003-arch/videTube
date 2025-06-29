import mongoose, { Schema } from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    videos: {
      type: mongoose.Schema.ObjectId,
      ref: "Video",
    },
  },
  { timestamps: true }
);

export const Playlist = new mongoose.model("Playlist", playlistSchema);
