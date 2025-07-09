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

  console.log(`Name of the playlist : ${name}`);
  console.log(`Description of the playlist : ${description}`);
  console.log(`Owner of the playlist : ${owner}`);
  res
    .status(201)
    .json(
      new ApiResponse(200, playListObject, "Playlist created successfully ✅")
    );
});

export { createPlaylist };
