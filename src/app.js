import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// instantiate app
const app = express();

// middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "https://vid-tube-alpha.vercel.app"],
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// imports
import userRouter from "./routes/userRoutes.js";
import authRouter from "./routes/authRoutes.js";
import videoRouter from "./routes/videoRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";
import playlistRouter from "./routes/playlistRoutes.js";
import likeRouter from "./routes/likeRoutes.js";
import commentRouter from "./routes/commentRoutes.js";
import tweetRouter from "./routes/tweetRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import commentReplyRouter from "./routes/commentReplyRoutes.js";

// routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users/notifications", notificationRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/users/subscription", subscriptionRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/reply", commentReplyRouter);
app.use("/api/v1/users/tweets", tweetRouter);
app.use("/api/v1/playlists", playlistRouter);

// error handler

app.get("/", (req, res) => {
  res.send("Videtube backend is live 🚀");
});

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error!",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export { app };
