import {Notification } from "../models/notification.models.js"
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"


// 📬 Get all notifications of the logged-in user
export const getNotifications = asyncErrorHandler(async (req, res) => {
  const userId = req.user._id;
  const notifications = await Notification.find({ reciepent: userId })
    .populate("sender", "username avatar")
    .populate("video", "title thumbnail")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, notifications, "Notifications fetched successfully"));
});


// 👀 Mark a notification as read
export const markAsRead = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOne({ _id: id, reciepent: userId });
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  notification.isRead = true;
  await notification.save();

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as read"));
});