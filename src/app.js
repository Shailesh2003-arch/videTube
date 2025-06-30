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

// routes declaration
app.use("/users", userRouter);

// video routes...
app.use("/vidtube", userRouter);
app.use("/videos", videoRouter);

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
