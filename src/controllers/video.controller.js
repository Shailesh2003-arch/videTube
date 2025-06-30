import { Video } from "../models/videos.models.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Subscription } from "../models/subscriptions.models.js";
import { User } from "../models/users.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
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
  console.log(title);
  console.log(description);

  const thumbnailLocalFilePath = req.files?.thumbnail[0]?.path;
  const videoFileLocalPath = req.files?.videoFile[0]?.path;

  if (!thumbnailLocalFilePath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  console.log(thumbnailLocalFilePath);
  console.log(videoFileLocalPath);

  const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);
  const uploadedVideoFile = await uploadOnCloudinary(videoFileLocalPath);

  // extracting the duration of video from the uploaded video file
  const videoDuration = uploadedVideoFile.duration;
  console.log(videoDuration);
  const durationInMinutes = parseFloat((videoDuration / 60).toFixed(2));
  console.log(durationInMinutes);

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

export { publishAVideo, getVideoById };
