import mongoose from "mongoose";
import { Video } from "../models/videos.models.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Subscription } from "../models/subscriptions.models.js";
import { User } from "../models/users.models.js";
import { Like }  from "../models/likes.models.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { v2 as cloudinary } from "cloudinary";
import { uploadOnCloudinary } from "../services/cloudinary.js";
import getPublicIdFromUrl from "../utils/extractPublicUrl.js";
import { Playlist } from "../models/playlist.models.js";

// Controller for getting all video based on query, sort, pagination...

// [CLEAN]: Will fix this a little later as will need to add pagination sorting and all...
const getAllVideos = asyncErrorHandler(async (req, res) => {
  const {
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  if (!userId) {
    throw new ApiError(400, "UserId is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Sort direction
  const sortOrder = sortType === "asc" ? 1 : -1;

  // Create filter for title-based search (case insensitive)
  const filter = {
    videoOwner: userId,
    title: { $regex: query, $options: "i" },
  };

  // Fetch total count for pagination
  const totalVideos = await Video.countDocuments(filter);

  const allVideos = await Video.find(filter, {
    thumbnail: 1,
    videoFile: 1,
    title: 1,
    description: 1,
    duration: 1,
    views: 1,
    videoOwner: 1,
    createdAt: 1,
  })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  if (!allVideos || allVideos.length === 0) {
    throw new ApiError(404, "No videos found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        videos: allVideos,
        total: totalVideos,
        page,
        limit,
        totalPages: Math.ceil(totalVideos / limit),
      },
      "All videos fetched successfully"
    )
  );
});

// Controller for publishing a video...
const publishAVideo = asyncErrorHandler(async (req, res) => {
  // 1.I'll take title & description from req body
  // if not present throw error
  // 2. take thumbnail & videoFile to be updated if not present throw error.
  // 3. upload the thumbnail and videoFile to cloudinary then take the returned url of thumbnail and videoFile's link and save this video into the databse.

  // [BEFORE]
  // const { title, description } = req.body;
  // [AFTER]
  const title = req.body.title?.trim();
  const description = req.body.description?.trim();

  if (!title) {
    throw new ApiError(400, "Title is required");
  }
  if (!description) {
    throw new ApiError(400, "description is required");
  }
  const thumbnailLocalFilePath = req.files?.thumbnail[0]?.path;
  const videoFileLocalPath = req.files?.videoFile[0]?.path;

  if (!thumbnailLocalFilePath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);
  const uploadedVideoFile = await uploadOnCloudinary(videoFileLocalPath);

  // extracting the duration of video from the uploaded video file
  const videoDuration = uploadedVideoFile.duration;
  const durationInMinutes = parseFloat((videoDuration / 60).toFixed(2));

  // [BEFORE]: Here firstly we were passing whole video object created as it is in the response...
  const video = await Video.create({
    title,
    description,
    thumbnail: uploadedThumbnail.url,
    videoFile: uploadedVideoFile.url,
    duration: durationInMinutes,
    videoOwner: req.user?._id,
  });
  // [AFTER]:Here we are just passing needed fields of created video in the response and corrected status code from 200 to 201...
  const videoObj = video.toObject();
  delete videoObj.updatedAt;
  delete videoObj.__v;

  res
    .status(201)
    .json(new ApiResponse(200, videoObj, "Video published Successfully"));
});

// Controller for getting the video by its id...
const getVideoById = asyncErrorHandler(async (req, res) => {
  const userId = req.user._id;
  const { videoId } = req.params;

  const video = await Video.findById(videoId).populate(
    "videoOwner",
    "username avatar fullName subscribersCount"
  );

  if (!video) throw new ApiError(404, "Video not found");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const now = new Date();
  const THIRTY_MINUTES = 30 * 60 * 1000;

  let shouldIncrementView = false;
  const existingIndex = user.watchHistory.findIndex((entry) =>
    entry.video.equals(videoId)
  );

  if (existingIndex !== -1) {
    const lastWatched = user.watchHistory[existingIndex].watchedAt;
    const timeDiff = now - new Date(lastWatched);

    if (timeDiff >= THIRTY_MINUTES) {
      shouldIncrementView = true;
    }
    user.watchHistory[existingIndex].watchedAt = now;
  } else {
    shouldIncrementView = true;
    user.watchHistory.push({ video: videoId, watchedAt: now });
  }

  // ✅ Update view count + watch history
  if (shouldIncrementView) {
    video.views += 1;

    await Promise.all([
      video.save({ validateBeforeSave: false }),
      user.save({ validateBeforeSave: false }),
    ]);

    // emit socket event after success
    io.to(videoId).emit("viewCountUpdated", {
      videoId,
      newCount: video.views,
    });
  } else {
    await user.save({ validateBeforeSave: false });
  }

  // ✅ Count subscribers, likes, and dislikes
  const subscriberCount = await Subscription.countDocuments({
    channel: video.videoOwner._id,
  });

  const likeCount = await Like.countDocuments({ video: videoId, type: "like" });
  const dislikeCount = await Like.countDocuments({
    video: videoId,
    type: "dislike",
  });

  // ✅ Check if the current user is subscribed to this channel
  const isSubscribed = await Subscription.exists({
    subscriber: userId,
    channel: video.videoOwner._id,
  });

  const videoData = {
    ...video._doc,
    videoOwner: {
      ...video.videoOwner._doc,
      subscriberCount,
    },
    likeCount,
    dislikeCount,
    isSubscribed: !!isSubscribed, // 👈 ensures boolean value
  };

  delete videoData.__v;
  delete videoData.updatedAt;

  res
    .status(200)
    .json(new ApiResponse(200, videoData, "Video fetched successfully"));
});




// Controller for updating the details of the video such as it's title, description, and thumbnail file.
const updateVideoDetails = asyncErrorHandler(async (req, res) => {
  // here we will be updating the title, description and videoThumbnail of the videoFile...
  const { videoId } = req.params;
  let video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  // [BEFORE]
  // const { title, description } = req.body;

  // [AFTER]
  const title = req.body.title?.trim();
  const description = req.body.description?.trim();

  if (!title) {
    throw new ApiError(400, "Title is required");
  }
  if (!description) {
    throw new ApiError(400, "Description is required");
  }
  const thumbnailFileLocalPath = req.file?.path;

  let uploadedThumbnailFileUrl = video.thumbnail; // default = existing

  if (thumbnailFileLocalPath) {
    const existingThumbnailFile = video.thumbnail;
    const parts = existingThumbnailFile.split("/upload/")[1];
    const existingThumbnailFileWithExtension = parts.split(".")[0];
    const publicId = existingThumbnailFileWithExtension.replace(/^v\d+\//, "");

    const uploadedThumbnailFile = await uploadOnCloudinary(
      thumbnailFileLocalPath
    );
    await cloudinary.uploader.destroy(publicId);

    uploadedThumbnailFileUrl = uploadedThumbnailFile.url;
  }

  video.title = title;
  video.description = description;
  video.thumbnail = uploadedThumbnailFileUrl;

  await video.save({ validateBeforeSave: false });

  const videoData = {
    title: video.title,
    description: video.description,
    thumbnail: uploadedThumbnailFileUrl,
  };
  res
    .status(200)
    .json(
      new ApiResponse(200, videoData, "Video details updated successfully")
    );
});

// Controller for deleting the video...

const deleteVideo = asyncErrorHandler(async (req, res) => {
  const { videoId } = req.params;

  // [AFTER] : Added videoId presence check...
  if (!videoId) {
    throw new ApiError(400, "Video-Id is required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const videoPublicId = getPublicIdFromUrl(video.videoFile);
  const thumbnailPublicId = getPublicIdFromUrl(video.thumbnail);

  console.log(videoPublicId);

  console.log(thumbnailPublicId);

  await cloudinary.uploader.destroy(thumbnailPublicId);
  await cloudinary.uploader.destroy(videoPublicId, {
    resource_type: "video",
  });

  // Playlist cleanup
  await Playlist.updateMany(
    { videos: videoId },
    { $pull: { videos: videoId } }
  );

  await video.deleteOne();
  res.status(200).json(new ApiResponse(200, {}, "Video deleted Successfully"));
});

const getHomePageVideos = asyncErrorHandler(async (req, res) => {
  const { limit = 10, cursor } = req.query;
  const parsedLimit = Number(limit);
  let query = {};
  if (cursor) {
    // sirf un videos ko lao jo cursor se purane hain
    query = { _id: { $lt: cursor } };
  }

  let videos = await Video.find(query)
    .select("thumbnail title duration description views createdAt videoFile")
    .populate("videoOwner", "username avatar")
    .sort({ _id: -1 })
    .limit(parsedLimit + 1)
    .lean(); 
  
  if (videos.length === 0) {
    return res.status(200).json({
      success: true,
      videos: [],
      nextCursor: null,
      hasNextPage: false,
      message: "No more videos to load",
    });
  }

  let nextCursor = null;
   const hasNextPage = videos.length > parsedLimit;

   if (hasNextPage) {
     nextCursor = videos[parsedLimit]._id;
     videos = videos.slice(0, parsedLimit);
   }
  res.status(200).json({
    success: true,
    videos,
    nextCursor, // frontend isse next batch fetch karega
  });
});

const getUserUploadedVideos = asyncErrorHandler(async (req, res) => {
  
  const videos = await Video.find({ videoOwner: req.user._id })
    .select("title views description duration createdAt")
    .sort({ _id: -1 })
    .lean();
  res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

export {
  publishAVideo,
  getVideoById,
  updateVideoDetails,
  deleteVideo,
  getAllVideos,
  getHomePageVideos,
  getUserUploadedVideos,
};
