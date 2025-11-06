import { User } from "../models/users.models.js";
import { Subscription } from "../models/subscriptions.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Notification } from "../models/notification.models.js";
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
    throw new ApiError(400, "Channel ID not provided");
  }

  if (subscriberId.toString() === channelId.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  // Check if channel (user being subscribed to) exists
  const channelUser = await User.findById(channelId);
  if (!channelUser) {
    throw new ApiError(404, "Channel not found");
  }

  // Check if subscription already exists
  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (existingSubscription) {
    // 🧹 Unsubscribe
    await existingSubscription.deleteOne();

    // 🧾 Decrement subscriber count safely
    channelUser.subscribersCount = Math.max(
      (channelUser.subscribersCount || 1) - 1,
      0
    );
    await channelUser.save();

    // 🔕 Remove notification if exists
    await Notification.deleteMany({
      sender: subscriberId,
      reciepent: channelId,
      type: "subscribe",
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { subscribersCount: channelUser.subscribersCount },
          "Unsubscribed successfully"
        )
      );
  }

  // 💖 Subscribe logic
  const newSubscription = await Subscription.create({
    channel: channelId,
    subscriber: subscriberId,
  });

  // 💫 Increment subscriber count
  channelUser.subscribersCount = (channelUser.subscribersCount || 0) + 1;
  await channelUser.save();

  // 🔔 Notify the channel owner
  if (String(subscriberId) !== String(channelId)) {
    await Notification.create({
      type: "subscribe",
      sender: subscriberId,
      reciepent: channelId,
      message: `${req.user.username} subscribed to your channel.`,
    });
  }

  // 🧹 Clean response data
  const responseData = {
    _id: newSubscription._id,
    channel: newSubscription.channel,
    subscriber: newSubscription.subscriber,
    createdAt: newSubscription.createdAt,
    subscribersCount: channelUser.subscribersCount,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, responseData, "Subscribed successfully"));
});


export { getChannelSubscribers, getSubscribedChannels, toggleSubscription };
