import { ApiResponse } from "../utils/APIRespose.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiError } from "../utils/ApiError.js";

const healthCheck = asyncErrorHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "OK", "Health check passed"));
});

export { healthCheck };
