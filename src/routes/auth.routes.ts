import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getMyInfo, loginUser, signupUser } from "../controllers/auth.controller";

const router = Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getMyInfo);

export default router;