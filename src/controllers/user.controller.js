import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.models.js";
import { uploadOnCloudinary } from "../services/cloudinary.js";

const registerUser = asyncErrorHandler(async (req, res, next) => {
  // 1. collect user-details from frontend..
  // 2. All possible validation.
  // 3. check if user already exist. (check via email).
  // 4. check for images, check for avatar.
  // 5. upload them to cloudinary, avatar.
  // 6. create user-object and create entry in db.
  // 7. remove password and refresh token field from response.
  // 8. check for user-created or not, if created, then return response.

  const { username, email, fullName, password } = req.body;
  const errors = [];
  if (!username)
    errors.push({ field: "username", message: "Username is required" });
  if (!email) errors.push({ field: "email", message: "email is required" });
  if (!fullName)
    errors.push({
      field: "full name is required",
      message: "full name is required",
    });
  if (!password)
    errors.push({ field: "password", message: "Password is required" });

  if (errors.length > 0) {
    throw new ApiError(400, "All fields are required", errors);
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists!");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowercase(),
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));

  next();
});

export { registerUser };
