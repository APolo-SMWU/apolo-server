import { Router } from "express";
import { getAuth } from "../controllers/auth.controller";

const router = Router();

router.get("/", getAuth);

export default router;