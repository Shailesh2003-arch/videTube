import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Playlist } from "../models/playlist.models.js";
import { User } from "../models/users.models.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { uploadOnCloudinary } from "../services/cloudinary.js";
import mongoose from "mongoose";

// create a playlist...

const createPlaylist = asyncErrorHandler(async (req, res) => {
  const name = req.body.name?.trim();
  const description = req.body.description?.trim();

  const owner = req.user._id;
  if (!name) {
    throw new ApiError(400, "Name of the playlist is required");
  }
  if (!description) {
    throw new ApiError(400, "Description of the playlist is required");
  }
  const thumbnailLocalFilePath = req.file?.path;
  if (!thumbnailLocalFilePath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);
  console.log(`Uploaded Thumbnail file info:`, uploadedThumbnail);

  const newPlaylist = await Playlist.create({
    name,
    description,
    thumbnail: uploadedThumbnail.secure_url || uploadedThumbnail.url,
    owner,
  });
  // console.log(newPlaylist);
  // [AFTER] : added only required data in response object...
  // const playListObject = newPlaylist.toObject();
  // delete playListObject.updatedAt;
  // delete playListObject.__v;
  // const playListObject = newPlaylist.toObject();

  res
    .status(201)
    .json(new ApiResponse(200, newPlaylist, "Playlist created successfully"));
});

// add video to a playList...

const addVideoToPlaylist = asyncErrorHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist Id required");
  }
  if (!videoId) {
    throw new ApiError(400, "Video Id required");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: { videos: videoId },
    },
    { new: true }
  ).sort({ createdAt: -1 });

  // [AFTER]: added only required data to the response object...
  const updatedPlaylistObj = updatedPlaylist.toObject();
  delete updatedPlaylistObj.__v;
  delete updatedPlaylistObj.updatedAt;

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylistObj,
        "Video added to the playlist successfully"
      )
    );
});

// delete video from a playlist...

const removeVideoFromAPlaylist = asyncErrorHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist Id required");
  }
  if (!videoId) {
    throw new ApiError(400, "Video Id required");
  }
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        videos: videoId,
      },
    },
    {
      new: true,
    }
  );
  if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not found");
  }
  // [AFTER]: add only required data to response object...
  const updatedPlaylistObj = updatedPlaylist.toObject();
  delete updatedPlaylistObj.__v;
  delete updatedPlaylistObj.createdAt;
  delete updatedPlaylistObj.updatedAt;
  res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylistObj, "Video removed from playlist")
    );
});

// get playlist by ID...
// [CLEAN]
const getPlaylistById = asyncErrorHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    throw new ApiError(400, "Playlist Id required");
  }

  // find playlist and populate videos with required fields
  const playlist = await Playlist.findById(playlistId)
    .populate("videos", "title description thumbnail duration") // only required fields
    .select("-__v -updatedAt"); // extra cleanup if you want

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

// delete a playlist...

const deletePlaylist = asyncErrorHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist Id is required");
  }

  await Playlist.findByIdAndDelete(playlistId);
  // [AFTER]: REST standard followed for deleting...
  res.status(204).send();
});

// update playlist through ID...

const updatePlaylistDetails = asyncErrorHandler(async (req, res) => {
  const { playlistId } = req.params;
  const name = req.body.name?.trim();
  const description = req.body.description?.trim();
  if (!playlistId) {
    throw new ApiError(400, "Playlist Id required");
  }
  const updatedDetails = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      name,
      description,
    },
    { new: true }
  );

  const updatedDetailsObj = updatedDetails.toObject();
  delete updatedDetailsObj.__v;
  // [AFTER]: add only required data to response object...
  res
    .status(200)
    .json(
      new ApiResponse(200, updatedDetailsObj, "Details updated successfully")
    );
});

// get users all playlists...
// [CLEAN]
const getUserPlaylists = asyncErrorHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(400, "User-Id is required");
  }
  const userExists = await User.exists({ _id: userId });
  if (!userExists) {
    throw new ApiError(404, "User not found");
  }

  const allPlaylists = await Playlist.find(
    { owner: userId },
    {
      name: 1,
      description: 1,
      thumbnail: 1,
      videos: 1,
      createdAt: 1,
      updatedAt: 1,
      _id: 1,
    }
  ).sort({ createdAt: -1 });

  // if (!allPlaylists || allPlaylists.length === 0) {
  //   throw new ApiError(404, "No playlists found for this user");
  // }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allPlaylists || [],
        "Fetched all playlists by this user"
      )
    );
});

export {
  createPlaylist,
  addVideoToPlaylist,
  removeVideoFromAPlaylist,
  getPlaylistById,
  deletePlaylist,
  updatePlaylistDetails,
  getUserPlaylists,
};
