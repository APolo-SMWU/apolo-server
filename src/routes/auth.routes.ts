import { Router } from "express";
import { loginUser, reissueToken, signupUser } from "../controllers/auth.controller";

const router = Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/reissue", reissueToken);

export default router;