import mongoose, { Schema } from "mongoose";

const playlistWatchHistorySchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    playlist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playlist",
      required: true,
    },
  },
  {
    timestamps: "true",
  }
);

export const PlaylistWatchHistory = mongoose.model(
  "PlaylistWatchHistory",
  playlistWatchHistorySchema
);
