import { asyncErrorHandler } from "../utils/asyncErrorHandler";
import { PlaylistWatchHistory } from "../models/playlistWatchHistory.model";
import { Playlist } from "../models/playlist.models";
import { ApiError } from "../utils/ApiError";

const addPlaylistToHistory = asyncErrorHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID is required");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  const existing = await PlaylistWatchHistory.findOne({
    user: req.user._id,
    playlist: playlistId,
  });

  if (existing) {
    existing.watchedAt = new Date();
    await existing.save();
  } else {
    await PlaylistWatchHistory.create({
      user: req.user._id,
      playlist: playlistId,
    });
  }
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Playlist added to history"));
});

const getUserPlaylistHistory = asyncErrorHandler(async (req, res) => {
  const history = await PlaylistWatchHistory.find({
    user: req.user._id,
  })
    .populate("playlist", "name description videos createdAt")
    .sort({ watchedAt: -1 });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        history,
        history.length
          ? "Playlist history fetched"
          : "No playlist history found"
      )
    );
});

export { getUserPlaylistHistory, addPlaylistToHistory };
