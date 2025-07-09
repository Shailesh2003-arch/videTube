import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Playlist } from "../models/playlist.models.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";

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

export { createPlaylist, addVideoToPlaylist, removeVideoFromAPlaylist };
