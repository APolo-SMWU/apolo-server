import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { deleteCommentController } from "../controllers/comments.controller";

const router = Router();

router.delete("/:commentId", authMiddleware, deleteCommentController);

export default router;