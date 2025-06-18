import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncErrorHandler(async (req, res, next) => {
  res.status(200).json({
    response: new ApiResponse(200, "All working"),
  });
});

export { registerUser };
