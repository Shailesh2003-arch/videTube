import { Video } from "../models/videos.models.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Subscription } from "../models/subscriptions.models.js";
import { User } from "../models/users.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { v2 as cloudinary } from "cloudinary";
import { uploadOnCloudinary } from "../services/cloudinary.js";

// Controller for publishing a video...
const publishAVideo = asyncErrorHandler(async (req, res) => {
  // 1.I'll take title & description from req body
  // if not present throw error
  // 2. take thumbnail & videoFile to be updated if not present throw error.
  // 3. upload the thumbnail and videoFile to cloudinary then take the returned url of thumbnail and videoFile's link and save this video into the databse.
  const { title, description } = req.body;

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

  const video = await Video.create({
    title,
    description,
    thumbnail: uploadedThumbnail.url,
    videoFile: uploadedVideoFile.url,
    duration: durationInMinutes,
    videoOwner: req.user?._id,
  });

  res
    .status(200)
    .json(new ApiResponse(201, { video }, "Video published Successfully"));
});

// Controller for getting the video by its id...

const getVideoById = asyncErrorHandler(async (req, res) => {
  const { videoId } = req.params;
  const video = await Video.findById(videoId).populate(
    "videoOwner",
    "username avatar fullName"
  );
  video.views += 124;
  await video.save();
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  let subscriberCount = await Subscription.countDocuments({
    channel: video.videoOwner._id,
  });

  const videoData = {
    ...video._doc,
    videoOwner: {
      ...video.videoOwner._doc,
      subscriberCount,
    },
  };
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

  const { title, description } = req.body;
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

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // grabbing the existing thumbnail file uploaded on cloudinary so we can flush it...
  const existingThumbnailFile = video.thumbnail;
  console.log(existingThumbnailFile);
  const parts = existingThumbnailFile.split("/upload/")[1];
  const existingThumbnailFileWithExtension = parts.split(".")[0];
  const publicId = existingThumbnailFileWithExtension.replace(/^v\d+\//, "");
  console.log(publicId);

  // grabbing the existing video file uploaded on cloudinary so we can flush it...
  const existingVideoFile = video.videoFile;
  console.log(existingVideoFile);
  const partsOfVideo = existingVideoFile.split("/upload/")[1];
  const existingVideoFileWithExtension = partsOfVideo.split(".")[0];
  const publicIdOfVideo = existingVideoFileWithExtension.replace(/^v\d+\//, "");
  console.log(publicIdOfVideo);

  await cloudinary.uploader.destroy(publicId);
  await cloudinary.uploader.destroy(publicIdOfVideo, {
    resource_type: "video",
  });
  await video.deleteOne();
  res.status(204).send();
});

export { publishAVideo, getVideoById, updateVideoDetails, deleteVideo };
