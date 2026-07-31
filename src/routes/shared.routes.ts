import { Router } from "express";
import { getSharedPortfolioController } from "../controllers/shared.controller";

const router = Router();

router.get("/portfolios/:shareToken", getSharedPortfolioController);

export default router;