import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary...
      required: true,
    },
    coverImage: {
      type: String, //cloudinary...
    },
    watchHistory: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Video",
      },
    ],

    password: {
      type: String,
      required: [true, "Password is required!..."],
    },
    refreshToken: {
      type: String,
      required: [true, "Refresh token is required!..."],
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
