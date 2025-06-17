import express from "express";
import cors from "cors";
import healthCheckRouter from "./routes/healthcheck.routes.js";
// instiating an app
const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use("/healthCheck", healthCheckRouter);

// for parsing incoming request body
app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// for serving static files...

app.use(express.static("public"));

export { app };
