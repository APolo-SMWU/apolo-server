import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  updateMyProfileController,
  updateMyPasswordController,
} from "../controllers/users.controller";

const router = Router();

router.patch("/me", authMiddleware, updateMyProfileController);
router.patch("/me/password", authMiddleware, updateMyPasswordController);

export default router;