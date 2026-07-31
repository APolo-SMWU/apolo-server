import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { deleteCommentController, updateCommentController, } from "../controllers/comments.controller";

const router = Router();

router.patch("/:commentId", authMiddleware, updateCommentController);
router.delete("/:commentId", authMiddleware, deleteCommentController);

export default router;