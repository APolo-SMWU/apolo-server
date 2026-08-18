import { Router } from "express";
import { loginUser, signupUser } from "../controllers/auth.controller";

const router = Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);

export default router;