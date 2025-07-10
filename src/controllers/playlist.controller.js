import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Playlist } from "../models/playlist.models.js";
import { User } from "../models/users.models.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
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
  const newPlaylist = await Playlist.create({
    name,
    description,
    owner,
  });

  const playListObject = newPlaylist.toObject();
  delete playListObject._id;
  delete playListObject.updatedAt;

  res
    .status(201)
    .json(
      new ApiResponse(200, playListObject, "Playlist created successfully ✅")
    );
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
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video added to the playlist successfully 😁✅"
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
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video removed from playlist the playlist 😁✅"
      )
    );
});

// get playlist by ID...

const getPlaylistById = asyncErrorHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist Id is required");
  }
  const playList = await Playlist.findById(playlistId);
  const playListObject = playList.toObject();
  delete playListObject._id;
  delete playListObject.__v;
  delete playListObject.updatedAt;
  if (!playList) {
    throw new ApiError(404, "Playlist not found");
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, playListObject, "Playlist fetched successfully")
    );
});

// delete a playlist...

const deletePlaylist = asyncErrorHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist Id is required");
  }

  await Playlist.findByIdAndDelete(playlistId);
  res
    .status(204)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully ✅"));
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
  res
    .status(200)
    .json(new ApiResponse(200, updatedDetails, "Details updated successfully"));
});

// get users all playlists...
const getUserPlaylists = asyncErrorHandler(async (req, res) => {
  const { userId } = req.params;
  console.log(userId);
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
      videos: 1,
      createdAt: 1,
      updatedAt: 1,
      _id: 1,
    }
  );

  if (!allPlaylists || allPlaylists.length === 0) {
    throw new ApiError(404, "No playlists found for this user");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, allPlaylists, "Fetched all playlists by this user")
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
