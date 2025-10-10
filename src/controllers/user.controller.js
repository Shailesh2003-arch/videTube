import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.models.js";
import { uploadOnCloudinary } from "../services/cloudinary.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

// [PENDING] : "Jab user delete hojaye toh usne post ki hui saari videos and posts bhi delete hojani chahiye..."

// [CLEAN]
// Register user functionality...
const registerUser = asyncErrorHandler(async (req, res) => {
  // 1. collect user-details from frontend..
  // 2. All possible validation.
  // 3. check if user already exist. (check via email).
  // 4. check for images, check for avatar.
  // 5. upload them to cloudinary, avatar.
  // 6. create user-object and create entry in db.
  // 7. remove password and refresh token field from response.
  // 8. check for user-created or not, if created, then return response.
  const { username, email, password, fullName } = req.body;
  const errors = [];
  if (!username)
    errors.push({ field: "username", message: "Username is required" });
  if (!email) errors.push({ field: "email", message: "email is required" });
  if (!password)
    errors.push({ field: "password", message: "Password is required" });
  if (!fullName)
    errors.push({ field: "fullName", message: "fullName is required" });

  if (errors.length > 0) {
    throw new ApiError(400, "Validation failed", errors);
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists!");
  }
  const user = await User.create({
    // avatar: avatar.url,
    // coverImage: coverImage?.url || "",
    email,
    fullName,
    username: username.toLowerCase(),
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

// login functionality
const loginUser = asyncErrorHandler(async (req, res) => {
  // [BEFORE]
  // const { username, password } => req.body;

  // [AFTER]: Benefit - If by any chance user enters whitespace at the end we will trim it...

  const email = req.body.email?.trim();
  const password = req.body.password?.trim();

  if (!email) {
    throw new ApiError(400, "email is required!");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  // [AFTER] : Added password presence check..
  if (!password) {
    throw new ApiError(400, "Password is required!");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { accessToken, refreshToken } = await generateAcessAndRefreshTokens(
    user._id
  );
  //
  user.password = undefined;
  user.refreshToken = undefined;

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: user,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

// [CLEAN]
// Generating Acess And Refresh Tokens functionality...
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found while generating tokens");
    }

    // Generate both first to ensure atomic update
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token generation error:", error); // log for backend visibility
    throw new ApiError(500, "Failed to generate access and refresh tokens");
  }
};


// [CLEAN]
// logout functionality...
const logoutUser = asyncErrorHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

 await res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

// [CLEAN]
// Refresh Access token of user functionality...
const refreshAccessToken = asyncErrorHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedIncomingRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedIncomingRefreshToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired/used ");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// [CLEAN]
// oldPassword change functionality
const changeCurrentPassword = asyncErrorHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password cannot be same as old password");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  user.refreshToken = undefined; // Optional: logout all sessions
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});


// [CLEAN]
// get currently logged-in user...
const getCurrentUser = asyncErrorHandler(async (req, res) => {
  const loggedInUser = req.user;
  res
    .status(200)
    .json(new ApiResponse(200, loggedInUser, "User fetched Successfully"));
});

// [CLEAN]
// Updating other details of the user...
const updateExistingDetailsOfUser = asyncErrorHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName && !email) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check for duplicate email
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (
      existingUser &&
      existingUser._id.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(409, "Email is already taken");
    }
    user.email = email;
  }

  if (fullName) user.fullName = fullName;

  await user.save({ validateBeforeSave: false });
  const updatedUser = await User.findById(user._id).select("-password");

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});


// [CLEAN]
// getUserChannelProfile
const getUserChannelProfile = asyncErrorHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                "$subscribers.subscriber",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});


// [CLEAN]
// Update avatar functionality...
const updateAvatar = asyncErrorHandler(async (req, res) => {
  const existingAvatarURL = req.user.avatar;
  const parts = existingAvatarURL.split("/upload/")[1];
  const existingAvatarWithExtension = parts.split(".")[0];
  const publicId = existingAvatarWithExtension.replace(/^v\d+\//, "");

  if (!req.file) {
    throw new ApiError(400, "Avatar file required");
  }
  const newAvatarFileLocalPath = req.file.path;
  const uploadedAvatarFile = await uploadOnCloudinary(newAvatarFileLocalPath);
  req.user.avatar = uploadedAvatarFile.url;
  await req.user.save({ validateBeforeSave: false });
  await cloudinary.uploader.destroy(publicId);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        uploadedAvatarFile.url,
        "Updated avatar successfully"
      )
    );
});

// [CLEAN]
// Update cover-image functionality...
const updateCoverImage = asyncErrorHandler(async (req, res) => {
  const existingCoverImage = req.user.coverImage;
  const parts = existingCoverImage.split("/upload/")[1];
  const existingCoverImageWithExtension = parts.split(".")[0];
  const publicId = existingCoverImageWithExtension.replace(/^v\d+\//, "");

  if (!req.file) {
    throw new ApiError(400, "Avatar file is required");
  }

  const newCoverImageFileLocalPath = req.file.path;
  const updatedCoverImage = await uploadOnCloudinary(
    newCoverImageFileLocalPath
  );
  req.user.coverImage = updatedCoverImage.url;
  await req.user.save({ validateBeforeSave: false });
  await cloudinary.uploader.destroy(publicId);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedCoverImage.url,
        "Cover-image updated successfully"
      )
    );
});

// [AFTER]: fixed
const getUserWatchHistory = asyncErrorHandler(async (req, res) => {
  const userWatchHistory = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $unwind: "$watchHistory",
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory.video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $unwind: "$videoDetails",
    },
    {
      $lookup: {
        from: "users",
        localField: "videoDetails.videoOwner",
        foreignField: "_id",
        as: "videoDetails.owner",
      },
    },
    {
      $unwind: "$videoDetails.owner",
    },
    {
      $project: {
        _id: 0,
        watchedAt: "$watchHistory.watchedAt",
        createdAt: "$videoDetails.createdAt",
        video: {
          _id: "$videoDetails._id",
          title: "$videoDetails.title",
          thumbnail: "$videoDetails.thumbnail",
          duration: "$videoDetails.duration",
          owner: {
            _id: "$videoDetails.owner._id",
            fullName: "$videoDetails.owner.fullName",
            username: "$videoDetails.owner.username",
            avatar: "$videoDetails.owner.avatar",
          },
        },
      },
    },
    {
      $sort: {
        watchedAt: -1,
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userWatchHistory,
        userWatchHistory.length > 0
          ? "Watch history fetched successfully"
          : "You haven't watched any video yet..."
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateExistingDetailsOfUser,
  getUserChannelProfile,
  updateAvatar,
  updateCoverImage,
  getUserWatchHistory,
};
