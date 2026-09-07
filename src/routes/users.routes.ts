import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  completeOnboardingController,
  getMyProfileController,
  updateMyProfileController,
  updateMyPasswordController,
} from "../controllers/users.controller";

const router = Router();

router.get("/me", authMiddleware, getMyProfileController);
router.post("/me/onboarding", authMiddleware, completeOnboardingController);
router.patch("/me/profile", authMiddleware, updateMyProfileController);
router.patch("/me", authMiddleware, updateMyProfileController);
router.patch("/me/password", authMiddleware, updateMyPasswordController);

export default router;
