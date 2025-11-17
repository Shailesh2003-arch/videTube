import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.models.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

const generateIdentityToken = asyncErrorHandler(async (req, res) => {
  const { email } = req.body;
  console.log(email);
  if (!email) {
    throw new ApiError(400, "Email is required!");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found with that email!");
  }

  const resetToken = user.generateResetPasswordToken();

  await user.save({ validateBeforeSave: false });
  const resetLink = `${process.env.CORS_ORIGIN}/reset-password/${resetToken}`;

  const html = `
    <div style="background: #f8fafc; padding: 30px; border-radius: 10px;">
      <h2 style="color: #1e293b;">Reset Your Password</h2>
      <p style="color: #475569;">Hey ${user.fullName},</p>

      <p style="color: #475569;">
        Here’s your secure link to reset the password.
        Just tap the button below:
      </p>

      <a href="${resetLink}" 
        style="display:inline-block;margin:20px 0;padding:12px 18px;
               background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
        Reset Password
      </a>

      <p style="color:#64748b;font-size:14px;">
        If you didn’t request this, you can safely ignore the email.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: "DevStream <onboarding@resend.dev>",
    to: user.email,
    subject: "Reset Password",
    html,
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Reset password link sent successfully"));
});

const verifyResetPasswordToken = asyncErrorHandler(async (req, res) => {
  const { token } = req.params;
  console.log(`Token recieved is : ${token}`);

  if (!token) {
    throw new ApiError(400, "Token is required");
  }

  // 🔐 Hash the token (same method used when storing it)
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // 🔍 Find user with this hashed token and check expiry
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() }, // must be in future
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  console.log(`Verified Identity Token`);

  // 🎉 If user exists → token is valid
  res
    .status(200)
    .json(new ApiResponse(200, null, "Reset token verified successfully"));
});

const resetPassword = asyncErrorHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token) {
    throw new ApiError(400, "Reset token missing");
  }

  // Hash the token again
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  // Update password
  user.password = password;

  // Clear reset token fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;

  // Save user
  await user.save();

  res.status(200).json(new ApiResponse(200, null, "Password reset successful"));
});

export { generateIdentityToken, verifyResetPasswordToken, resetPassword };
