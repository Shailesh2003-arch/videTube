import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addReply, getReplies} from "../controllers/comment.controllers.js"
const router = Router();

router.use(verifyJWT);

router.route("/:commentId").post(addReply).get(getReplies)



export default router;