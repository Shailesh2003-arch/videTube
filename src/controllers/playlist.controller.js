import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import Video from "../models/videos.models.js";
import User from "../models/users.models.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";

// create a playlist...

const createPlaylist = asyncErrorHandler(async (req, res) => {
  const { name, description } = req.body;
  console.log(`Name of the playlist : ${name}`);
  console.log(`description of the playlist : ${description}`);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { name, description },
        "Playlist created successfully ✅"
      )
    );
});

export { createPlaylist };
