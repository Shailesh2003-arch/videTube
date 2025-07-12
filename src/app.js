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

// importing routes...

import userRouter from "./routes/userRoutes.js";
import videoRouter from "./routes/videoRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";
import playlistRouter from "./routes/playlistRoutes.js";
import likeRouter from "./routes/likeRoutes.js";
import commentRouter from "./routes/commentRoutes.js";
import tweetRouter from "./routes/tweetRoutes.js";

// routes declaration
app.use("/api/v1/users", userRouter);

// video routes...
app.use("/vidtube", userRouter);
app.use("/api/v1/users/videos", videoRouter);
app.use("/subscription", subscriptionRouter);
app.use("/likes", likeRouter);
app.use("/comments", commentRouter);
app.use("/api/v1/users/tweets", tweetRouter);

// playlist routes...
app.use("/playlist", playlistRouter);

// centralised Error-Handling middleware...

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error!",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export { app };
