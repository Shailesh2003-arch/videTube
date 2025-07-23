import mongoose from "mongoose";
import { Video } from "../models/videos.models.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Subscription } from "../models/subscriptions.models.js";
import { User } from "../models/users.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { v2 as cloudinary } from "cloudinary";
import { uploadOnCloudinary } from "../services/cloudinary.js";

// Controller for getting all video based on query, sort, pagination...

// [Clean]: Will fix this a little later as will need to add pagination sorting and all...
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
    .json(new ApiResponse(200, { videoObj }, "Video published Successfully"));
});

// Controller for getting the video by its id...
const getVideoById = asyncErrorHandler(async (req, res) => {
  const userId = req.user._id;
  const { videoId } = req.params;
  const video = await Video.findById(videoId).populate(
    "videoOwner",
    "username avatar fullName"
  );
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  //[AFTER]
  const user = await User.findById(userId);
  const existingIndex = user.watchHistory.findIndex((entry) =>
    entry.video.equals(videoId)
  );

  if (existingIndex !== -1) {
    user.watchHistory[existingIndex].watchedAt = new Date();
  } else {
    user.watchHistory.push({ video: videoId });
  }
  await user.save({ validateBeforeSave: false });

  let subscriberCount = await Subscription.countDocuments({
    channel: video.videoOwner._id,
  });

  // [BEFORE]: Here firstly we were passing whole video object fetched from the DB as it is in the response...
  const videoData = {
    ...video._doc,
    videoOwner: {
      ...video.videoOwner._doc,
      subscriberCount,
    },
  };
  // [AFTER]:Here we are just passing needed fields of requested video in the response.
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
  if (!thumbnailFileLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }
  const existingThumbnailFile = video.thumbnail;
  const parts = existingThumbnailFile.split("/upload/")[1];
  const existingThumbnailFileWithExtension = parts.split(".")[0];
  const publicId = existingThumbnailFileWithExtension.replace(/^v\d+\//, "");
  const uploadedThumbnailFile = await uploadOnCloudinary(
    thumbnailFileLocalPath
  );

  await cloudinary.uploader.destroy(publicId);

  video.title = title;
  video.description = description;
  video.thumbnail = uploadedThumbnailFile.url;
  await video.save({ validateBeforeSave: false });

  const videoData = {
    title: video.title,
    description: video.description,
    thumbnail: uploadedThumbnailFile.url,
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

  // grabbing the existing thumbnail file uploaded on cloudinary so we can flush it...
  const existingThumbnailFile = video.thumbnail;
  const parts = existingThumbnailFile.split("/upload/")[1];
  const existingThumbnailFileWithExtension = parts.split(".")[0];
  const publicId = existingThumbnailFileWithExtension.replace(/^v\d+\//, "");

  // grabbing the existing video file uploaded on cloudinary so we can flush it...
  const existingVideoFile = video.videoFile;
  const partsOfVideo = existingVideoFile.split("/upload/")[1];
  const existingVideoFileWithExtension = partsOfVideo.split(".")[0];
  const publicIdOfVideo = existingVideoFileWithExtension.replace(/^v\d+\//, "");

  await cloudinary.uploader.destroy(publicId);
  await cloudinary.uploader.destroy(publicIdOfVideo, {
    resource_type: "video",
  });
  await video.deleteOne();
  res.status(204).send();
});

export {
  publishAVideo,
  getVideoById,
  updateVideoDetails,
  deleteVideo,
  getAllVideos,
};
