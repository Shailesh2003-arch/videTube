import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.models.js";
import { uploadOnCloudinary } from "../services/cloudinary.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

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
  const { username, email, fullName, password } = req.body;
  const errors = [];
  if (!username)
    errors.push({ field: "username", message: "Username is required" });
  if (!email) errors.push({ field: "email", message: "email is required" });
  if (!fullName)
    errors.push({
      field: "fullName",
      message: "full name is required",
    });
  if (!password)
    errors.push({ field: "password", message: "Password is required" });

  if (errors.length > 0) {
    throw new ApiError(400, "All fields are required", errors);
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists!");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
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
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

// login functionality
const loginUser = asyncErrorHandler(async (req, res) => {
  // [BEFORE]
  // const { username, password } => req.body;

  // [AFTER]: Benefit - If by any chance user enters whitespace at the end we will trim it...

  const username = req.body.username?.trim();
  const password = req.body.password?.trim();

  if (!username) {
    throw new ApiError(400, "username is required!");
  }

  const user = await User.findOne({ username });

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
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
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
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

// [CLEAN]
// Generating Acess And Refresh Tokens functionality...
const generateAcessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating acesss and refresh token"
    );
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

  res
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
    throw new ApiError(401, "Unauthorised request");
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
      await generateAcessAndRefreshTokens(user._id);

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
          "Access token refresh successfully"
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
  const user = await User.findById(req.user?._id);
  console.log(user);
  console.log(user.password);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  res
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
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email },
    },
    { new: true }
  ).select("-password");
  res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// [CLEAN]
// getUserChannelProfile
const getUserChannelProfile = asyncErrorHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim) {
    throw new ApiError(400, "username is missing");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // That channel's subscribers?...
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // I'm subscribed to which channels?
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
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
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
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
