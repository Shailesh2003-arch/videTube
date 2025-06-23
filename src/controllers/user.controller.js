import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.models.js";
import { uploadOnCloudinary } from "../services/cloudinary.js";
import jwt from "jsonwebtoken";
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
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

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
    username: username.toLowerCase(),
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

const generateAcessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    console.log(user);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    console.log(
      `newRefreshTokenGenerated after refreshing acccess token`,
      refreshToken
    );
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating acesss and refresh token"
    );
  }
};

// login functionality
const loginUser = asyncErrorHandler(async (req, res) => {
  // take username and password from the user to login.
  // validate the username and password
  // check if the user with such username exists in the db if it exists, then check if the entered password is correct by decrypting it using the bcrypt library...
  // generate access & refresh Token...
  // send secure cookies
  const { username, password } = req.body;
  if (!username) {
    throw new ApiError(400, "username is required");
  }

  const user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { accessToken, refreshToken } = await generateAcessAndRefreshTokens(
    user._id
  );
  console.log(user);
  //
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  console.log(loggedInUser);
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncErrorHandler(async (req, res) => {
  console.log(req.user);
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncErrorHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  console.log(`Incoming refreshToken from cookies`, incomingRefreshToken);

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorised request");
  }
  try {
    const decodedIncomingRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    console.log(decodedIncomingRefreshToken);
    const user = await User.findById(decodedIncomingRefreshToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired/used ");
    }
    if (incomingRefreshToken == user?.refreshToken) {
      console.log(
        `Incoming refreshToken : ${incomingRefreshToken} existing refreshToken : ${user.refreshToken}`
      );
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAcessAndRefreshTokens(user._id);
    console.log(
      `Before setting the new refreshToken into database`,
      newRefreshToken
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            newRefreshToken,
          },
          "Access token refresh successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
