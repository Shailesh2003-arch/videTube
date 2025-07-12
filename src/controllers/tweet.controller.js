import { Tweet } from "../models/tweets.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";

// create a tweet...
const createTweet = asyncErrorHandler(async (req, res) => {
  const tweetBy = req.user._id;
  const content = req.body.content?.trim();

  if (!content) {
    throw new ApiError(400, "Tweet-content is required");
  }
  if (content.length === 0) {
    throw new ApiError(400, "Tweet-content must be 1 word atleast");
  }

  const tweet = await Tweet.create({
    content,
    owner: tweetBy,
  });
  // [AFTER]: added only required data into the response object...
  const tweetObj = tweet.toObject();
  delete tweetObj.__v;
  delete tweetObj.updatedAt;
  res
    .status(201)
    .json(new ApiResponse(200, tweetObj, "Tweet created successfully"));
});

// update a tweet...

const updateTweet = asyncErrorHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Tweet-Id is required");
  }
  const content = req.body.content?.trim();
  if (!content) {
    throw new ApiError(400, "Tweet-content is required");
  }
  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { content: content },
    {
      new: true,
    }
  );
  if (!updatedTweet) {
    throw new ApiError(404, "Tweet with the Id not found");
  }
  // [AFTER]: added only required data into the response object...
  const updatedTweetObj = updatedTweet.toObject();
  delete updatedTweetObj.__v;
  delete updatedTweetObj.updatedAt;

  res
    .status(200)
    .json(new ApiResponse(200, updatedTweetObj, "Tweet updated successfully"));
});

// delete tweet...
// [CLEAN]
const deleteTweet = asyncErrorHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Tweet-Id is required");
  }
  await Tweet.findByIdAndDelete(tweetId);
  res.status(204).json(new ApiResponse(200, {}, ""));
});

// get user tweets
// [CLEAN]
const getUserTweets = asyncErrorHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(400, "User-Id is required");
  }
  const userTweets = await Tweet.find(
    { owner: userId },
    { content: 1, _id: 0 }
  );
  if (!userTweets || userTweets.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "You have no tweets right at the moment"));
  }
  res
    .status(200)
    .json(new ApiResponse(200, userTweets, "Fetched all tweets by the user"));
});

export { createTweet, updateTweet, deleteTweet, getUserTweets };
