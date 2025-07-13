import { User } from "../models/users.models.js";
import { Subscription } from "../models/subscriptions.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import mongoose from "mongoose";

// Controller to return the subscriber list of channel
// [CLEAN]
const getChannelSubscribers = asyncErrorHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "Channel ID is missing");
  }
  const subscribersList = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $unwind: {
        path: "$subscribers",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscribers.subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
      },
    },
    {
      $unwind: {
        path: "$subscriberDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: "$_id",
        username: { $first: "$username" },
        avatar: { $first: "$avatar" },
        subscribersList: {
          $push: {
            $cond: [
              { $ifNull: ["$subscriberDetails", false] },
              {
                _id: "$subscriberDetails._id",
                username: "$subscriberDetails.username",
                avatar: "$subscriberDetails.avatar",
                fullName: "$subscriberDetails.fullName",
              },
              "$$REMOVE",
            ],
          },
        },
        subscribersCount: {
          $sum: {
            $cond: [{ $ifNull: ["$subscriberDetails", false] }, 1, 0],
          },
        },
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribersList,
        "Channel subscriber's list fetched successully!"
      )
    );
});

// controller to return channel list to which user has subscribed
// [CLEAN]
const getSubscribedChannels = asyncErrorHandler(async (req, res) => {
  const { subscriberId } = req.params;
  console.log(subscriberId);
  const subscribedToChannels = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "usersSubscription",
      },
    },
    {
      $unwind: {
        path: "$usersSubscription",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "usersSubscription.channel",
        foreignField: "_id",
        as: "usersSubscriptionDetails",
      },
    },
    {
      $unwind: {
        path: "$usersSubscriptionDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: "$_id",
        username: { $first: "$username" },
        avatar: { $first: "$avatar" },
        usersSubscription: {
          $push: {
            $cond: [
              { $ifNull: ["$usersSubscriptionDetails", false] },
              {
                _id: "$usersSubscriptionDetails._id",
                username: "$usersSubscriptionDetails.username",
                avatar: "$usersSubscriptionDetails.avatar",
                fullName: "$usersSubscriptionDetails.fullName",
              },
              "$$REMOVE",
            ],
          },
        },
        usersSubscriptionCount: {
          $sum: {
            $cond: [{ $ifNull: ["$usersSubscriptionDetails", false] }, 1, 0],
          },
        },
      },
    },
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedToChannels,
        "Channel's subscriptions fetched"
      )
    );
});

const toggleSubscription = asyncErrorHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;
  if (!channelId) {
    throw new ApiError(400, "Channel Id not found");
  }
  // Prevent user from subscribing to themselves
  if (subscriberId.toString() === channelId.toString()) {
    throw new ApiError(400, "Cannot subscribe to your own channel");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (existingSubscription) {
    await Subscription.deleteOne({ _id: existingSubscription._id });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unsubscribed successfully"));
  }

  const newSubscription = await Subscription.create({
    channel: channelId,
    subscriber: subscriberId,
  });

  // [AFTER]: added only required data to the response object...
  const newSubscriptionObj = newSubscription.toObject();
  delete newSubscriptionObj.__v;
  delete newSubscriptionObj.updatedAt;

  res
    .status(200)
    .json(new ApiResponse(201, newSubscriptionObj, "Subscribed successfully"));
});

export { getChannelSubscribers, getSubscribedChannels, toggleSubscription };
