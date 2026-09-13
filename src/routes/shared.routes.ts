import { Router } from "express";
import { getSharedController } from "../controllers/portfolios.controller";

const router = Router();
router.get("/:shareId", getSharedController);
export default router;
