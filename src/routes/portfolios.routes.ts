import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { createPortfolioController, getMyPortfoliosController, getPortfolioByIdController } from "../controllers/portfolios.controller";

const router = Router();

router.post("/", authMiddleware, createPortfolioController);
router.get("/", authMiddleware, getMyPortfoliosController);
router.get("/:portfolioId", authMiddleware, getPortfolioByIdController);

export default router;