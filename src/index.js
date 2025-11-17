import dotenv from "dotenv";
dotenv.config({ path: "./src/.env" });
import connectDB from "./db/index.js";
import { createServer } from "http";
import { Server } from "socket.io";

const hostname = "127.0.0.1";
import { app } from "./app.js";

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173", // for local dev
      "https://vid-tube-frontend-svbk.vercel.app", // your deployed frontend
    ],
    credentials: true,
  },
});

global.io = io;

io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  // when frontend joins a room
  socket.on("joinVideoRoom", (videoId) => {
    socket.join(videoId);
    console.log(`🎥 Client joined video room: ${videoId}`);
  });

  // optional — you can later use this for tracking live viewers
  socket.on("leaveVideoRoom", (videoId) => {
    socket.leave(videoId);
    console.log(`🚪 Client left video room: ${videoId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

connectDB()
  .then(() => {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening to requests on Port ${PORT}...`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Error", error);
  });

// In Node.js, when you write an async function or a Promise, you’re supposed to handle rejections either with .catch() or a surrounding try/catch.
// But sometimes you forget or something fails silently.
// In that case, Node will raise an unhandledRejection event because a promise got rejected but nobody was there to .catch() it.
// Without handling, your app might keep running in a weird, unstable state. (Imagine: DB connection failed, but your server is still accepting requests and blowing up later.)

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

export { io };
