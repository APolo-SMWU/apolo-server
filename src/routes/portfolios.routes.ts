import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { createPortfolioController, getMyPortfoliosController, getPortfolioByIdController, updatePortfolioController, deletePortfolioController, updateContentController, createShareController } from "../controllers/portfolios.controller";

const router = Router();
router.get("/", authMiddleware, getMyPortfoliosController);
router.post("/generate", authMiddleware, createPortfolioController);
router.get("/:portfolioId", authMiddleware, getPortfolioByIdController);
router.patch("/:portfolioId", authMiddleware, updatePortfolioController);
router.delete("/:portfolioId", authMiddleware, deletePortfolioController);
router.post("/:portfolioId/update-content", authMiddleware, updateContentController);
router.post("/:portfolioId/share", authMiddleware, createShareController);
export default router;
