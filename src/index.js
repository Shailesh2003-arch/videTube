import dotenv from "dotenv";
dotenv.config({ path: "./src/.env" });
import connectDB from "./db/index.js";

import { app } from "./app.js";
const hostname = "127.0.0.1";
const port = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(process.env.PORT, hostname, () => {
      console.log(`Server listening to requests on Port ${port}...`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Error", error);
  });
