import dotenv from "dotenv";
dotenv.config({ path: "./src/.env" });
import connectDB from "./db/index.js";

const hostname = "127.0.0.1";
const port = process.env.PORT || 4000;
import { app /* httpServer*/ } from "./app.js";
connectDB()
  .then(() => {
    app.listen(process.env.PORT, hostname, () => {
      console.log(
        `Server listening to requests on Port ${process.env.PORT}...`
      );
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
