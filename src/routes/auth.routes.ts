import { Router } from "express";
import { loginUser, logoutUser, reissueToken, signupUser } from "../controllers/auth.controller";

const router = Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/reissue", reissueToken);
router.post("/logout", logoutUser);

export default router;