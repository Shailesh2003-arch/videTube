import { Router } from "express";
import {
  generateIdentityToken,
  verifyResetPasswordToken,
  resetPassword,
} from "../controllers/auth.controllers.js";

const router = Router();

router.route("/forgot-password").post(generateIdentityToken);
router.route("/verify-reset-token/:token").post(verifyResetPasswordToken);
router.route("/reset-password").post(resetPassword);

export default router;
