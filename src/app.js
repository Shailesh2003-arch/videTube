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
app.use("/users", userRouter);

// routes declaration

export { app };
