import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// instiating an app
const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// for parsing incoming request body
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// for serving static files...
app.use(express.static("public"));
app.use(cookieParser());

// [IMPORTS]
import userRouter from "./routes/userRoutes.js";
import videoRouter from "./routes/videoRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";
import playlistRouter from "./routes/playlistRoutes.js";
import likeRouter from "./routes/likeRoutes.js";
import commentRouter from "./routes/commentRoutes.js";
import tweetRouter from "./routes/tweetRoutes.js";

// [ROUTES]
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/users/subscription", subscriptionRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/users/tweets", tweetRouter);
app.use("/api/v1/users/playlist", playlistRouter);

// [ERROR HANDLING MIDDLEWARE]
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error!",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export { app };
